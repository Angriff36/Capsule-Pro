/**
 * Middleware conformance — TransferReceived → per-location InventoryStock movement
 * (IMPLEMENTATION_PLAN P1, Kitchen/Inventory).
 *
 * WHY this matters (not just WHAT it does): `InventoryTransfer` walks a status
 * machine to "received" but NOTHING moved the physical `InventoryStock` rows —
 * no middleware/reaction consumed `TransferReceived`. So stock that physically
 * moved between two locations was never reflected and per-location balances went
 * permanently stale. This wires the propagation: on receipt, each transfer line
 * moves out of the source-location stock row and into the destination row.
 *
 * The CRUX these tests lock: the AGGREGATE `InventoryItem.quantityOnHand` must NOT
 * change (a transfer redistributes on-hand, it doesn't change the total). That
 * holds because each `InventoryStock.adjust` is mirrored onto the item by the
 * sibling stock-sync middleware (also wired here), so source(−qty)+dest(+qty)
 * cancel — which is ONLY true because the destination leg is always an `adjust`
 * (a direct create(qty) would not mirror). The tests run the REAL InventoryTransfer
 * / InventoryStock commands against the compiled IR through the runtime engine, so
 * they FAIL LOUDLY on regression (CLAUDE.md Rule 9; constitution §13).
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createInventoryStockSyncItemMiddleware } from "../middleware/inventory-stock-sync-item-middleware.js";
import { createInventoryTransferReceivedStockMovementMiddleware } from "../middleware/inventory-transfer-received-stock-movement-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-transfer-stock";
const USER = { id: "u-transfer", tenantId: TENANT, role: "admin" } as const;

const ITEM = "transfer-item-A";
const FROM_LOC = "loc-from";
const TO_LOC = "loc-to";
const TRANSFER = "transfer-1";
const SRC_STOCK = "stock-src";
const DST_STOCK = "stock-dst";

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
class Mem implements Store {
  private readonly rows = new Map<string, Record<string, unknown>>();
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getAll(): Promise<any[]> {
    return Array.from(this.rows.values()) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async getById(id: string): Promise<any> {
    return this.rows.get(id) as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async create(data: any): Promise<any> {
    const id = (data.id as string) ?? randomUUID();
    const row = { ...data, id };
    this.rows.set(id, row);
    return row as never;
  }
  // biome-ignore lint/suspicious/noExplicitAny: structural rows.
  async update(id: string, data: any): Promise<any> {
    const existing = this.rows.get(id);
    if (!existing) {
      return undefined as never;
    }
    const row = { ...existing, ...data, id };
    this.rows.set(id, row);
    return row as never;
  }
  async delete(id: string): Promise<boolean> {
    return this.rows.delete(id);
  }
  async clear(): Promise<void> {
    this.rows.clear();
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

/** Build the engine with BOTH the transfer-movement and stock-sync middleware
 *  wired (as the factory does) so the aggregate net-zero is proven end to end. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const dispatch = (
    commandName: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>
  ) => engine.runCommand(commandName, input, options);
  const middleware = [
    createInventoryTransferReceivedStockMovementMiddleware({
      storeProvider: provider,
      dispatchCommand: dispatch as never,
      onDiagnostic: () => {
        /* no-op in tests */
      },
    }),
    createInventoryStockSyncItemMiddleware({
      dispatchCommand: dispatch as never,
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
  id: string,
  storageLocationId: string,
  quantityOnHand: number
) {
  await provider("InventoryStock").create({
    id,
    tenantId: TENANT,
    itemId: ITEM,
    storageLocationId,
    quantityOnHand,
    unitId: 1,
  } as never);
}

async function seedInTransitTransfer(
  provider: (entity: string) => Store,
  quantity: number
) {
  await provider("InventoryTransfer").create({
    id: TRANSFER,
    tenantId: TENANT,
    fromLocationId: FROM_LOC,
    toLocationId: TO_LOC,
    status: "in_transit",
    items: "[]",
  } as never);
  await provider("InventoryTransferItem").create({
    id: "transfer-item-row-1",
    tenantId: TENANT,
    transferId: TRANSFER,
    itemId: ITEM,
    quantity,
    unitId: "kg",
  } as never);
}

function receive(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "InventoryTransfer",
      command: "receive",
      body: { id: TRANSFER, tenantId: TENANT, receivedBy: USER.id },
      user: { ...USER },
    }
  );
}

async function qtyOf(
  provider: (entity: string) => Store,
  entity: string,
  id: string
): Promise<number | undefined> {
  const row = (await provider(entity).getById(id)) as
    | Record<string, unknown>
    | undefined;
  return row ? Number(row.quantityOnHand) : undefined;
}

async function findStockAt(
  provider: (entity: string) => Store,
  storageLocationId: string
): Promise<Record<string, unknown> | undefined> {
  const all = (await provider("InventoryStock").getAll()) as Record<
    string,
    unknown
  >[];
  return all.find((r) => r.storageLocationId === storageLocationId);
}

describe("Middleware conformance: TransferReceived → per-location InventoryStock movement", () => {
  it("the compiled IR carries NO TransferReceived → InventoryStock reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "TransferReceived" && r.targetEntity === "InventoryStock"
    );
    // A regression here means someone re-expressed the move as a reaction, which
    // cannot fan out over transfer lines nor read the transfer's from/to location.
    expect(stale).toHaveLength(0);
  });

  it("moves stock source→destination when both rows exist, leaving the item total UNCHANGED", async () => {
    const provider = makeProvider();
    await seedItem(provider, 100);
    await seedStock(provider, SRC_STOCK, FROM_LOC, 40);
    await seedStock(provider, DST_STOCK, TO_LOC, 20);
    await seedInTransitTransfer(provider, 10);
    const engine = newEngine(provider);

    const result = await receive(engine);
    expect(result.ok).toBe(true);

    // Per-location stock moved: source 40→30, destination 20→30.
    expect(await qtyOf(provider, "InventoryStock", SRC_STOCK)).toBe(30);
    expect(await qtyOf(provider, "InventoryStock", DST_STOCK)).toBe(30);

    // THE PROOF: the aggregate item total is unchanged (−10 + 10 = 0). A transfer
    // redistributes on-hand across locations; it does not change the total owned.
    expect(await qtyOf(provider, "InventoryItem", ITEM)).toBe(100);
  });

  it("bootstraps a destination stock row at 0 then credits it (still net-zero on the item)", async () => {
    const provider = makeProvider();
    await seedItem(provider, 100);
    await seedStock(provider, SRC_STOCK, FROM_LOC, 40);
    // No destination row at TO_LOC.
    await seedInTransitTransfer(provider, 10);
    const engine = newEngine(provider);

    const result = await receive(engine);
    expect(result.ok).toBe(true);

    // Source decremented…
    expect(await qtyOf(provider, "InventoryStock", SRC_STOCK)).toBe(30);
    // …and a brand-new destination row holds the received quantity (created at 0,
    // then adjusted +10 so the credit IS mirrored onto the item — net-zero holds).
    const dest = await findStockAt(provider, TO_LOC);
    expect(dest).toBeDefined();
    expect(Number(dest?.quantityOnHand)).toBe(10);
    expect(Number(dest?.unitId)).toBe(1); // unitId copied from the source row

    expect(await qtyOf(provider, "InventoryItem", ITEM)).toBe(100);
  });

  it("does NOT credit the destination when the source has insufficient stock (no half-booking)", async () => {
    const provider = makeProvider();
    await seedItem(provider, 100);
    await seedStock(provider, SRC_STOCK, FROM_LOC, 5);
    await seedStock(provider, DST_STOCK, TO_LOC, 20);
    await seedInTransitTransfer(provider, 10); // 10 > 5 → source adjust blocked
    const engine = newEngine(provider);

    const result = await receive(engine);
    // The transfer itself still receives (status transition is independent of the
    // physical move); the stock legs are guarded.
    expect(result.ok).toBe(true);

    // Source unchanged (the −10 adjust was rejected by the block constraint)…
    expect(await qtyOf(provider, "InventoryStock", SRC_STOCK)).toBe(5);
    // …and CRUCIALLY the destination was NOT credited (no phantom stock).
    expect(await qtyOf(provider, "InventoryStock", DST_STOCK)).toBe(20);
    // Item total untouched — nothing moved.
    expect(await qtyOf(provider, "InventoryItem", ITEM)).toBe(100);
  });
});
