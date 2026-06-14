/**
 * Middleware conformance — `ShipmentItemReceived → InventoryItem.restock` (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): confirming a received shipment line is
 * supposed to add the received quantity to the linked inventory item, so stock-on-hand
 * tracks deliveries. This was a SILENT NO-OP: the old
 * `on ShipmentItemReceived run InventoryItem.restock` reaction resolved
 * `payload.result.itemId`, and `ShipmentItem.updateReceived` is a MUTATE command, so the
 * engine's emitted payload `{ ...commandInput, result }` carries `result` = the last
 * mutate's scalar (`conditionNotes`), NOT the ShipmentItem instance. So received
 * shipments never restocked inventory. The reaction ALSO hardcoded `costPerUnit: 0`, so
 * the moment the no-op was naively "fixed" it would have zeroed `InventoryItem.unitCost`
 * on every receipt, corrupting valuation.
 *
 * The fix is middleware (not a reaction), per the verified engine-semantics rule: the
 * values restock needs are the ShipmentItem's OWN fields — `itemId` (which item) and
 * `unitCost` (valuation) — which `updateReceived` does not take as params and which
 * declared event fields are never auto-populated from. The middleware loads the
 * ShipmentItem from the store, reads `self.itemId`/`self.unitCost`, and dispatches the
 * governed `InventoryItem.restock`; when the shipment line has no cost it PRESERVES the
 * item's existing unitCost rather than zeroing a known cost.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation regresses — stock not added,
 * wrong quantity, or unitCost corrupted (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that nobody re-expresses this as the (no-op, valuation-corrupting)
 * IR reaction.
 *
 * Chain proven here:
 *   ShipmentItem.updateReceived(quantityReceived=Q)
 *     → emits ShipmentItemReceived (_subject.id = the ShipmentItem id; payload carries Q)
 *     → middleware loads the ShipmentItem, reads itemId/unitCost
 *     → dispatches InventoryItem.restock(quantity=Q, costPerUnit=unitCost)
 *     → the item's quantityOnHand rises by Q, unitCost reflects the receipt,
 *       InventoryRestocked bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createShipmentItemReceivedInventoryRestockMiddleware } from "../middleware/shipment-item-received-inventory-restock-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-ship-restock";
// admin satisfies ShipmentItem.updateReceived AND InventoryItem.restock policy.
const USER = { id: "u-ship-restock", tenantId: TENANT, role: "admin" } as const;

const ITEM = "inv-ship-A";
const SHIPMENT_ITEM = "ship-item-A";

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

/** Build the engine with the shipment-restock middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createShipmentItemReceivedInventoryRestockMiddleware({
      storeProvider: provider,
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

async function seedInventoryItem(
  provider: (entity: string) => Store,
  quantityOnHand: number,
  unitCost: number
) {
  await provider("InventoryItem").create({
    id: ITEM,
    tenantId: TENANT,
    item_number: `IN-${ITEM}`,
    name: `Item ${ITEM}`,
    category: "produce",
    unitOfMeasure: "kg",
    unitCost,
    quantityOnHand,
    quantityReserved: 0,
    parLevel: 0,
    reorder_level: 0,
  } as never);
}

async function seedShipmentItem(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  await provider("ShipmentItem").create({
    id: SHIPMENT_ITEM,
    tenantId: TENANT,
    shipmentId: "ship-1",
    itemId: ITEM,
    quantityShipped: 20,
    quantityReceived: 0,
    quantityDamaged: 0,
    unitId: 0,
    unitCost: 7,
    totalCost: 140,
    condition: "good",
    conditionNotes: "",
    lotNumber: "",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function receive(
  engine: ManifestRuntimeEngine,
  quantityReceived: number
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "ShipmentItem",
      command: "updateReceived",
      body: {
        id: SHIPMENT_ITEM,
        tenantId: TENANT,
        quantityReceived,
        quantityDamaged: 0,
        condition: "good",
        conditionNotes: "",
        userId: "u-actor",
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: ShipmentItemReceived → InventoryItem.restock", () => {
  it("the compiled IR no longer carries the broken Shipment→Inventory reaction (it is middleware now)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "ShipmentItemReceived" &&
        r.targetEntity === "InventoryItem" &&
        r.targetCommand === "restock"
    );
    // A regression here means someone re-added the dead `payload.result.itemId` /
    // hardcoded-cost reaction; the propagation must stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("receiving a shipment line restocks the linked inventory item by the received quantity, valued at the shipment unitCost", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, 100, 4);
    await seedShipmentItem(provider, { unitCost: 7 });
    const engine = newEngine(provider);

    const result = await receive(engine, 20);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran InventoryItem.restock against the SAME store, so
    // on-hand rose by the received quantity and unitCost reflects the receipt — none
    // of which the no-op reaction did (and the reaction would have set unitCost to 0).
    const item = (await provider("InventoryItem").getById(ITEM)) as Record<
      string,
      unknown
    >;
    expect(Number(item.quantityOnHand)).toBe(120);
    expect(Number(item.unitCost)).toBe(7);

    // Secondary proof: the downstream restock's own event bubbles up — only possible
    // if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("ShipmentItemReceived");
    expect(eventNames).toContain("InventoryRestocked");
  });

  it("preserves the item's existing unitCost when the shipment line carries no cost (no $0 corruption)", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, 100, 4);
    // A shipment line with unitCost 0 (missing/free) must NOT zero the item's known cost.
    await seedShipmentItem(provider, { unitCost: 0, totalCost: 0 });
    const engine = newEngine(provider);

    const result = await receive(engine, 10);
    expect(result.ok).toBe(true);

    const item = (await provider("InventoryItem").getById(ITEM)) as Record<
      string,
      unknown
    >;
    // Stock still rises...
    expect(Number(item.quantityOnHand)).toBe(110);
    // ...but the known unitCost is preserved, not clobbered to 0 (the old reaction's bug).
    expect(Number(item.unitCost)).toBe(4);
  });

  it("skips restock when nothing was received (quantityReceived 0)", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, 100, 4);
    await seedShipmentItem(provider);
    const engine = newEngine(provider);

    const result = await receive(engine, 0);
    // The line still updates (received recorded); only the restock is skipped (guard-safe).
    expect(result.ok).toBe(true);

    const item = (await provider("InventoryItem").getById(ITEM)) as Record<
      string,
      unknown
    >;
    expect(Number(item.quantityOnHand)).toBe(100);
    expect(Number(item.unitCost)).toBe(4);

    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("ShipmentItemReceived");
    expect(eventNames).not.toContain("InventoryRestocked");
  });
});
