/**
 * Middleware conformance — `EventDishCreated / EventDishQuantityUpdated →
 * PrepList & PrepListItem sync` (IMPLEMENTATION_PLAN P1, Event lifecycle).
 *
 * WHY this matters (not just WHAT it does): a prep list is derived ONCE, at seed
 * time, from the event's dishes. A dish added to a CONFIRMED event, or a change
 * to a dish's serving count, had no consumer — so the new dish never reached the
 * kitchen's prep list and a re-portioned dish never re-scaled its ingredient
 * demand. A silent missing-mise-en-place / food-quantity defect.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * sync middleware wired (as the factory wires it), so it FAILS LOUDLY when the
 * BUSINESS propagation regresses — a new dish's ingredients never created, a
 * re-portioned dish not re-scaled, a prior guest-count rescale (batchMultiplier)
 * silently wiped, a finalized (locked) list disturbed — not merely on a shape
 * change (CLAUDE.md Rule 9; constitution §13). It also regression-locks that
 * nobody re-expresses this derived 1:N fan-out as a (structurally impossible)
 * IR reaction.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createEventDishPrepSyncMiddleware } from "../middleware/event-dish-prep-sync-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-dish-sync";
// admin satisfies EventDish.create/updateQuantity AND PrepListItem policies.
const USER = { id: "u-dish-sync", tenantId: TENANT, role: "admin" } as const;

const EVENT_ID = "evt-dish-001";
// Dish A is on the event from the start (its ingredient is already seeded into
// the prep list). Dish B / its ingredient are the "added after the seed" case.
const DISH_A = "dish-a";
const DISH_B = "dish-b";
const RECIPE_A = "recipe-a";
const RECIPE_B = "recipe-b";
const VERSION_A = "rv-a";
const VERSION_B = "rv-b";
const ING_X = "ing-x";
const ING_Y = "ing-y";
const INV_X = "inv-x"; // resolved id (Ingredient.inventoryItemId) → PrepListItem.ingredientId
const INV_Y = "inv-y";

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

/** Engine wired with the dish-sync middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createEventDishPrepSyncMiddleware({
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

/**
 * Seed the full menu→ingredient chain (Dish A→ing X, Dish B→ing Y), plus the
 * Event, the existing Dish-A EventDish, and a draft prep list already seeded with
 * Dish A's ingredient row (scaled = baseQty × servings/yield × batchMultiplier).
 */
async function seedFixture(
  provider: (entity: string) => Store,
  opts: { batchMultiplier?: number; prepListStatus?: string } = {}
) {
  const batchMultiplier = opts.batchMultiplier ?? 1;
  const prepListStatus = opts.prepListStatus ?? "draft";

  await provider("Event").create({
    id: EVENT_ID,
    tenantId: TENANT,
    clientId: "client-1",
    title: "Garden Gala",
    eventType: "wedding",
    eventDate: 1_900_000_000_000,
    guestCount: 100,
    status: "confirmed",
  } as never);

  // Recipes / versions (yield 10) and the ingredient lines.
  await provider("Dish").create({
    id: DISH_A,
    tenantId: TENANT,
    recipeId: RECIPE_A,
    name: "Roast Chicken",
  } as never);
  await provider("Dish").create({
    id: DISH_B,
    tenantId: TENANT,
    recipeId: RECIPE_B,
    name: "Garden Salad",
  } as never);
  await provider("RecipeVersion").create({
    id: VERSION_A,
    tenantId: TENANT,
    recipeId: RECIPE_A,
    versionNumber: 1,
    yieldQuantity: 10,
  } as never);
  await provider("RecipeVersion").create({
    id: VERSION_B,
    tenantId: TENANT,
    recipeId: RECIPE_B,
    versionNumber: 1,
    yieldQuantity: 10,
  } as never);
  await provider("RecipeIngredient").create({
    id: "ri-x",
    tenantId: TENANT,
    recipeVersionId: VERSION_A,
    ingredientId: ING_X,
    quantity: 5,
    isOptional: false,
    preparationNotes: "",
  } as never);
  await provider("RecipeIngredient").create({
    id: "ri-y",
    tenantId: TENANT,
    recipeVersionId: VERSION_B,
    ingredientId: ING_Y,
    quantity: 3,
    isOptional: false,
    preparationNotes: "",
  } as never);
  await provider("Ingredient").create({
    id: ING_X,
    tenantId: TENANT,
    name: "Chicken",
    category: "hot",
    allergens: "",
    isActive: true,
    inventoryItemId: INV_X,
  } as never);
  await provider("Ingredient").create({
    id: ING_Y,
    tenantId: TENANT,
    name: "Lettuce",
    category: "cold",
    allergens: "",
    isActive: true,
    inventoryItemId: INV_Y,
  } as never);
  await provider("InventoryItem").create({
    id: INV_X,
    tenantId: TENANT,
    unitOfMeasure: "kg",
  } as never);
  await provider("InventoryItem").create({
    id: INV_Y,
    tenantId: TENANT,
    unitOfMeasure: "kg",
  } as never);

  // Dish A is already on the event (servings 20 → factor 20/10 = 2).
  await provider("EventDish").create({
    id: "ed-a",
    tenantId: TENANT,
    eventId: EVENT_ID,
    dishId: DISH_A,
    quantityServings: 20,
    deletedAt: null,
  } as never);

  // Draft prep list, already seeded with Dish A's ingredient X.
  await provider("PrepList").create({
    id: "pl-1",
    tenantId: TENANT,
    eventId: EVENT_ID,
    name: "Garden Gala - Prep List",
    batchMultiplier,
    dietaryRestrictions: [],
    status: prepListStatus,
    totalItems: 1,
    totalEstimatedTime: 0,
    isActive: true,
  } as never);
  // scaled = base(5) × factor(2) × batchMultiplier
  await provider("PrepListItem").create({
    id: "pli-x",
    tenantId: TENANT,
    prepListId: "pl-1",
    stationId: "hot-line",
    stationName: "Hot Line",
    ingredientId: INV_X,
    ingredientName: "Chicken",
    category: "hot",
    baseQuantity: 5,
    baseUnit: "kg",
    scaledQuantity: 10 * batchMultiplier,
    scaledUnit: "kg",
    isOptional: false,
    preparationNotes: "",
    allergens: "",
    dietarySubstitutions: "",
    dishId: DISH_A,
    dishName: "Roast Chicken",
    recipeVersionId: VERSION_A,
    sortOrder: 1,
    deletedAt: null,
  } as never);
}

function addDish(
  engine: ManifestRuntimeEngine,
  args: { id: string; dishId: string; quantityServings: number }
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EventDish",
      command: "create",
      body: {
        id: args.id,
        tenantId: TENANT,
        eventId: EVENT_ID,
        dishId: args.dishId,
        quantityServings: args.quantityServings,
        specialInstructions: "",
        course: "",
      },
      user: { ...USER },
    }
  );
}

function updateDishQuantity(
  engine: ManifestRuntimeEngine,
  args: { id: string; quantityServings: number }
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EventDish",
      command: "updateQuantity",
      body: {
        id: args.id,
        tenantId: TENANT,
        quantityServings: args.quantityServings,
      },
      user: { ...USER },
    }
  );
}

function removeDish(engine: ManifestRuntimeEngine, args: { id: string }) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "EventDish",
      command: "remove",
      body: {
        id: args.id,
        tenantId: TENANT,
        reason: "menu change",
        userId: USER.id,
      },
      user: { ...USER },
    }
  );
}

async function itemFor(
  provider: (entity: string) => Store,
  prepListId: string,
  ingredientId: string
): Promise<Record<string, unknown> | undefined> {
  const rows = (await provider("PrepListItem").getAll()) as Record<
    string,
    unknown
  >[];
  return rows.find(
    (r) => r.prepListId === prepListId && r.ingredientId === ingredientId
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (
    (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? []
  );
}

describe("Middleware conformance: EventDish change → PrepList sync", () => {
  it("the compiled IR carries NO EventDish change reaction (it is a derived 1:N middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter((r) =>
      ["EventDishCreated", "EventDishQuantityUpdated", "EventDishRemoved"].includes(
        r.event as string
      )
    );
    expect(stale).toHaveLength(0);
  });

  it("PrepListItem.remove exists in the IR (the prune target command)", () => {
    const entities: Record<string, unknown>[] = Array.isArray(ir.entities)
      ? ir.entities
      : Object.values(ir.entities ?? {});
    const prepListItem = entities.find((e) => e.name === "PrepListItem") as
      | { commands?: Array<string | { name?: string }> }
      | undefined;
    const commandNames = (prepListItem?.commands ?? []).map((c) =>
      typeof c === "string" ? c : c.name
    );
    expect(commandNames).toContain("remove");
  });

  it("a dish ADDED after the seed creates its ingredient rows in the draft prep list (the reported bug)", async () => {
    const provider = makeProvider();
    await seedFixture(provider);
    const engine = newEngine(provider);

    // Before: only Dish A's ingredient (INV_X) is on the list.
    expect(await itemFor(provider, "pl-1", INV_Y)).toBeUndefined();

    const result = await addDish(engine, {
      id: "ed-b",
      dishId: DISH_B,
      quantityServings: 20, // factor 20/10 = 2 → base 3, scaled 6
    });
    expect(result.ok).toBe(true);

    // THE PROOF: Dish B's ingredient now appears, correctly scaled.
    const newItem = await itemFor(provider, "pl-1", INV_Y);
    expect(newItem).toBeDefined();
    expect(Number(newItem?.baseQuantity)).toBe(3);
    expect(Number(newItem?.scaledQuantity)).toBe(6);
    // Dish A's existing item is left untouched (no spurious update).
    expect(Number((await itemFor(provider, "pl-1", INV_X))?.scaledQuantity)).toBe(
      10
    );
    // The create bubbled up — only possible if the middleware dispatched it.
    expect(eventNames(result)).toContain("PrepListItemCreated");
  });

  it("changing a dish's serving count re-scales its existing ingredient rows", async () => {
    const provider = makeProvider();
    await seedFixture(provider);
    const engine = newEngine(provider);

    // Dish A 20 → 40 servings: factor 40/10 = 4 → scaled 5×4 = 20.
    const result = await updateDishQuantity(engine, {
      id: "ed-a",
      quantityServings: 40,
    });
    expect(result.ok).toBe(true);

    const item = await itemFor(provider, "pl-1", INV_X);
    expect(Number(item?.scaledQuantity)).toBe(20);
    expect(Number(item?.baseQuantity)).toBe(5);
    expect(eventNames(result)).toContain("PrepListItemUpdated");
  });

  it("preserves a prior guest-count rescale: new dish rows are scaled by the list's batchMultiplier", async () => {
    const provider = makeProvider();
    // List already guest-rescaled ×2 (Dish A's item scaled = 10×2 = 20).
    await seedFixture(provider, { batchMultiplier: 2 });
    const engine = newEngine(provider);

    const result = await addDish(engine, {
      id: "ed-b",
      dishId: DISH_B,
      quantityServings: 20,
    });
    expect(result.ok).toBe(true);

    // Dish B's new row carries the ×2 guest scaling (base 3, scaled 6×2 = 12).
    const newItem = await itemFor(provider, "pl-1", INV_Y);
    expect(Number(newItem?.baseQuantity)).toBe(3);
    expect(Number(newItem?.scaledQuantity)).toBe(12);
    // Dish A's rescaled item is NOT clobbered back to the unscaled amount.
    expect(Number((await itemFor(provider, "pl-1", INV_X))?.scaledQuantity)).toBe(
      20
    );
  });

  it("does NOT touch a finalized (locked) prep list", async () => {
    const provider = makeProvider();
    await seedFixture(provider, { prepListStatus: "finalized" });
    const engine = newEngine(provider);

    const result = await addDish(engine, {
      id: "ed-b",
      dishId: DISH_B,
      quantityServings: 20,
    });
    expect(result.ok).toBe(true);

    // The finalized list must be left exactly as it was — no new rows, no events.
    expect(await itemFor(provider, "pl-1", INV_Y)).toBeUndefined();
    expect(eventNames(result)).not.toContain("PrepListItemCreated");
  });

  it("removing the only dish PRUNES its now-orphaned ingredient row (the deferred leg)", async () => {
    const provider = makeProvider();
    await seedFixture(provider);
    const engine = newEngine(provider);

    // Before: Dish A's ingredient is on the draft list and live.
    expect((await itemFor(provider, "pl-1", INV_X))?.deletedAt).toBeNull();

    const result = await removeDish(engine, { id: "ed-a" });
    expect(result.ok).toBe(true);

    // THE PROOF: with no dish demanding it, the derived row is soft-deleted, and
    // the remove bubbled up — only possible if the middleware dispatched it.
    expect((await itemFor(provider, "pl-1", INV_X))?.deletedAt).toBeTruthy();
    expect(eventNames(result)).toContain("PrepListItemRemoved");
  });

  it("removing one of two dishes sharing an ingredient DECREMENTS it, not prunes", async () => {
    const provider = makeProvider();
    await seedFixture(provider);
    // Make Dish B ALSO demand ingredient X (quantity 5) — so X is shared by A+B.
    await provider("RecipeIngredient").create({
      id: "ri-bx",
      tenantId: TENANT,
      recipeVersionId: VERSION_B,
      ingredientId: ING_X,
      quantity: 5,
      isOptional: false,
      preparationNotes: "",
    } as never);
    const engine = newEngine(provider);

    // Add Dish B (servings 20 → factor 2): X aggregates A(10)+B(10)=20; Y=6.
    await addDish(engine, { id: "ed-b", dishId: DISH_B, quantityServings: 20 });
    expect(Number((await itemFor(provider, "pl-1", INV_X))?.scaledQuantity)).toBe(
      20
    );

    // Remove Dish A: X is still demanded by B → decrement to 10, NOT pruned.
    const result = await removeDish(engine, { id: "ed-a" });
    expect(result.ok).toBe(true);

    const sharedItem = await itemFor(provider, "pl-1", INV_X);
    expect(sharedItem?.deletedAt).toBeNull(); // survived (still demanded)
    expect(Number(sharedItem?.scaledQuantity)).toBe(10); // re-derived from B only
    // Dish B's own ingredient is untouched and present.
    expect((await itemFor(provider, "pl-1", INV_Y))?.deletedAt).toBeNull();
    expect(eventNames(result)).toContain("PrepListItemUpdated");
    expect(eventNames(result)).not.toContain("PrepListItemRemoved");
  });

  it("preserves a hand-added row (no recipeVersionId) when a dish is removed", async () => {
    const provider = makeProvider();
    await seedFixture(provider);
    // A row added by hand — no derivation fingerprint (recipeVersionId == "").
    await provider("PrepListItem").create({
      id: "pli-manual",
      tenantId: TENANT,
      prepListId: "pl-1",
      stationId: "prep-station",
      stationName: "Prep Station",
      ingredientId: "inv-manual",
      ingredientName: "Saffron (chef add)",
      category: "",
      baseQuantity: 1,
      baseUnit: "g",
      scaledQuantity: 1,
      scaledUnit: "g",
      isOptional: false,
      preparationNotes: "",
      allergens: "",
      dietarySubstitutions: "",
      dishId: "",
      dishName: "",
      recipeVersionId: "",
      sortOrder: 99,
      deletedAt: null,
    } as never);
    const engine = newEngine(provider);

    const result = await removeDish(engine, { id: "ed-a" });
    expect(result.ok).toBe(true);

    // The derived row is pruned; the hand-added row is deliberately left alone.
    expect((await itemFor(provider, "pl-1", INV_X))?.deletedAt).toBeTruthy();
    expect((await itemFor(provider, "pl-1", "inv-manual"))?.deletedAt).toBeNull();
  });

  it("does NOT prune from a finalized (locked) prep list on removal", async () => {
    const provider = makeProvider();
    await seedFixture(provider, { prepListStatus: "finalized" });
    const engine = newEngine(provider);

    const result = await removeDish(engine, { id: "ed-a" });
    expect(result.ok).toBe(true);

    // The finalized list's items are untouched — no soft-delete, no events.
    expect((await itemFor(provider, "pl-1", INV_X))?.deletedAt).toBeNull();
    expect(eventNames(result)).not.toContain("PrepListItemRemoved");
  });
});
