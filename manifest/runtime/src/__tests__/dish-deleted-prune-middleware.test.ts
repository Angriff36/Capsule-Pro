/**
 * Middleware conformance — `DishDeleted → prune open downstream work` (Design B
 * governed soft-delete). Sibling of dish-deactivated-prune-middleware.test.ts.
 *
 * WHY this matters: the product's "Delete" action is a governed soft-delete on
 * the `deletedAt` axis (Dish.softDelete → DishDeleted), SEPARATE from deactivate's
 * `isActive` axis. Deleting a dish must retire the same open downstream work the
 * deactivate prune covers — open PrepTasks (cancel), draft PrepListItems (remove),
 * event menus (EventDish.remove) — otherwise the kitchen keeps prepping a deleted
 * dish. This test runs the REAL compiled IR through the engine with BOTH prune
 * middlewares wired, so it fails loudly if:
 *   - softDelete stops setting deletedAt (delete no longer hides the dish), or
 *   - softDelete wrongly flips isActive (the two lifecycles bled together), or
 *   - the DishDeleted prune stops retiring downstream rows, or
 *   - the deactivate prune wrongly fires on a delete (double-fire / wrong event).
 *
 * Chain proven here:
 *   Dish.softDelete(reason, userId)  (deletedAt null -> now)
 *     → emits DishDeleted (distinct from DishDeactivated; _subject.id = Dish id)
 *     → dish-deleted-prune middleware scans PrepTask/PrepListItem/EventDish by
 *       tenant + dishId → open PrepTasks cancel, non-removed PrepListItems +
 *       EventDishes remove; isActive is NOT touched.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import {
  createDishDeactivatedPruneMiddleware,
  createDishDeletedPruneMiddleware,
} from "../middleware/dish-deactivated-prune-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-dish-delete";
const USER = { id: "u-dish-delete", tenantId: TENANT, role: "admin" } as const;

const DISH_ID = "dish-delete-001";
const OTHER_DISH_ID = "dish-keep-002";

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

/** Engine with BOTH prune middlewares wired, exactly as the runtime factory does. */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const dispatchCommand = (
    commandName: string,
    input: Record<string, unknown>,
    options: Record<string, unknown>
  ) => engine.runCommand(commandName, input, options);
  const middleware = [
    createDishDeactivatedPruneMiddleware({
      storeProvider: provider,
      dispatchCommand,
      onDiagnostic: () => {
        /* no-op */
      },
    }),
    createDishDeletedPruneMiddleware({
      storeProvider: provider,
      dispatchCommand,
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

async function seedDish(provider: (entity: string) => Store, id: string) {
  await provider("Dish").create({
    id,
    tenantId: TENANT,
    recipeId: "recipe-1",
    name: `Dish ${id}`,
    isActive: true,
    pricePerPerson: 0,
    costPerPerson: 0,
    minPrepLeadDays: 0,
    maxPrepLeadDays: 0,
    seasonStartMonth: 0,
    seasonEndMonth: 0,
  } as never);
}

async function seedPrepTask(
  provider: (entity: string) => Store,
  id: string,
  dishId: string,
  status: string
) {
  await provider("PrepTask").create({
    id,
    tenantId: TENANT,
    eventId: "event-1",
    name: `Task ${id}`,
    taskType: "prep",
    status,
    dishId,
    quantityTotal: 0,
    priority: 5,
  } as never);
}

async function seedPrepListItem(
  provider: (entity: string) => Store,
  id: string,
  dishId: string,
  deletedAt: number | null
) {
  await provider("PrepListItem").create({
    id,
    tenantId: TENANT,
    prepListId: "prep-list-1",
    stationId: "station-1",
    stationName: "Garde Manger",
    ingredientId: "ing-1",
    ingredientName: "Tomato",
    dishId,
    scaledQuantity: 0,
    sortOrder: 0,
    deletedAt,
  } as never);
}

async function seedEventDish(
  provider: (entity: string) => Store,
  id: string,
  dishId: string,
  deletedAt: number | null
) {
  await provider("EventDish").create({
    id,
    tenantId: TENANT,
    eventId: "event-1",
    dishId,
    quantityServings: 2,
    deletedAt,
  } as never);
}

function softDeleteDish(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Dish",
      command: "softDelete",
      body: { id: DISH_ID, reason: "Removed from catalog", userId: USER.id },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: DishDeleted → prune open downstream work", () => {
  it("soft-deleting a dish sets deletedAt and leaves isActive untouched (delete and deactivate are separate axes)", async () => {
    const provider = makeProvider();
    await seedDish(provider, DISH_ID);

    const engine = newEngine(provider);
    const result = await softDeleteDish(engine);
    expect(result.ok).toBe(true);

    const dish = (await provider("Dish").getById(DISH_ID)) as Record<
      string,
      unknown
    >;
    // Delete hides via the deletedAt axis (what every list filters on)…
    expect(dish.deletedAt).toBeTruthy();
    // …and does NOT touch the isActive availability axis.
    expect(dish.isActive).toBe(true);
  });

  it("soft-deleting a dish cancels its open prep tasks and removes its prep-list items + event dishes — leaving terminal, already-removed, and other dishes' rows untouched", async () => {
    const provider = makeProvider();
    await seedDish(provider, DISH_ID);

    await seedPrepTask(provider, "pt-open", DISH_ID, "open");
    await seedPrepTask(provider, "pt-done", DISH_ID, "done");
    await seedPrepTask(provider, "pt-other", OTHER_DISH_ID, "open");

    await seedPrepListItem(provider, "pli-active", DISH_ID, null);
    await seedPrepListItem(provider, "pli-gone", DISH_ID, 1000);
    await seedPrepListItem(provider, "pli-other", OTHER_DISH_ID, null);

    await seedEventDish(provider, "ed-active", DISH_ID, null);
    await seedEventDish(provider, "ed-other", OTHER_DISH_ID, null);

    const engine = newEngine(provider);
    const result = await softDeleteDish(engine);
    expect(result.ok).toBe(true);

    const ptOpen = (await provider("PrepTask").getById("pt-open")) as Record<
      string,
      unknown
    >;
    const ptDone = (await provider("PrepTask").getById("pt-done")) as Record<
      string,
      unknown
    >;
    const ptOther = (await provider("PrepTask").getById("pt-other")) as Record<
      string,
      unknown
    >;
    expect(ptOpen.status).toBe("canceled");
    expect(ptDone.status).toBe("done");
    expect(ptOther.status).toBe("open");

    const pliActive = (await provider("PrepListItem").getById(
      "pli-active"
    )) as Record<string, unknown>;
    const pliGone = (await provider("PrepListItem").getById(
      "pli-gone"
    )) as Record<string, unknown>;
    const pliOther = (await provider("PrepListItem").getById(
      "pli-other"
    )) as Record<string, unknown>;
    expect(pliActive.deletedAt).toBeTruthy();
    expect(pliGone.deletedAt).toBe(1000);
    expect(pliOther.deletedAt == null).toBe(true);

    const edActive = (await provider("EventDish").getById(
      "ed-active"
    )) as Record<string, unknown>;
    const edOther = (await provider("EventDish").getById("ed-other")) as Record<
      string,
      unknown
    >;
    expect(edActive.deletedAt).toBeTruthy();
    expect(edOther.deletedAt == null).toBe(true);

    // The DELETE event bubbles the downstream retirements up — proving the
    // dish-deleted prune (not the deactivate one) executed.
    const names = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(names).toContain("DishDeleted");
    expect(names).toContain("PrepTaskCanceled");
    expect(names).toContain("PrepListItemRemoved");
    expect(names).toContain("EventDishRemoved");
    // The deactivate event must NOT be emitted by a delete.
    expect(names).not.toContain("DishDeactivated");
  });
});
