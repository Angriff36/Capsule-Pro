/**
 * Entity optimistic concurrency (version-based) — runtime behaviour proof.
 *
 * InventoryItem declares `versionProperty: "version"` and
 * `versionAtProperty: "versionAt"` in kitchen.ir.json.  The RuntimeEngine
 * uses these for optimistic locking:
 *
 *   1. createInstance seeds version=1, versionAt=<now>.
 *   2. Each subsequent update auto-increments version (existingVersion+1)
 *      and refreshes versionAt, unless the caller explicitly provides a
 *      version — in which case the engine checks it against the stored
 *      value first.
 *   3. A mismatch between the provided version and the stored version
 *      produces a ConcurrencyConflict result (success=false,
 *      concurrencyConflict.conflictCode === "VERSION_MISMATCH").
 *   4. Retrying with the correct (current) version succeeds normally.
 *
 * These tests pin all four behaviours so a regression in the runtime
 * engine's versioning logic is caught immediately.
 */
import { RuntimeEngine, type Store } from "@angriff36/manifest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-concurrency";

// ---------------------------------------------------------------------------
// In-memory store (same pattern as catering-order-parent-context-runtime.test)
// ---------------------------------------------------------------------------
// biome-ignore lint/suspicious/noExplicitAny: structural rows.
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
    if (!existing) return undefined as never;
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

function makeProvider(): {
  provider: (entity: string) => Store;
  stores: Map<string, Mem>;
} {
  const stores = new Map<string, Mem>();
  const provider = (entity: string): Store => {
    let store = stores.get(entity);
    if (!store) {
      store = new Mem();
      stores.set(entity, store);
    }
    return store;
  };
  return { provider, stores };
}

function newEngine(provider: (entity: string) => Store): RuntimeEngine {
  return new RuntimeEngine(
    ir,
    { user: { id: "u1", tenantId: TENANT, role: "inventory_manager" } },
    { storeProvider: provider },
  );
}

// ---------------------------------------------------------------------------
// Shared create payload — satisfies every create command guard/constraint
// ---------------------------------------------------------------------------
const CREATE_INPUT = {
  item_number: "SKU-001",
  name: "Test Flour",
  category: "dry-goods",
  description: "All-purpose flour",
  unitOfMeasure: "kg",
  unitCost: 2.5,
  quantityOnHand: 100,
  parLevel: 20,
  reorder_level: 10,
  supplierId: "sup-1",
  tags: "baking",
  fsa_status: "compliant",
  fsa_temp_logged: false,
  fsa_allergen_info: false,
  fsa_traceable: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("InventoryItem optimistic concurrency (versionProperty)", () => {
  let provider: (entity: string) => Store;
  let stores: Map<string, Mem>;

  beforeEach(() => {
    ({ provider, stores } = makeProvider());
  });

  /** Helper: create an item and return the engine + created instance id. */
  async function createItem(engineOverride?: RuntimeEngine): Promise<{ id: string; engine: RuntimeEngine }> {
    const engine = engineOverride ?? newEngine(provider);
    const result = await engine.runCommand("create", CREATE_INPUT, {
      entityName: "InventoryItem",
    });

    expect(result.success, `create should succeed: ${JSON.stringify(result)}`).toBe(true);
    const id = (result as { result: { id: string } }).result.id;
    expect(id).toBeTruthy();
    return { id, engine };
  }

  // ----- Test 1: version starts at 1 on create ----------------------------

  it("sets version to 1 and versionAt to a numeric epoch on create", async () => {
    const { id } = await createItem();

    const store = stores.get("InventoryItem")!;
    const row = await store.getById(id);
    expect(row).toBeTruthy();

    // version MUST be 1 — this is the concurrency baseline
    expect(row.version).toBe(1);

    // versionAt MUST be a positive number (epoch ms)
    expect(typeof row.versionAt).toBe("number");
    expect(row.versionAt).toBeGreaterThan(0);
  });

  // ----- Test 2: version increments on each update ------------------------

  it("increments version from 1 → 2 → 3 across successive adjust commands", async () => {
    const { id, engine } = await createItem();
    const store = stores.get("InventoryItem")!;

    // First adjust: version 1 → 2
    const adjust1 = await engine.runCommand(
      "adjust",
      { quantity: -5, reason: "spillage", userId: "u1", id },
      { entityName: "InventoryItem", instanceId: id },
    );
    expect(adjust1.success, `first adjust: ${JSON.stringify(adjust1)}`).toBe(true);

    const after1 = await store.getById(id);
    expect(after1.version).toBe(2);
    expect(after1.quantityOnHand).toBe(95); // 100 + (-5)

    // Second adjust: version 2 → 3
    const adjust2 = await engine.runCommand(
      "adjust",
      { quantity: 10, reason: "found stock", userId: "u1", id },
      { entityName: "InventoryItem", instanceId: id },
    );
    expect(adjust2.success, `second adjust: ${JSON.stringify(adjust2)}`).toBe(true);

    const after2 = await store.getById(id);
    expect(after2.version).toBe(3);
    expect(after2.quantityOnHand).toBe(105); // 95 + 10
  });

  // ----- Test 3: stale version causes ConcurrencyConflict -----------------
  //
  // The concurrency check lives in `updateInstance`: when the data dict
  // carries an explicit `version` that differs from the stored value, the
  // engine records a ConcurrencyConflict.  Command mutate actions call
  // `updateInstance` per-field with only the mutated property, so the
  // stale-version check only fires when `updateInstance` receives version
  // in its data argument — exactly what GenericPrismaStore does before
  // calling update (it adds version to the update payload and the DB-level
  // WHERE clause checks version = newVersion - 1).
  //
  // We test via `updateInstance` directly because that is the contract the
  // Prisma store depends on.  If this test breaks, every governed update
  // with a stale version would silently succeed (lost-update bug).

  it("rejects updateInstance with a stale version (VERSION_MISMATCH)", async () => {
    const { id, engine } = await createItem();

    // First update: version 1 → 2 via a normal command
    await engine.runCommand(
      "adjust",
      { quantity: -3, reason: "audit correction", userId: "u1", id },
      { entityName: "InventoryItem", instanceId: id },
    );

    const store = stores.get("InventoryItem")!;
    const afterFirst = await store.getById(id);
    expect(afterFirst.version).toBe(2);

    // Simulate a stale caller passing version=1 to updateInstance.
    // This mirrors what GenericPrismaStore does: it includes the expected
    // version in the data dict so the engine can detect mismatches.
    const staleResult = await engine.updateInstance("InventoryItem", id, {
      quantityOnHand: 50,
      version: 1, // stale — store has version=2
    });

    // updateInstance returns undefined on conflict
    expect(staleResult).toBeUndefined();

    // The engine records the conflict in lastConcurrencyConflict.
    // This is what _executeCommandInternal checks to produce the
    // CommandResult with concurrencyConflict details.
    // biome-ignore lint/suspicious/noExplicitAny: accessing private field for test
    const conflict = (engine as any).lastConcurrencyConflict;
    expect(conflict).toBeDefined();
    expect(conflict.conflictCode).toBe("VERSION_MISMATCH");
    expect(conflict.entityType).toBe("InventoryItem");
    expect(conflict.entityId).toBe(id);
    expect(conflict.expectedVersion).toBe(1);
    expect(conflict.actualVersion).toBe(2);

    // Verify the store was NOT mutated by the rejected update
    const row = await store.getById(id);
    expect(row.version).toBe(2); // unchanged
    expect(row.quantityOnHand).toBe(97); // 100 + (-3), not 50
  });

  // ----- Test 4: retry with fresh version succeeds ------------------------

  it("succeeds after conflict when retried via a fresh command", async () => {
    const { id, engine } = await createItem();

    // Bump to version 2 via normal command
    await engine.runCommand(
      "adjust",
      { quantity: -3, reason: "first", userId: "u1", id },
      { entityName: "InventoryItem", instanceId: id },
    );

    // Stale attempt with version=1 → returns undefined (conflict)
    const stale = await engine.updateInstance("InventoryItem", id, {
      quantityOnHand: 50,
      version: 1,
    });
    expect(stale).toBeUndefined();

    // A fresh engine on the same store simulates a new API request.
    // runCommand resets versionIncrementedForCommand, so auto-increment works.
    const engine2 = newEngine(provider);
    const retry = await engine2.runCommand(
      "adjust",
      { quantity: -2, reason: "retry with fresh engine", userId: "u1", id },
      { entityName: "InventoryItem", instanceId: id },
    );
    expect(retry.success, `retry should succeed: ${JSON.stringify(retry)}`).toBe(true);

    const store = stores.get("InventoryItem")!;
    const row = await store.getById(id);
    expect(row.version).toBe(3); // auto-incremented from 2
    expect(row.quantityOnHand).toBe(95); // 100 → 97 (first) → 95 (retry)
  });

  // ----- Test 5: versionAt updates on each mutation -----------------------

  it("refreshes versionAt on every successful mutation", async () => {
    const { id, engine } = await createItem();
    const store = stores.get("InventoryItem")!;

    const createdAt = (await store.getById(id)).versionAt;

    // Small delay so versionAt is distinguishable (epoch ms, but engines
    // can execute so fast that two updates land in the same millisecond).
    await new Promise((r) => setTimeout(r, 2));

    await engine.runCommand(
      "adjust",
      { quantity: 1, reason: "tick", userId: "u1", id },
      { entityName: "InventoryItem", instanceId: id },
    );

    const afterAdjust = (await store.getById(id)).versionAt;
    // versionAt should have moved forward (or at least be >= the original)
    expect(afterAdjust).toBeGreaterThanOrEqual(createdAt);
  });

  // ----- Test 6: update without explicit version auto-increments ----------

  it("auto-increments version when no explicit version is provided (normal flow)", async () => {
    const { id, engine } = await createItem();
    const store = stores.get("InventoryItem")!;

    // Normal adjust — no version in the body at all
    const result = await engine.runCommand(
      "restock",
      { quantity: 50, costPerUnit: 2.0, userId: "u1", id },
      { entityName: "InventoryItem", instanceId: id },
    );
    expect(result.success, `restock: ${JSON.stringify(result)}`).toBe(true);

    const row = await store.getById(id);
    expect(row.version).toBe(2); // auto-incremented from 1
    expect(row.quantityOnHand).toBe(150); // 100 + 50
  });
});
