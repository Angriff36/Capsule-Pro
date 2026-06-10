/**
 * Reaction conformance — emit → reaction → command → store mutation (Task 9.2).
 *
 * WHY this matters (not just WHAT it does): `manifest/source/reactions.manifest`
 * declares 10 cross-entity reactions (`on <Event> run <Entity>.<command>`) that
 * REPLACE manual cross-entity Prisma writes which previously bypassed governance
 * (raw stock updates in receiving/waste handlers, payment webhooks — constitution
 * §9/§11). The reaction MECHANISM ships in @angriff36/manifest and the 10 reactions
 * compile into the merged IR's `reactions[]`, but until now NO test asserted the
 * full chain end-to-end: that emitting a source event actually dispatches the
 * downstream governed command and mutates the target's stored state. Constitution
 * §13 requires governed behavior to be proven against `RuntimeEngine.runCommand`
 * with compiled IR and to assert the resulting state change + emitted semantic
 * events — not merely that the reaction exists in the IR. This test closes that gap.
 *
 * It runs against the REAL compiled IR (`manifest/ir/kitchen.ir.json`), so a
 * regression that drops the reaction, breaks its `resolve payload.inventoryItemId`
 * expression, mis-maps its params, or stops the engine dispatching reactions fails
 * here loudly.
 *
 * Reaction under test (#3 — `WasteEntryCreated → InventoryItem.waste`): chosen
 * because it is one of the reactions that ACTUALLY fires end-to-end. The engine
 * builds an emitted event's payload as `{ ...commandInputBody, result }`
 * (runtime-engine.js), so a reaction's `resolve`/`params` can only read a field
 * that is present in the EMITTING command's input body. `WasteEntry.create` takes
 * `inventoryItemId`, `quantity`, and `loggedBy` as required params, so the
 * `WasteEntryCreated` payload carries exactly the fields the reaction resolves
 * against. (Contrast: `ShipmentItemReceived → InventoryItem.restock` resolves
 * `payload.itemId`, but `ShipmentItem.updateReceived` does NOT take `itemId` as a
 * param, so that reaction silently no-ops — see IMPLEMENTATION_PLAN.md Task 9.2.)
 *
 * Chain proven here:
 *   WasteEntry.create(inventoryItemId=X, quantity=N, loggedBy=U)
 *     → emits WasteEntryCreated (payload.inventoryItemId=X, payload.quantity=N)
 *     → reaction loads InventoryItem X and runs waste(quantity=N, reason, lotId, userId)
 *     → `mutate quantityOnHand = self.quantityOnHand - quantity`  ⇒ stock drops by N
 *     → emits InventoryWasted (bubbles up into the parent command's emittedEvents)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RuntimeEngine, type Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-reaction";
// admin satisfies WasteEntry's create policy AND InventoryItemDefaultAccess +
// ManagersCanRestock/consume — so neither the source command nor the reaction's
// downstream command is denied at the policy gate.
const USER = { id: "u-reaction", tenantId: TENANT, role: "admin" } as const;

const INV_ID = "inv-reaction-001";

// Minimal persistent in-memory store (mirrors the upstream MemoryStore contract).
// Every IR entity is `durable`, so RuntimeEngine REQUIRES a storeProvider.
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

function newEngine(provider: (entity: string) => Store): RuntimeEngine {
  return new RuntimeEngine(
    ir,
    { tenantId: USER.tenantId, user: { id: USER.id, tenantId: USER.tenantId, role: USER.role } },
    { storeProvider: provider, customBuiltins: createCustomBuiltins() },
  );
}

async function seedInventoryItem(
  provider: (entity: string) => Store,
  id: string,
  quantityOnHand: number,
  overrides: Record<string, unknown> = {},
) {
  // Seed directly via the store (bypassing InventoryItem.create's guards) so the
  // test isolates the reaction chain, not item creation.
  await provider("InventoryItem").create({
    id,
    tenantId: TENANT,
    item_number: `INV-${id}`,
    name: "All-Purpose Flour",
    category: "dry-goods",
    unitOfMeasure: "kg",
    unitCost: 2,
    quantityOnHand,
    quantityReserved: 0,
    status: "active",
    ...overrides,
  } as never);
}

async function logWaste(
  engine: RuntimeEngine,
  quantity: number,
  inventoryItemId: string = INV_ID,
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "WasteEntry",
      command: "create",
      body: {
        inventoryItemId,
        reasonId: 1,
        quantity,
        unitId: 0,
        eventId: "",
        loggedBy: USER.id,
        unitCost: 0,
        notes: "",
      },
      user: { ...USER },
    },
  );
}

describe("Reaction conformance: WasteEntryCreated → InventoryItem.waste", () => {
  it("the compiled IR carries the reaction with the expected resolve + param mapping", () => {
    const reactions: Array<Record<string, unknown>> = ir.reactions ?? [];
    expect(reactions.length).toBeGreaterThanOrEqual(11);

    const waste = reactions.find(
      (r) =>
        r.event === "WasteEntryCreated" &&
        r.targetEntity === "InventoryItem" &&
        r.targetCommand === "waste",
    );
    expect(waste).toBeDefined();
    // resolve points at the wasted line's inventory item id.
    expect(JSON.stringify(waste?.resolve)).toContain("inventoryItemId");
    // quantity flows from the event payload, not a constant.
    expect(JSON.stringify(waste?.params)).toContain("quantity");
  });

  it("creating a WasteEntry dispatches the waste reaction and decrements stock by the wasted quantity", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, INV_ID, 10);
    const engine = newEngine(provider);

    const result = await logWaste(engine, 3);
    expect(result.ok).toBe(true);

    // THE PROOF: the reaction ran InventoryItem.waste against the SAME store.
    const inv = (await provider("InventoryItem").getById(INV_ID)) as Record<
      string,
      unknown
    >;
    expect(inv).toBeTruthy();
    // 10 (seeded) - 3 (wasted) via the waste reaction.
    expect(inv.quantityOnHand).toBe(7);

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the reaction executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name,
    );
    expect(eventNames).toContain("WasteEntryCreated");
    expect(eventNames).toContain("InventoryWasted");
  });

  it("maps payload.quantity → waste quantity (a different value flows through, not a hardcode)", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, INV_ID, 20);
    const engine = newEngine(provider);

    const result = await logWaste(engine, 4);
    expect(result.ok).toBe(true);

    const inv = (await provider("InventoryItem").getById(INV_ID)) as Record<
      string,
      unknown
    >;
    expect(inv.quantityOnHand).toBe(16); // 20 - 4
  });

  it("does not touch unrelated inventory items (resolve targets only payload.inventoryItemId)", async () => {
    const provider = makeProvider();
    await seedInventoryItem(provider, INV_ID, 10);
    await seedInventoryItem(provider, "inv-bystander", 50, {
      name: "Olive Oil",
      unitCost: 9,
    });
    const engine = newEngine(provider);

    const result = await logWaste(engine, 2);
    expect(result.ok).toBe(true);

    const bystander = (await provider("InventoryItem").getById(
      "inv-bystander",
    )) as Record<string, unknown>;
    expect(bystander.quantityOnHand).toBe(50); // unchanged

    const target = (await provider("InventoryItem").getById(INV_ID)) as Record<
      string,
      unknown
    >;
    expect(target.quantityOnHand).toBe(8); // 10 - 2
  });
});
