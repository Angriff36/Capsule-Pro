/**
 * Middleware conformance — `DishDeactivated → prune open downstream work`
 * (IMPLEMENTATION_PLAN P1, Kitchen → "Dish/Ingredient lifecycle propagation").
 *
 * WHY this matters (not just WHAT it does): deactivating a dish is a PERMANENT
 * discontinue, and the command itself warns the operator to "verify it is not on
 * any active menus". But `DishDeactivated` (dish-rules.manifest:292) had ZERO
 * consumers — so a discontinued dish stayed live on every open PrepTask, draft
 * PrepListItem, and event menu (EventDish) that referenced it. The kitchen kept
 * prepping a dish no longer offered and event menus kept showing it: a stale,
 * food-relevant dead-end. This middleware closes that leg by dispatching the
 * EXISTING governed retirement command on each downstream row keyed by `dishId`:
 * PrepTask.cancel, PrepListItem.remove, EventDish.remove.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the
 * middleware wired, so it FAILS LOUDLY if the propagation regresses — a row not
 * retired, an unrelated dish's row wrongly touched, a terminal row re-touched, or
 * the engine stops dispatching — i.e. it fails when the BUSINESS propagation
 * breaks, not on a shape change (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that nobody re-expresses this 1:N fan-out as a (dead) IR
 * reaction, and that the TRANSIENT eightySix leg stays deliberately unwired.
 *
 * Chain proven here:
 *   Dish.deactivate(reason, userId)  (isActive true -> false)
 *     → emits DishDeactivated (_subject.id = the Dish id; payload.reason/userId)
 *     → middleware scans PrepTask/PrepListItem/EventDish by tenant + dishId
 *     → open PrepTasks cancel, non-removed PrepListItems + EventDishes remove;
 *       done/canceled tasks, already-removed rows, and OTHER dishes' rows are
 *       left untouched, and each downstream event bubbles up.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createDishDeactivatedPruneMiddleware } from "../middleware/dish-deactivated-prune-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-dish-prune";
// admin satisfies Dish.deactivate AND every downstream retirement command's policy.
const USER = { id: "u-dish-prune", tenantId: TENANT, role: "admin" } as const;

const DISH_ID = "dish-prune-001";
const OTHER_DISH_ID = "dish-keep-002";

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

/** Build the engine with the DishDeactivated→prune middleware wired (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createDishDeactivatedPruneMiddleware({
      storeProvider: provider,
      dispatchCommand: (commandName, input, options) =>
        engine.runCommand(commandName, input, options),
      // Silence the default console.warn diagnostics in tests.
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

async function seedActiveDish(provider: (entity: string) => Store, id: string) {
  // Seed directly via the store so the test isolates the deactivate → middleware
  // chain. deactivate guards `self.isActive`; every bare Dish constraint
  // (validName, positivePrice, …) must hold on the merged row or the engine
  // silently drops deactivate's isActive mutate.
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
    // Bare PrepTask constraints (positiveQuantity, validPriority) must hold on the
    // merged row for cancel's status mutate to persist.
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

function deactivateDish(engine: ManifestRuntimeEngine) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Dish",
      command: "deactivate",
      body: { id: DISH_ID, reason: "Discontinued for menu refresh", userId: USER.id },
      user: { ...USER },
    }
  );
}

describe("Middleware conformance: DishDeactivated → prune open downstream work", () => {
  it("the compiled IR carries NO DishDeactivated→{PrepTask,PrepListItem,EventDish} reaction (it is a 1:N middleware)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter(
      (r) =>
        r.event === "DishDeactivated" &&
        ((r.targetEntity === "PrepTask" && r.targetCommand === "cancel") ||
          (r.targetEntity === "PrepListItem" && r.targetCommand === "remove") ||
          (r.targetEntity === "EventDish" && r.targetCommand === "remove"))
    );
    // A regression here means someone tried to express this cross-entity fan-out
    // as a reaction, which structurally cannot resolve the many rows — it must
    // stay middleware.
    expect(stale).toHaveLength(0);
  });

  it("the TRANSIENT eightySix leg stays unwired: no DishEightySixed prune reaction exists", () => {
    // eightySix is reversible (Dish.reinstate) with no restore-on-reinstate
    // provenance, so it is deliberately NOT wired to irreversible pruning. Lock
    // that nobody silently adds it as a reaction without the date-scoping +
    // restore prerequisites (see the middleware header / IMPLEMENTATION_PLAN).
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const eightySixPrune = reactions.filter(
      (r) =>
        r.event === "DishEightySixed" &&
        (r.targetEntity === "PrepTask" ||
          r.targetEntity === "PrepListItem" ||
          r.targetEntity === "EventDish")
    );
    expect(eightySixPrune).toHaveLength(0);
  });

  it("deactivating a dish cancels its open prep tasks and removes its prep-list items + event dishes — leaving terminal, already-removed, and other dishes' rows untouched", async () => {
    const provider = makeProvider();
    await seedActiveDish(provider, DISH_ID);

    // PrepTasks: one open (→canceled), one done (terminal, untouched), one open
    // for a DIFFERENT dish (untouched).
    await seedPrepTask(provider, "pt-open", DISH_ID, "open");
    await seedPrepTask(provider, "pt-done", DISH_ID, "done");
    await seedPrepTask(provider, "pt-other", OTHER_DISH_ID, "open");

    // PrepListItems: one active (→removed), one already-removed (untouched), one
    // for a different dish (untouched).
    await seedPrepListItem(provider, "pli-active", DISH_ID, null);
    await seedPrepListItem(provider, "pli-gone", DISH_ID, 1000);
    await seedPrepListItem(provider, "pli-other", OTHER_DISH_ID, null);

    // EventDishes: one active (→removed), one for a different dish (untouched).
    await seedEventDish(provider, "ed-active", DISH_ID, null);
    await seedEventDish(provider, "ed-other", OTHER_DISH_ID, null);

    const engine = newEngine(provider);
    const result = await deactivateDish(engine);
    expect(result.ok).toBe(true);

    // The dish itself is now deactivated.
    const dish = (await provider("Dish").getById(DISH_ID)) as Record<
      string,
      unknown
    >;
    expect(dish.isActive).toBe(false);

    // PrepTasks: open one canceled; done untouched; other-dish untouched.
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

    // PrepListItems: active removed; already-removed unchanged; other untouched.
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

    // EventDishes: dish's removed; other-dish untouched.
    const edActive = (await provider("EventDish").getById(
      "ed-active"
    )) as Record<string, unknown>;
    const edOther = (await provider("EventDish").getById("ed-other")) as Record<
      string,
      unknown
    >;
    expect(edActive.deletedAt).toBeTruthy();
    expect(edOther.deletedAt == null).toBe(true);

    // Secondary proof: each downstream retirement event bubbles up into the
    // parent command's emitted events — only possible if the middleware executed.
    const names = (result.ok ? result.events : [])?.map(
      // biome-ignore lint/suspicious/noExplicitAny: structural event rows.
      (e: any) => e?.name
    );
    expect(names).toContain("PrepTaskCanceled");
    expect(names).toContain("PrepListItemRemoved");
    expect(names).toContain("EventDishRemoved");
  });

  it("deactivating a dish with no downstream references succeeds and changes nothing else", async () => {
    const provider = makeProvider();
    await seedActiveDish(provider, DISH_ID);
    // A single unrelated event-dish for a different dish — must stay untouched.
    await seedEventDish(provider, "ed-unrelated", OTHER_DISH_ID, null);

    const engine = newEngine(provider);
    const result = await deactivateDish(engine);
    expect(result.ok).toBe(true);

    const dish = (await provider("Dish").getById(DISH_ID)) as Record<
      string,
      unknown
    >;
    expect(dish.isActive).toBe(false);

    const edUnrelated = (await provider("EventDish").getById(
      "ed-unrelated"
    )) as Record<string, unknown>;
    expect(edUnrelated.deletedAt == null).toBe(true);
  });
});
