/**
 * Middleware conformance — InventoryStock adjust/recount → InventoryItem.adjust (IMPLEMENTATION_PLAN P1).
 *
 * WHY this matters (not just WHAT it does): `InventoryStock` is the per-storage-
 * location stock row; `InventoryItem.quantityOnHand` is the AGGREGATE item total
 * that valuation, par/reorder math, and every "how much do we have?" read use.
 * `InventoryStock.adjust(delta, reason)` and `InventoryStock.recount(newQuantity,
 * countedBy)` mutate ONLY the location row and emit `InventoryStockAdjusted` /
 * `InventoryStockRecounted`, but NOTHING propagated that change up to the parent
 * item — so after any location adjustment or recount the item total silently went
 * stale and diverged from the sum of its locations. This wires the propagation.
 *
 * The fix is middleware (not a reaction): the target item is `InventoryStock.itemId`
 * (the stock row's OWN field, not an adjust/recount param — and declared event
 * fields are never auto-populated from self.*), and recount's delta is a DIFFERENCE
 * (newQuantity − pre-mutation on-hand) that is gone by the time any after-emit
 * consumer runs, so it must be captured on before-guard.
 *
 * The test runs the REAL InventoryStock commands against the compiled IR through
 * the runtime engine WITH the middleware wired, so it FAILS LOUDLY if the sync
 * regresses — item total untouched, wrong delta, wrong sign, or the engine stops
 * dispatching (CLAUDE.md Rule 9; constitution §13). It also regression-locks that
 * nobody re-expresses this as a (item-id-blind) IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createInventoryStockSyncItemMiddleware } from "../middleware/inventory-stock-sync-item-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-stock-sync";
// admin satisfies both the InventoryStock movement policy and InventoryItem.adjust.
const USER = { id: "u-stock-sync", tenantId: TENANT, role: "admin" } as const;

const ITEM = "stock-sync-item-A";
const STOCK = "stock-sync-loc-A";

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

/** Build the engine with the stock-sync middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createInventoryStockSyncItemMiddleware({
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* no-op in tests */
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

async function seedItem(
  provider: (entity: string) => Store,
  quantityOnHand: number
) {
  await provider("InventoryItem").create({
    id: ITEM,
    tenantId: TENANT,
    item_number: `IN-${ITEM}`,
    name: `Item ${ITEM}`,
    category: "produce",
    unitOfMeasure: "kg",
    unitCost: 5,
    quantityOnHand,
    quantityReserved: 0,
    parLevel: 0,
    reorder_level: 0,
  } as never);
}

async function seedStock(
  provider: (entity: string) => Store,
  quantityOnHand: number
) {
  await provider("InventoryStock").create({
    id: STOCK,
    tenantId: TENANT,
    itemId: ITEM,
    storageLocationId: "loc-1",
    quantityOnHand,
    unitId: 1,
  } as never);
}

function runStock(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "InventoryStock",
      command,
      body: { id: STOCK, tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

async function itemOnHand(
  provider: (entity: string) => Store
): Promise<number> {
  const item = (await provider("InventoryItem").getById(ITEM)) as Record<
    string,
    unknown
  >;
  return Number(item.quantityOnHand);
}

describe("Middleware conformance: InventoryStock adjust/recount → InventoryItem.adjust", () => {
  it("the compiled IR carries NO InventoryStock → InventoryItem.adjust reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stockEvents = new Set([
      "InventoryStockAdjusted",
      "InventoryStockRecounted",
    ]);
    const stale = reactions.filter(
      (r) =>
        stockEvents.has(r.event as string) &&
        r.targetEntity === "InventoryItem" &&
        r.targetCommand === "adjust"
    );
    // A regression here means someone re-expressed the sync as a reaction, which
    // cannot resolve the target item (itemId is the stock row's own field) nor
    // compute the recount delta — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("InventoryStock.adjust mirrors its signed delta onto the item total", async () => {
    const provider = makeProvider();
    await seedItem(provider, 100);
    await seedStock(provider, 40);
    const engine = newEngine(provider);

    // A negative location adjustment (count correction down by 6).
    const result = await runStock(engine, "adjust", {
      delta: -6,
      reason: "spillage at location",
    });
    expect(result.ok).toBe(true);

    // The stock row itself moved (40 → 34)…
    const stock = (await provider("InventoryStock").getById(STOCK)) as Record<
      string,
      unknown
    >;
    expect(Number(stock.quantityOnHand)).toBe(34);

    // …THE PROOF: the item total tracked the same signed delta (100 → 94), which a
    // reaction could not have done (itemId is the stock's own field).
    expect(await itemOnHand(provider)).toBe(94);
  });

  it("InventoryStock.recount mirrors the (new − old) delta onto the item total", async () => {
    const provider = makeProvider();
    await seedItem(provider, 100);
    await seedStock(provider, 40);
    const engine = newEngine(provider);

    // Recount finds 52 at the location (was 40) → +12 variance.
    const result = await runStock(engine, "recount", {
      newQuantity: 52,
      countedBy: "u-counter",
    });
    expect(result.ok).toBe(true);

    const stock = (await provider("InventoryStock").getById(STOCK)) as Record<
      string,
      unknown
    >;
    expect(Number(stock.quantityOnHand)).toBe(52);

    // Item total moved by the recount delta (+12): 100 → 112. Proves the
    // pre-mutation on-hand was captured on before-guard (without it the delta
    // would compute as 0 and the item total would stay 100).
    expect(await itemOnHand(provider)).toBe(112);
  });

  it("a no-op recount (count confirms current stock) does NOT touch the item total", async () => {
    const provider = makeProvider();
    await seedItem(provider, 100);
    await seedStock(provider, 40);
    const engine = newEngine(provider);

    // Recount confirms 40 (no variance) → zero delta → no item mutation, no
    // spurious downstream adjustment/ledger row.
    const result = await runStock(engine, "recount", {
      newQuantity: 40,
      countedBy: "u-counter",
    });
    expect(result.ok).toBe(true);

    expect(await itemOnHand(provider)).toBe(100);
  });
});
