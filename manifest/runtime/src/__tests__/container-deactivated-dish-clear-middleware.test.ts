/**
 * Middleware conformance — `ContainerDeactivated → clear Dish.defaultContainerId`
 * (IMPLEMENTATION_PLAN: Core / cross-cutting orphan events, line-186 cluster).
 *
 * WHY this matters (not just WHAT it does): before this, `ContainerDeactivated` had ZERO
 * consumers. Deactivating a container left every `Dish` whose `defaultContainerId`
 * referenced it still pointing at the retired container, so the `belongsTo
 * defaultContainer` relationship resolved a dead reference and plating/packout defaults
 * kept naming a container no longer in circulation. The cascade closes that gap: one
 * governed `Container.deactivate` fans out to `Dish.clearDefaultContainer()` for every
 * dish linked by `defaultContainerId`.
 *
 * The test runs against the REAL compiled IR through the runtime engine WITH the cascade
 * middleware wired (exactly as the factory wires it), so it FAILS LOUDLY when the BUSINESS
 * propagation regresses — a dependent dish left pointing at the dead container, an
 * unrelated/already-cleared/soft-deleted dish wrongly touched, or the engine ceasing to
 * dispatch — not merely on a shape change (CLAUDE.md Rule 9; constitution §13). It also
 * regression-locks that nobody re-expresses this 1:N fan-out as a (dead) IR reaction, and
 * that the new `Dish.clearDefaultContainer` command exists in the IR.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "@angriff36/manifest";
import { describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { createContainerDeactivatedDishClearMiddleware } from "../middleware/container-deactivated-dish-clear-middleware.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";

const here = dirname(fileURLToPath(import.meta.url));
const irPath = join(here, "..", "..", "..", "ir", "kitchen.ir.json");
// biome-ignore lint/suspicious/noExplicitAny: IR is structural JSON; engine accepts it.
const ir: any = JSON.parse(readFileSync(irPath, "utf8"));

const TENANT = "t-container-deactivate";
// admin satisfies Container.deactivate (kitchen_staff/kitchen_lead/inventory_manager/
// manager/admin) AND Dish.clearDefaultContainer (staff/kitchen_staff/kitchen_lead/
// manager/admin) — the natural, aligned actor in the intersection of both policies.
const USER = { id: "u-admin", tenantId: TENANT, role: "admin" } as const;

const CONTAINER_ID = "cont-001";

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

/** Engine wired with the container-deactivated dish-clear middleware (as the factory does). */
function newEngine(provider: (entity: string) => Store): ManifestRuntimeEngine {
  let engine: ManifestRuntimeEngine;
  const middleware = [
    createContainerDeactivatedDishClearMiddleware({
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

async function seedContainer(
  provider: (entity: string) => Store,
  id = CONTAINER_ID
) {
  // Satisfy Container's entity-level block constraints (requireName /
  // positiveVolume / positiveWeight / positivePortions) so deactivate's
  // isActive mutate is not silently dropped on persist
  // ([[mutate-persist-dropped-by-block-constraints]]).
  await provider("Container").create({
    id,
    tenantId: TENANT,
    name: "Half Pan",
    containerType: "pan",
    capacityVolumeMl: 0,
    capacityWeightG: 0,
    capacityPortions: 0,
    isReusable: true,
    isActive: true,
  } as never);
}

let dishSeq = 0;
async function seedDish(
  provider: (entity: string) => Store,
  overrides: {
    id: string;
    defaultContainerId?: string;
    isActive?: boolean;
    deletedAt?: number;
  }
) {
  dishSeq += 1;
  // Satisfy EVERY Dish entity-level block constraint (validName / positivePrice /
  // positiveCost / positiveMin|MaxLeadDays / leadDaysOrder / validSeasonMonths) — a
  // missing numeric field is `undefined >= 0 == false`, which on persist silently
  // DROPS clearDefaultContainer's mutate while the command still "succeeds"
  // ([[mutate-persist-dropped-by-block-constraints]]).
  await provider("Dish").create({
    id: overrides.id,
    tenantId: TENANT,
    recipeId: `recipe-${dishSeq}`,
    name: `Dish ${dishSeq}`,
    defaultContainerId:
      overrides.defaultContainerId ?? CONTAINER_ID,
    pricePerPerson: 0,
    costPerPerson: 0,
    minPrepLeadDays: 0,
    maxPrepLeadDays: 0,
    seasonStartMonth: 0,
    seasonEndMonth: 0,
    isActive: overrides.isActive ?? true,
    isSeasonal: false,
    isEightySix: false,
    ...(overrides.deletedAt != null ? { deletedAt: overrides.deletedAt } : {}),
  } as never);
}

function deactivateContainer(
  engine: ManifestRuntimeEngine,
  containerId = CONTAINER_ID
) {
  return runManifestCommandCore(
    { createRuntime: async () => engine },
    {
      entity: "Container",
      command: "deactivate",
      body: { id: containerId, tenantId: TENANT, reason: "retired", userId: USER.id },
      user: { ...USER },
    }
  );
}

// biome-ignore lint/suspicious/noExplicitAny: structural event rows.
function eventNames(result: any): string[] {
  return (result.ok ? result.events : [])?.map((e: { name: string }) => e.name) ?? [];
}

async function containerOf(
  provider: (entity: string) => Store,
  id: string
): Promise<unknown> {
  const row = (await provider("Dish").getById(id)) as Record<string, unknown>;
  return row?.defaultContainerId;
}

describe("Middleware conformance: ContainerDeactivated → clear Dish.defaultContainerId", () => {
  it("the compiled IR carries NO ContainerDeactivated→X reaction (it is a 1:N middleware cascade)", () => {
    const reactions: Record<string, unknown>[] = ir.reactions ?? [];
    const stale = reactions.filter((r) => r.event === "ContainerDeactivated");
    // A regression here means someone tried to express this fan-out as a reaction,
    // which structurally cannot resolve the many dependent dishes — it must stay
    // middleware.
    expect(stale).toHaveLength(0);
  });

  it("the IR declares the Dish.clearDefaultContainer command the cascade depends on", () => {
    const dish = (ir.entities as { name: string; commands: string[] }[]).find(
      (e) => e.name === "Dish"
    );
    expect(dish?.commands).toContain("clearDefaultContainer");
  });

  it("deactivating a container clears the default-container reference on every dish that points at it, leaving other containers' dishes alone", async () => {
    const provider = makeProvider();
    await seedContainer(provider);
    await seedDish(provider, { id: "dish-a" });
    await seedDish(provider, { id: "dish-b" });
    // A dish whose default container is a DIFFERENT one MUST NOT be touched.
    await seedDish(provider, {
      id: "dish-other",
      defaultContainerId: "cont-999",
    });

    const engine = newEngine(provider);
    const result = await deactivateContainer(engine);
    expect(result.ok).toBe(true);

    // THE PROOF: every dependent dish now has an empty default container.
    expect(await containerOf(provider, "dish-a")).toBe("");
    expect(await containerOf(provider, "dish-b")).toBe("");
    // The unrelated container's dish is untouched.
    expect(await containerOf(provider, "dish-other")).toBe("cont-999");

    // The container itself reached the deactivated state.
    const container = (await provider("Container").getById(CONTAINER_ID)) as Record<
      string,
      unknown
    >;
    expect(container.isActive).toBe(false);

    // Secondary proof: DishDefaultContainerCleared bubbled up exactly twice — only
    // possible if the cascade actually dispatched the governed clear command for both.
    const names = eventNames(result);
    expect(names).toContain("ContainerDeactivated");
    expect(
      names.filter((n) => n === "DishDefaultContainerCleared")
    ).toHaveLength(2);
  });

  it("clears an inactive dish but never touches dishes with no/other default container or soft-deleted dishes (guard-safe)", async () => {
    const provider = makeProvider();
    await seedContainer(provider);
    // An inactive (deactivated) dish STILL holds a dangling reference → must be cleared.
    await seedDish(provider, { id: "dish-inactive", isActive: false });
    // Already-empty default container: clearDefaultContainer guards
    // defaultContainerId != "", so dispatching would be a swallowed no-op — the
    // middleware filter (matches CONTAINER_ID) is what keeps it out entirely.
    await seedDish(provider, { id: "dish-empty", defaultContainerId: "" });
    // Soft-deleted dish pointing at the container: filtered out (deletedAt != null).
    await seedDish(provider, { id: "dish-deleted", deletedAt: Date.now() });
    // One genuinely-active dependent dish proves the cascade still ran.
    await seedDish(provider, { id: "dish-live" });

    const engine = newEngine(provider);
    const result = await deactivateContainer(engine);
    expect(result.ok).toBe(true);

    expect(await containerOf(provider, "dish-inactive")).toBe("");
    expect(await containerOf(provider, "dish-live")).toBe("");
    // Untouched: empty stays empty, soft-deleted keeps its reference (not dispatched).
    expect(await containerOf(provider, "dish-empty")).toBe("");
    expect(await containerOf(provider, "dish-deleted")).toBe(CONTAINER_ID);

    // Exactly two dishes (inactive + live) produced a clear event.
    expect(
      eventNames(result).filter((n) => n === "DishDefaultContainerCleared")
    ).toHaveLength(2);
  });
});
