/**
 * Middleware conformance — inventory movements → InventoryTransaction ledger (IMPLEMENTATION_PLAN P0).
 *
 * WHY this matters (not just WHAT it does): every `InventoryItem` movement
 * command mutates the item's quantities and emits its event
 * (`consume → InventoryConsumed`, `waste → InventoryWasted`,
 * `restock → InventoryRestocked`, `adjust → InventoryAdjusted`), but NOTHING
 * recorded the movement in the governed `InventoryTransaction` ledger. That
 * append-only ledger — the basis for stock valuation, par/reorder math, and the
 * audit trail (constitution §12) — was only ever written by direct Prisma in
 * three routes (purchase-orders complete, stock-levels adjust, cycle-count
 * finalize). For day-to-day kitchen movements it was effectively EMPTY. That is
 * a P0 gap: governed stock movements left no governed ledger record.
 *
 * The fix is middleware (not a reaction): the ledger row needs a `unitCost` for
 * valuation, which for consume/waste/adjust is the InventoryItem's OWN field
 * (loaded from the store) — not a movement command param — and it needs the
 * SIGNED ledger delta (consume/waste = −qty, restock/adjust = +qty), which a
 * reaction's payload params cannot express.
 *
 * The test runs the movement commands against the REAL compiled IR through the
 * runtime engine WITH the middleware wired, so it FAILS LOUDLY if the ledger
 * propagation regresses — no row written, wrong transaction type, wrong sign,
 * wrong valuation, or the engine stops dispatching (CLAUDE.md Rule 9;
 * constitution §13). It also regression-locks that nobody re-expresses this as a
 * (valuation-incorrect) IR reaction.
 *
 * Chain proven here, per movement:
 *   InventoryItem.<consume|waste|restock|adjust>()
 *     → emits Inventory{Consumed|Wasted|Restocked|Adjusted}
 *       (_subject.id = the item id; payload carries the command params)
 *     → middleware loads the item's unitCost (or reads costPerUnit for restock)
 *     → dispatches a governed InventoryTransaction.create with the signed delta
 *     → one ledger row per movement, valued, with the enum transactionType.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createInventoryMovementTransactionMiddleware } from "../middleware/inventory-movement-transaction-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-inv-ledger";
// admin satisfies InventoryItem movement commands AND InventoryTransaction.create policy.
const USER = { id: "u-inv-ledger", tenantId: TENANT, role: "admin" } as const;

const ITEM = "inv-led-A";

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

/** Build the engine with the inventory-ledger middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createInventoryMovementTransactionMiddleware({
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

// biome-ignore lint/suspicious/noExplicitAny: structural command body.
function runMovement(
  engine: ManifestRuntimeEngine,
  command: string,
  body: Record<string, unknown>
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "InventoryItem",
      command,
      body: { id: ITEM, tenantId: TENANT, ...body },
      user: { ...USER },
    }
  );
}

async function ledgerRows(
  provider: (entity: string) => Store
): Promise<Record<string, unknown>[]> {
  return (await provider("InventoryTransaction").getAll()) as Record<
    string,
    unknown
  >[];
}

describe("Middleware conformance: inventory movements → InventoryTransaction ledger", () => {
  it("the compiled IR carries NO inventory-movement → InventoryTransaction.create reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const movementEvents = new Set([
      "InventoryConsumed",
      "InventoryWasted",
      "InventoryRestocked",
      "InventoryAdjusted",
    ]);
    const stale = reactions.filter(
      (r) =>
        movementEvents.has(r.event as string) &&
        r.targetEntity === "InventoryTransaction" &&
        r.targetCommand === "create"
    );
    // A regression here means someone re-expressed the ledger write as a reaction,
    // which cannot value the row (unitCost is the item's own field) nor sign the
    // delta — it must stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("consume records a signed-negative `issue` ledger row valued at the item's unitCost", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, 100, 5);
    const engine = newEngine(provider);

    const result = await runMovement(engine, "consume", {
      quantity: 10,
      lotId: "lot-consume-1",
      userId: "u-actor",
    });
    expect(result.ok).toBe(true);

    // The movement itself ran: on-hand dropped by 10.
    const item = (await provider("InventoryItem").getById(ITEM)) as Record<
      string,
      unknown
    >;
    expect(Number(item.quantityOnHand)).toBe(90);

    // THE PROOF: exactly one ledger row, an outflow (`issue`) with a NEGATIVE
    // delta (stock left) valued at the item's own unitCost (5) — none of which a
    // reaction could have supplied.
    const rows = await ledgerRows(provider);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.itemId).toBe(ITEM);
    expect(row.transactionType).toBe("issue");
    expect(Number(row.quantity)).toBe(-10);
    expect(Number(row.unitCost)).toBe(5);
    // lotId is carried through for traceability.
    expect(row.referenceId).toBe("lot-consume-1");
    expect(row.employeeId).toBe("u-actor");
  });

  it("waste records a signed-negative `waste` ledger row carrying the reason", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, 100, 4);
    const engine = newEngine(provider);

    const result = await runMovement(engine, "waste", {
      quantity: 3,
      reason: "spoiled",
      lotId: "lot-waste-1",
      userId: "u-actor",
    });
    expect(result.ok).toBe(true);

    const rows = await ledgerRows(provider);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.transactionType).toBe("waste");
    expect(Number(row.quantity)).toBe(-3);
    expect(Number(row.unitCost)).toBe(4);
    expect(row.reason).toBe("spoiled");
  });

  it("restock records a signed-positive `receipt` ledger row valued at the payload costPerUnit", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, 100, 4);
    const engine = newEngine(provider);

    const result = await runMovement(engine, "restock", {
      quantity: 20,
      costPerUnit: 7,
      userId: "u-actor",
    });
    expect(result.ok).toBe(true);

    const rows = await ledgerRows(provider);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.transactionType).toBe("receipt");
    expect(Number(row.quantity)).toBe(20);
    // receipt is valued from the command's own costPerUnit, not the stale item cost.
    expect(Number(row.unitCost)).toBe(7);
  });

  it("adjust passes a signed delta straight through to an `adjustment` ledger row", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, 100, 6);
    const engine = newEngine(provider);

    // A negative adjustment (count correction down) — proves the param is already a
    // signed delta and is recorded as-is (sign +1 passthrough), distinct from the
    // consume/waste negation path.
    const result = await runMovement(engine, "adjust", {
      quantity: -4,
      reason: "count correction",
      userId: "u-actor",
    });
    expect(result.ok).toBe(true);

    const rows = await ledgerRows(provider);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.transactionType).toBe("adjustment");
    expect(Number(row.quantity)).toBe(-4);
    expect(Number(row.unitCost)).toBe(6);
    expect(row.reason).toBe("count correction");
  });
});
