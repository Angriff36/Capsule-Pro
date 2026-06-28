/**
 * Middleware conformance — `EventFinalized → InventoryItem.releaseReservation`
 * (IMPLEMENTATION_PLAN P1, Event lifecycle → EventFinalized → finance/inventory/
 * followup — the `release reserved inventory` leg).
 *
 * WHY this matters (not just WHAT it does): the `prep-inventory-demand`
 * middleware RESERVES ingredient stock when a prep list is FINALIZED
 * (`InventoryItem.reserve`, bumping `quantityReserved`). Completion releases it
 * (consume) and explicit cancellation releases it (the cancel middleware). But a
 * prep list that was finalized (reserved) and then NEITHER completed NOR
 * cancelled before the EVENT closed stranded its reserved stock forever:
 * `quantityReserved` only ever grew, so `quantityAvailable` (= onHand − reserved)
 * bled down and items looked perpetually unavailable. This is the same leak class
 * the consume/cancel middleware fixed, on the event-finalize path.
 *
 * A pure `on EventFinalized run InventoryItem.releaseReservation` reaction is
 * structurally impossible: it is a 1:N fan-out (event → prep lists → prep items),
 * and the reserved quantities/inventory FKs are reachable only via store loads
 * keyed off the finalized event, not the `finalize(userId)` payload.
 *
 * The test runs the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS
 * LOUDLY if the propagation regresses — a reservation left stranded, the wrong
 * event's stock touched, a spurious release, or the engine ceasing to dispatch
 * (CLAUDE.md Rule 9; constitution §13). It also proves the middleware is a clean
 * no-op for items that hold no reservation (already-completed/cancelled lists),
 * and regression-locks that nobody re-expresses the fan-out as a reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventFinalizedReleaseReservationMiddleware } from "../middleware/event-finalized-release-reservation-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-event-finalize-release";
const USER = { id: "u-closer", tenantId: TENANT, role: "admin" } as const;

const EVENT_ID = "event-finalize-release-001";
const OTHER_EVENT_ID = "event-finalize-release-other";

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

/** Build the engine with ONLY the EventFinalized→releaseReservation middleware. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventFinalizedReleaseReservationMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence console diagnostics in tests */
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

/** Drive an event through create(draft) → confirm → finalize(userId). */
async function bookConfirmAndFinalize(
  engine: ManifestRuntimeEngine,
  eventId: string
) {
  const run = (command: string, body: Record<string, unknown>) =>
    runManifestCommandCore(
      { createRuntime: async () => engine },
      { entity: "Event", command, body: { id: eventId, tenantId: TENANT, ...body }, user: { ...USER } }
    );
  const created = await run("create", {
    title: "Finalize Release Banquet",
    eventType: "general",
    eventDate: Date.now(),
    guestCount: 1,
    status: "draft",
  });
  expect(created.ok).toBe(true);
  const confirmed = await run("confirm", { userId: USER.id });
  expect(confirmed.ok).toBe(true);
  return run("finalize", { userId: USER.id });
}

async function seedFinalizedPrepList(
  provider: (entity: string) => Store,
  prepListId: string,
  eventId: string
) {
  await provider("PrepList").create({
    id: prepListId,
    tenantId: TENANT,
    eventId,
    name: `Prep ${prepListId}`,
    status: "finalized",
    batchMultiplier: 1,
    totalItems: 1,
    totalEstimatedTime: 0,
    isActive: true,
  } as never);
}

async function seedPrepItem(
  provider: (entity: string) => Store,
  prepListId: string,
  id: string,
  ingredientId: string,
  scaledQuantity: number
) {
  await provider("PrepListItem").create({
    id,
    tenantId: TENANT,
    prepListId,
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

const reservedOf = async (
  provider: (entity: string) => Store,
  id: string
): Promise<number> =>
  Number(
    ((await provider("InventoryItem").getById(id)) as Record<string, unknown>)
      .quantityReserved
  );

const onHandOf = async (
  provider: (entity: string) => Store,
  id: string
): Promise<number> =>
  Number(
    ((await provider("InventoryItem").getById(id)) as Record<string, unknown>)
      .quantityOnHand
  );

describe("Middleware conformance: EventFinalized → InventoryItem.releaseReservation", () => {
  it("the compiled IR carries NO EventFinalized→InventoryItem.releaseReservation reaction (it is a 1:N middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "EventFinalized" &&
        r.targetEntity === "InventoryItem" &&
        r.targetCommand === "releaseReservation"
    );
    expect(stale).toHaveLength(0);
  });

  it("finalizing an event releases reserved stock across ALL its prep lists (1:N), onHand untouched", async () => {
    const provider = makeProvider();
    // Two prep lists under the SAME event → proves the 1:N fan-out.
    await seedFinalizedPrepList(provider, "prep-1", EVENT_ID);
    await seedFinalizedPrepList(provider, "prep-2", EVENT_ID);
    await seedPrepItem(provider, "prep-1", "pli-A", "inv-A", 10);
    await seedPrepItem(provider, "prep-2", "pli-B", "inv-B", 5);
    await seedInventoryItem(provider, "inv-A", 100, 10);
    await seedInventoryItem(provider, "inv-B", 50, 5);
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine, EVENT_ID);
    expect(result.ok).toBe(true);

    // THE PROOF: each item's stranded reservation is released back to zero, while
    // quantityOnHand is untouched (finalize un-reserves; it does NOT consume).
    expect(await reservedOf(provider, "inv-A")).toBe(0);
    expect(await reservedOf(provider, "inv-B")).toBe(0);
    expect(await onHandOf(provider, "inv-A")).toBe(100);
    expect(await onHandOf(provider, "inv-B")).toBe(50);

    // Secondary proof: a release event bubbled up for each reserved item.
    const released = (result.ok ? result.events : [])?.filter(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name === "InventoryReservationReleased"
    );
    expect(released?.length).toBe(2);
  });

  it("is a clean no-op for an item that holds no reservation (already-completed/cancelled list)", async () => {
    const provider = makeProvider();
    await seedFinalizedPrepList(provider, "prep-1", EVENT_ID);
    await seedPrepItem(provider, "prep-1", "pli-A", "inv-A", 10);
    // inv-A already at zero reserved (its prep list was completed/cancelled before
    // the event closed) → nothing to release, no spurious event.
    await seedInventoryItem(provider, "inv-A", 100, 0);
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine, EVENT_ID);
    expect(result.ok).toBe(true);

    expect(await reservedOf(provider, "inv-A")).toBe(0);
    const released = (result.ok ? result.events : [])?.filter(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name === "InventoryReservationReleased"
    );
    expect(released?.length).toBe(0);
  });

  it("releases ONLY the finalized event's reservations — another event's prep stock is untouched", async () => {
    const provider = makeProvider();
    // The event being finalized.
    await seedFinalizedPrepList(provider, "prep-mine", EVENT_ID);
    await seedPrepItem(provider, "prep-mine", "pli-mine", "inv-mine", 10);
    await seedInventoryItem(provider, "inv-mine", 100, 10);
    // A DIFFERENT event's finalized prep list, still holding its reservation.
    await seedFinalizedPrepList(provider, "prep-other", OTHER_EVENT_ID);
    await seedPrepItem(provider, "prep-other", "pli-other", "inv-other", 7);
    await seedInventoryItem(provider, "inv-other", 80, 7);
    const engine = newEngine(provider);

    const result = await bookConfirmAndFinalize(engine, EVENT_ID);
    expect(result.ok).toBe(true);

    // Mine released; the other event's reservation stays put.
    expect(await reservedOf(provider, "inv-mine")).toBe(0);
    expect(await reservedOf(provider, "inv-other")).toBe(7);
  });
});
