/**
 * Middleware conformance — `PrepListCompleted → InventoryItem.consume` (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): the sibling `prep-inventory-demand` middleware
 * RESERVES ingredient quantities when a prep list is FINALIZED (`InventoryItem.reserve`, which
 * bumps `quantityReserved`). But nothing ever converted those reservations into real usage when
 * the prep list COMPLETED — so every finalized list permanently stranded its reserved stock:
 * `quantityReserved` only ever grew, `quantityOnHand` never dropped for prep, and
 * `quantityAvailable` (= onHand − reserved) bled down to nothing over time. That is a P0 leak:
 * inventory the kitchen actually used was invisible to par/reorder math, and reserved-but-never-
 * released quantities made items look perpetually unavailable.
 *
 * The fix is middleware (1:N fan-out over PrepListItem rows — a reaction cannot resolve the set)
 * that, on `PrepListCompleted`, dispatches a governed `InventoryItem.consume` per item.
 * `consume` is the right command (not `releaseReservation` + a separate drawdown): its mutates
 * decrement BOTH `quantityOnHand` (physical usage) AND `quantityReserved` (reservation release)
 * in one call, so a single dispatch reverses the reserve and books the real consumption.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the middleware
 * wired, so it FAILS LOUDLY if the propagation regresses — stock not drawn down, reservation not
 * released, the engine stops dispatching, or fan-out count drops — i.e. it fails when the
 * BUSINESS propagation breaks, not on a shape change (CLAUDE.md Rule 9; constitution §13). It
 * also regression-locks that nobody re-expresses this 1:N fan-out as a (dead) IR reaction.
 *
 * Chain proven here:
 *   PrepList.markCompleted()  (status finalized -> completed)
 *     → emits PrepListCompleted (_subject.id = the PrepList id; payload.prepListId/tenantId)
 *     → middleware loads PrepListItem rows for that prep list
 *     → per item: dispatches InventoryItem.consume(quantity=scaledQuantity, lotId=prepListId)
 *     → each item's quantityOnHand drops by scaledQuantity, quantityReserved is released,
 *       and InventoryConsumed bubbles up into the parent command's events.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createPrepListCompletedConsumeMiddleware } from "../middleware/prep-list-completed-consume-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-prep-consume";
// admin satisfies PrepList.markCompleted AND the middleware's InventoryItem.consume dispatch.
const USER = { id: "u-prep-consume", tenantId: TENANT, role: "admin" } as const;

const PREP_LIST_ID = "prep-c-001";
const ITEM_A = "inv-c-A";
const ITEM_B = "inv-c-B";

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

/** Build the engine with the PrepListCompleted→consume middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createPrepListCompletedConsumeMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      // Silence the default console.warn diagnostics in tests.
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
  // Seed directly via the store so the test isolates the markCompleted → middleware chain.
  // markCompleted guards `self.status == "finalized"`.
  await provider("PrepList").create({
    id: PREP_LIST_ID,
    tenantId: TENANT,
    eventId: "event-1",
    name: "Saturday Service Prep",
    status: "finalized",
    batchMultiplier: 1,
    totalItems: 2,
    // Every bare PrepList constraint must hold on the merged row or the engine
    // silently drops markCompleted's status mutate (notes §21 / engine gotcha):
    // positiveTotalTime requires totalEstimatedTime >= 0, so it cannot be undefined.
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

function markCompleted(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "PrepList",
      command: "markCompleted",
      body: { id: PREP_LIST_ID, tenantId: TENANT },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: PrepListCompleted → InventoryItem.consume", () => {
  it("the compiled IR carries NO PrepListCompleted→InventoryItem.consume reaction (it is a 1:N middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "PrepListCompleted" &&
        r.targetEntity === "InventoryItem" &&
        r.targetCommand === "consume"
    );
    // A regression here means someone tried to express this fan-out as a reaction, which
    // structurally cannot resolve the many PrepListItem rows — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("completing a finalized prep list consumes each item: on-hand drops and the reservation is released", async () => {
    const provider = makeProvider();
    await seedFinalizedPrepList(provider);
    await seedPrepItem(provider, "pli-A", ITEM_A, 10);
    await seedPrepItem(provider, "pli-B", ITEM_B, 5);
    await seedInventoryItem(provider, ITEM_A, 100, 10);
    await seedInventoryItem(provider, ITEM_B, 50, 5);
    const engine = newEngine(provider);

    const result = await markCompleted(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran InventoryItem.consume against the SAME store, so on-hand
    // dropped by the scaled quantity AND the reservation was drawn back to zero (consume
    // decrements both in one command — closing the leak, not just releasing).
    const a = (await provider("InventoryItem").getById(ITEM_A)) as Record<
      string,
      unknown
    >;
    const b = (await provider("InventoryItem").getById(ITEM_B)) as Record<
      string,
      unknown
    >;
    expect(Number(a.quantityOnHand)).toBe(90);
    expect(Number(a.quantityReserved)).toBe(0);
    expect(Number(b.quantityOnHand)).toBe(45);
    expect(Number(b.quantityReserved)).toBe(0);

    // The prep list itself transitioned to completed.
    const prepList = (await provider("PrepList").getById(PREP_LIST_ID)) as Record<
      string,
      unknown
    >;
    expect(prepList.status).toBe("completed");

    // Secondary proof: each downstream consume's event bubbles up into the parent command's
    // emitted events — only possible if the middleware executed for both items.
    const consumed = (result.ok ? result.events : [])?.filter(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name === "InventoryConsumed"
    );
    expect(consumed?.length).toBe(2);
  });

  it("an item with insufficient on-hand stock is skipped (block) while the rest still consume", async () => {
    const provider = makeProvider();
    await seedFinalizedPrepList(provider);
    await seedPrepItem(provider, "pli-A", ITEM_A, 10);
    // Item B demands 5 but only 2 are on hand → consume's blockInsufficientStock rejects it.
    await seedPrepItem(provider, "pli-B", ITEM_B, 5);
    await seedInventoryItem(provider, ITEM_A, 100, 10);
    await seedInventoryItem(provider, ITEM_B, 2, 5);
    const engine = newEngine(provider);

    const result = await markCompleted(engine);
    // The completion itself still succeeds; a single un-consumable item is surfaced via
    // diagnostics, not fatal — the other items must not be held hostage.
    expect(result.ok).toBe(true);

    const a = (await provider("InventoryItem").getById(ITEM_A)) as Record<
      string,
      unknown
    >;
    const b = (await provider("InventoryItem").getById(ITEM_B)) as Record<
      string,
      unknown
    >;
    expect(Number(a.quantityOnHand)).toBe(90);
    expect(Number(a.quantityReserved)).toBe(0);
    // Item B untouched — the block prevented an over-draw to negative stock.
    expect(Number(b.quantityOnHand)).toBe(2);
    expect(Number(b.quantityReserved)).toBe(5);
  });
});
