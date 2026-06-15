/**
 * Middleware conformance — `IngredientRecallFlagged → InventoryItem.softDelete`
 * (IMPLEMENTATION_PLAN P1, Dish/Ingredient lifecycle propagation).
 *
 * WHY this matters (not just WHAT it does): a supplier recall is a food-safety
 * event. `Ingredient.flagRecall` flips the INGREDIENT row (isRecalled = true,
 * isActive = false) and emits `IngredientRecallFlagged` — but until this middleware
 * existed, the recalled ingredient's PHYSICAL inventory stock stayed live and
 * visible: it kept appearing in inventory lists, par/reorder reads, and "what do we
 * have", as if it were safe to use or reorder. The middleware pulls that stock by
 * dispatching the governed `InventoryItem.softDelete` (the only availability-removing
 * command the entity declares — sets `deletedAt`, after which inventory reads filter
 * the row out).
 *
 * WHY middleware, not a reaction (the crux this test locks): `flagRecall` is a MUTATE
 * command, so the engine's emitted payload `{ ...commandInput, result }` carries the
 * last mutate's scalar, NOT the Ingredient instance. The InventoryItem to pull is
 * identified by `Ingredient.inventoryItemId` — the ingredient's OWN field, NOT a
 * `flagRecall` input param — and declared event fields are never auto-populated from
 * `self.*`. So NO reaction can read the FK; the middleware LOADS the recalled
 * Ingredient and reads `self.inventoryItemId`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired (middleware lives in the factory, not the IR), so it FAILS LOUDLY
 * if the propagation regresses — stock never pulled, wrong target, or the engine
 * stops dispatching — i.e. it fails when the BUSINESS propagation breaks, not merely
 * on a shape change (CLAUDE.md Rule 9; constitution §13). It also regression-locks
 * that no `IngredientRecallFlagged → InventoryItem` reaction crept into the IR.
 *
 * Chain proven here:
 *   Ingredient.flagRecall(recallReason)  (ingredient not yet recalled, linked to an item)
 *     → emits IngredientRecallFlagged (_subject.id = the ingredient id)
 *     → middleware loads the ingredient, reads inventoryItemId
 *     → only if the linked InventoryItem is not already deleted: dispatch softDelete
 *     → the InventoryItem row gets deletedAt set, InventoryItemDeleted bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createIngredientRecalledQuarantineInventoryMiddleware } from "../middleware/ingredient-recalled-quarantine-inventory-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-ingredient-recall";
// admin satisfies Ingredient.flagRecall's policy AND the middleware's
// InventoryItem.softDelete dispatch policy (ManagersCanSoftDelete = manager/admin),
// so neither the source command nor the downstream is policy-denied.
const USER = {
  id: "u-ingredient-recall",
  tenantId: TENANT,
  role: "admin",
} as const;

const INGREDIENT_ID = "ingredient-recall-001";
const INVENTORY_ID = "inventory-item-recall-001";

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

/** Build the engine with the recall→quarantine middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createIngredientRecalledQuarantineInventoryMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      onDiagnostic: () => {
        /* silence default console.warn in tests */
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

async function seedIngredient(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // flagRecall guards `recallReason != ""` AND `self.isRecalled == false`; the
  // entity-level block constraints require a non-empty name and non-negative
  // shelfLifeDays. Seed a live, not-yet-recalled ingredient linked to an item.
  await provider("Ingredient").create({
    id: INGREDIENT_ID,
    tenantId: TENANT,
    name: "Romaine Lettuce",
    category: "produce",
    shelfLifeDays: 7,
    isActive: true,
    isRecalled: false,
    inventoryItemId: INVENTORY_ID,
    allergens: [],
    ...overrides,
  } as never);
}

async function seedInventoryItem(
  provider: (entity: string) => Store,
  overrides: Record<string, unknown> = {}
) {
  // softDelete guards `self.deletedAt == null`. Seed the required fields
  // (item_number/name/category) so the row is well-formed; deletedAt null = live.
  await provider("InventoryItem").create({
    id: INVENTORY_ID,
    tenantId: TENANT,
    item_number: "INV-ROM-001",
    name: "Romaine Lettuce",
    category: "produce",
    quantityOnHand: 40,
    unitCost: "1.50",
    deletedAt: null,
    ...overrides,
  } as never);
}

async function flagRecall(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Ingredient",
      command: "flagRecall",
      body: {
        id: INGREDIENT_ID,
        tenantId: TENANT,
        recallReason: "Supplier listeria notice",
        userId: USER.id,
      },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: IngredientRecallFlagged → InventoryItem.softDelete", () => {
  it("the compiled IR carries no IngredientRecallFlagged → InventoryItem reaction (it is middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "IngredientRecallFlagged" &&
        r.targetEntity === "InventoryItem"
    );
    // A regression here would mean someone added a reaction that structurally
    // cannot read the ingredient's own inventoryItemId FK — the propagation must
    // stay in middleware.
    expect(stale).toHaveLength(0);
  });

  it("flagging a recall pulls the linked inventory item from stock", async () => {
    const provider = makeProvider();
    await seedIngredient(provider);
    await seedInventoryItem(provider);
    const engine = newEngine(provider);

    const result = await flagRecall(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: the middleware ran InventoryItem.softDelete against the SAME store,
    // so the linked item is now pulled (deletedAt set).
    const itemRow = (await provider("InventoryItem").getById(
      INVENTORY_ID
    )) as Record<string, unknown>;
    expect(itemRow.deletedAt).not.toBeNull();
    expect(itemRow.deletedAt).toBeDefined();

    // The ingredient itself is recalled + deactivated (the source command's effect).
    const ingredientRow = (await provider("Ingredient").getById(
      INGREDIENT_ID
    )) as Record<string, unknown>;
    expect(ingredientRow.isRecalled).toBe(true);
    expect(ingredientRow.isActive).toBe(false);

    // Secondary proof: the downstream command's own event bubbles up into the
    // parent command's emitted events — only possible if the middleware executed.
    const eventNames = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(eventNames).toContain("IngredientRecallFlagged");
    expect(eventNames).toContain("InventoryItemDeleted");
  });

  it("does not re-delete an inventory item that is already pulled (guard-safe/idempotent)", async () => {
    const provider = makeProvider();
    await seedIngredient(provider);
    // Item already soft-deleted — softDelete's `guard self.deletedAt == null` would
    // fail; the middleware must SKIP rather than produce a swallowed error.
    const ALREADY = 1_700_000_000_000;
    await seedInventoryItem(provider, { deletedAt: ALREADY });
    const engine = newEngine(provider);

    const result = await flagRecall(engine);
    expect(result.ok).toBe(true);

    const itemRow = (await provider("InventoryItem").getById(
      INVENTORY_ID
    )) as Record<string, unknown>;
    // Untouched — still carries the original deletion timestamp, not re-processed.
    expect(itemRow.deletedAt).toBe(ALREADY);
  });

  it("pulls nothing when the recalled ingredient has no linked inventory item", async () => {
    const provider = makeProvider();
    await seedIngredient(provider, { inventoryItemId: "" });
    await seedInventoryItem(provider);
    const engine = newEngine(provider);

    const result = await flagRecall(engine);
    expect(result.ok).toBe(true);

    // The seeded item stays live — the middleware had no inventoryItemId to resolve.
    const itemRow = (await provider("InventoryItem").getById(
      INVENTORY_ID
    )) as Record<string, unknown>;
    expect(itemRow.deletedAt).toBeNull();

    // The recall itself still succeeded on the ingredient.
    const ingredientRow = (await provider("Ingredient").getById(
      INGREDIENT_ID
    )) as Record<string, unknown>;
    expect(ingredientRow.isRecalled).toBe(true);
  });
});
