/**
 * Middleware conformance — `PrepListCancelled → InventoryItem.releaseReservation`
 * (IMPLEMENTATION_PLAN P1, Event lifecycle → EventCancelled cascade; closes a
 * reservation leak on the cancel path).
 *
 * WHY this matters (not just WHAT it does): the `prep-inventory-demand`
 * middleware RESERVES ingredient stock when a prep list is FINALIZED
 * (`InventoryItem.reserve`, bumping `quantityReserved`). Completion releases it
 * (the consume middleware). But CANCELLATION had no consumer — a finalized prep
 * list that was later cancelled stranded its reserved stock forever:
 * `quantityReserved` only ever grew, so `quantityAvailable` (= onHand − reserved)
 * bled down and items looked perpetually unavailable. That is the same P0 leak
 * class the consume middleware fixed, on the cancel path. This middleware closes
 * it for EVERY prep-cancel path — standalone (proven here) and event-driven (the
 * EventCancelled cascade's dispatched PrepList.cancel chains into it).
 *
 * The test runs against the REAL compiled IR through the runtime engine with the
 * middleware wired, so it FAILS LOUDLY when the propagation regresses — a
 * reservation left stranded, the engine ceasing to dispatch — not on a shape
 * change (CLAUDE.md Rule 9; constitution §13). It also proves the middleware does
 * NOT spuriously release stock for items that never held a reservation (draft
 * lists), and regression-locks that nobody re-expresses the fan-out as a reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createPrepListCancelledReleaseReservationMiddleware } from "../middleware/prep-list-cancelled-release-reservation-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-prep-release";
const USER = { id: "u-prep-release", tenantId: TENANT, role: "admin" } as const;

const PREP_LIST_ID = "prep-r-001";
const EVENT_ID = "event-r-1";
const ITEM_A = "inv-r-A";
const ITEM_B = "inv-r-B";

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
class Mem implements Store {
  private readonly items = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.items.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getById(id: string): Promise<any> {
    return this.items.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? crypto.randomUUID();
    const row = { ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async update(id: string, data: any): Promise<any> {
    const existing = this.items.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.items.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
  async clear(): Promise<void> {
    this.items.clear();
  }
}

function makeProvider(): (entity: string) => Store {
  const stores = new Map<string, Mem>();
  return (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
}

function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createPrepListCancelledReleaseReservationMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* no-op */
      },
    }),
  ];
  engine = new ManifestRuntimeEngine(
    ir,
    {
      tenantId: USER.tenantId,
      user: { id: USER.id, tenantId: USER.tenantId, role: USER.role },
    },
    {
      storeProvider: provider,
      customBuiltins: createCustomBuiltins(),
      middleware,
      generateId: () => randomUUID(),
      now: () => Date.now(),
    }
  );
  return engine;
}

async function seedFinalizedPrepList(provider: (entity: string) => Store) {
  // cancel transitions finalized -> cancelled. Every bare PrepList block
  // constraint (validName/validEventId/positiveTotalTime/validBatchMultiplier…)
  // must hold or the engine silently drops cancel's status mutate.
  await provider("PrepList").create({
    id: PREP_LIST_ID,
    tenantId: TENANT,
    eventId: EVENT_ID,
    name: "Saturday Service Prep",
    status: "finalized",
    batchMultiplier: 1,
    totalItems: 2,
    totalEstimatedTime: 0,
    isActive: true,
  } as never);
}

async function seedPrepItem(
  provider: (entity: string) => Store,
  id: string,
  ingredientId: string,
  scaledQuantity: number
) {
  await provider("PrepListItem").create({
    id,
    tenantId: TENANT,
    prepListId: PREP_LIST_ID,
    stationId: "station-1",
    stationName: "Garde Manger",
    ingredientId,
    ingredientName: `Ingredient ${ingredientId}`,
    scaledQuantity,
    scaledUnit: "kg",
  } as never);
}

async function seedInventoryItem(
  provider: (entity: string) => Store,
  id: string,
  quantityOnHand: number,
  quantityReserved: number
) {
  await provider("InventoryItem").create({
    id,
    tenantId: TENANT,
    item_number: `IN-${id}`,
    name: `Item ${id}`,
    category: "produce",
    unitOfMeasure: "kg",
    unitCost: 5,
    quantityOnHand,
    quantityReserved,
    parLevel: 0,
    reorder_level: 0,
  } as never);
}

function cancelPrepList(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "PrepList",
      command: "cancel",
      body: { id: PREP_LIST_ID, tenantId: TENANT, reason: "Event cancelled" },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: PrepListCancelled → InventoryItem.releaseReservation", () => {
  it("the compiled IR carries NO PrepListCancelled→InventoryItem.releaseReservation reaction (it is a 1:N middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "PrepListCancelled" &&
        r.targetEntity === "InventoryItem" &&
        r.targetCommand === "releaseReservation"
    );
    expect(stale).toHaveLength(0);
  });

  it("cancelling a finalized prep list releases each item's reservation", async () => {
    const provider = makeProvider();
    await seedFinalizedPrepList(provider);
    await seedPrepItem(provider, "pli-A", ITEM_A, 10);
    await seedPrepItem(provider, "pli-B", ITEM_B, 5);
    await seedInventoryItem(provider, ITEM_A, 100, 10);
    await seedInventoryItem(provider, ITEM_B, 50, 5);
    const engine = newEngine(provider);

    const result = await cancelPrepList(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the reservation each item held is released back to zero, while
    // quantityOnHand is untouched (a cancel un-reserves; it does NOT consume).
    const a = (await provider("InventoryItem").getById(ITEM_A)) as Record<string, unknown>;
    const b = (await provider("InventoryItem").getById(ITEM_B)) as Record<string, unknown>;
    expect(Number(a.quantityReserved)).toBe(0);
    expect(Number(a.quantityOnHand)).toBe(100);
    expect(Number(b.quantityReserved)).toBe(0);
    expect(Number(b.quantityOnHand)).toBe(50);

    const prepList = (await provider("PrepList").getById(PREP_LIST_ID)) as Record<string, unknown>;
    expect(prepList.status).toBe("cancelled");

    // Secondary proof: a release event bubbled up for each reserved item.
    const released = (result.ok ? result.events : [])?.filter(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name === "InventoryReservationReleased"
    );
    expect(released?.length).toBe(2);
  });

  it("does NOT release stock for an item that never held a reservation (no spurious release)", async () => {
    const provider = makeProvider();
    await seedFinalizedPrepList(provider);
    await seedPrepItem(provider, "pli-A", ITEM_A, 10);
    // Item B's inventory has zero reserved (e.g. it was never finalized-reserved).
    await seedPrepItem(provider, "pli-B", ITEM_B, 5);
    await seedInventoryItem(provider, ITEM_A, 100, 10);
    await seedInventoryItem(provider, ITEM_B, 50, 0);
    const engine = newEngine(provider);

    const result = await cancelPrepList(engine);
    expect(result.ok).toBe(true);

    const a = (await provider("InventoryItem").getById(ITEM_A)) as Record<string, unknown>;
    const b = (await provider("InventoryItem").getById(ITEM_B)) as Record<string, unknown>;
    expect(Number(a.quantityReserved)).toBe(0);
    // B untouched and NO spurious release event for it.
    expect(Number(b.quantityReserved)).toBe(0);

    const released = (result.ok ? result.events : [])?.filter(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name === "InventoryReservationReleased"
    );
    expect(released?.length).toBe(1);
  });
});
