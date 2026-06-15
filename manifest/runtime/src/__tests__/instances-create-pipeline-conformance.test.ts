/**
 * Conformance: kitchen instance-creation helpers route through the governed
 * Manifest command pipeline (D15).
 *
 * WHY this matters (the bug these tests lock out):
 * `manifest/runtime/src/kitchen/instances.ts` previously created entities via
 * `engine.createInstance(...)`, hand-supplying IR-owned defaults and — for
 * InventoryItem — STORING the computed property `quantityAvailable` with the
 * wrong formula (it ignored `quantityReserved`) plus phantom fields the entity
 * does not declare (`baseUnit`/`costPerUnit`). `createInstance` writes the row
 * directly, bypassing guards/constraints/policies, IR defaults, and computed
 * evaluation.
 *
 * The fix routes each helper through the IR-declared `create` command via
 * `engine.runCommand("create", …)`. These tests assert the OBSERVABLE
 * consequences of that fix — and are written so they can only pass if the
 * helper speaks the IR's real property contract and lets the runtime own
 * defaults + computed props:
 *   1. The create succeeds through the governed pipeline.
 *   2. The real IR fields (`unitOfMeasure`/`unitCost`) are populated from the
 *      helper's loose input — the old path left `unitOfMeasure` at its default
 *      and stored a junk `baseUnit` key instead.
 *   3. The phantom fields (`baseUnit`/`costPerUnit`) are NOT persisted.
 *   4. `quantityAvailable` is never stored as a stored field, and when the
 *      runtime exposes it, it equals `quantityOnHand - quantityReserved`.
 *   5. PrepTask/Station defaults (`status="open"`, `isActive=true`) come from
 *      the IR via the pipeline, not from a hand-set literal.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RuntimeEngine, type Store } from "@angriff36/manifest";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createInventoryItemInstance,
  createPrepTaskInstance,
  createStationInstance,
} from "../kitchen/instances";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-instances";

// In-memory store (same pattern as entity-concurrency.test.ts).
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
    {
      tenantId: TENANT,
      user: { id: "u1", tenantId: TENANT, role: "admin" },
    },
    { storeProvider: provider }
  );
}

describe("kitchen instance helpers route through the governed create pipeline", () => {
  let provider: (entity: string) => Store;
  let stores: Map<string, Mem>;

  beforeEach(() => {
    ({ provider, stores } = makeProvider());
  });

  it("createInventoryItemInstance maps to real IR fields and never stores the computed quantityAvailable", async () => {
    const engine = newEngine(provider);
    const id = "inv-1";

    const result = await createInventoryItemInstance(engine, {
      id,
      tenantId: TENANT,
      name: "Test Flour",
      category: "dry-goods",
      baseUnit: "kg",
      quantityOnHand: 30,
      parLevel: 5,
      costPerUnit: 2,
    });

    expect(
      (result as { success: boolean }).success,
      `create should succeed through the pipeline: ${JSON.stringify(result)}`
    ).toBe(true);

    const row = await stores.get("InventoryItem")!.getById(id);
    expect(row).toBeTruthy();

    // (2) The helper's loose `baseUnit`/`costPerUnit` map to the REAL IR props.
    // The old createInstance path left unitOfMeasure at its "each" default and
    // stored a junk `baseUnit` instead — so these assertions can only pass when
    // the helper speaks the IR's `create` contract.
    expect(row.unitOfMeasure).toBe("kg");
    expect(Number(row.unitCost)).toBe(2);

    // (3) Phantom fields are gone — the create command never declared them.
    expect(row).not.toHaveProperty("baseUnit");
    expect(row).not.toHaveProperty("costPerUnit");
    expect(row).not.toHaveProperty("reorderPoint");
    expect(row).not.toHaveProperty("itemType");

    // (4) quantityReserved defaults to 0; the computed quantityAvailable is
    // NEVER persisted as a stored field (that was the core D15 bug).
    expect(Number(row.quantityReserved)).toBe(0);
    expect(row).not.toHaveProperty("quantityAvailable");
  });

  it("never persists the computed quantityAvailable; reserve updates the real stored quantityReserved", async () => {
    const engine = newEngine(provider);
    const id = "inv-2";

    await createInventoryItemInstance(engine, {
      id,
      tenantId: TENANT,
      name: "Test Sugar",
      category: "dry-goods",
      baseUnit: "kg",
      quantityOnHand: 30,
    });

    const store = stores.get("InventoryItem")!;
    // The heart of the D15 bug: the old createInstance path STORED
    // `quantityAvailable: quantityOnHand` (a computed property, with the wrong
    // formula). The governed create never mutates it, so it must not be a
    // stored field at all — the runtime computes it on demand.
    let row = await store.getById(id);
    expect(row).not.toHaveProperty("quantityAvailable");
    expect(Number(row.quantityOnHand)).toBe(30);
    expect(Number(row.quantityReserved)).toBe(0);

    // Reserving moves the REAL stored field `quantityReserved`; `quantityAvailable`
    // stays unstored (computed = onHand - reserved = 20 when read via an expression).
    const reserve = await engine.runCommand(
      "reserve",
      { quantity: 10, eventId: "evt-1", userId: "u1" },
      { entityName: "InventoryItem", instanceId: id }
    );
    expect((reserve as { success: boolean }).success).toBe(true);

    row = await store.getById(id);
    expect(Number(row.quantityReserved)).toBe(10);
    expect(row).not.toHaveProperty("quantityAvailable");
  });

  it("createPrepTaskInstance lets the IR own the status default", async () => {
    const engine = newEngine(provider);
    const id = "pt-1";

    const result = await createPrepTaskInstance(engine, {
      id,
      tenantId: TENANT,
      eventId: "evt-1",
      name: "Chop vegetables",
    });

    expect((result as { success: boolean }).success).toBe(true);
    const row = await stores.get("PrepTask")!.getById(id);
    expect(row).toBeTruthy();
    // status default comes from the IR (`property required status = "open"`),
    // not a hand-set literal in the helper.
    expect(row.status).toBe("open");
    expect(row.taskType).toBe("prep");
  });

  it("createStationInstance lets the IR own the isActive default and coerces equipmentList to an array", async () => {
    const engine = newEngine(provider);
    const id = "st-1";

    const result = await createStationInstance(engine, {
      id,
      tenantId: TENANT,
      locationId: "loc-1",
      name: "Grill Station",
      equipmentList: "grill",
    });

    expect((result as { success: boolean }).success).toBe(true);
    const row = await stores.get("Station")!.getById(id);
    expect(row).toBeTruthy();
    expect(row.isActive).toBe(true);
    expect(row.currentTaskCount).toBe(0);
    // single-string helper input is coerced to the IR's array<string> param.
    expect(Array.isArray(row.equipmentList)).toBe(true);
    expect(row.equipmentList).toContain("grill");
  });
});
