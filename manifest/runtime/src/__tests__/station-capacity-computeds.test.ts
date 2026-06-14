/**
 * Station capacity computeds + constraints — regression + runtime conformance.
 *
 * WHY this matters (not just WHAT it does):
 *
 * 1. `station-rules.manifest` shipped two computeds hardcoded to the literal `0`:
 *        computed capacityRemaining: int = 0
 *        computed availablePercentage: int = 0
 *    so `availablePercentage` (utilization) was a constant 0% for any reader.
 *
 * 2. More seriously, the capacity constraints referenced COMPUTED properties:
 *        warnNearCapacity: ... self.capacityRemaining == 1 ...
 *        blockFull:        ... !self.isAtCapacity
 *    and the runtime does NOT resolve computed properties inside constraint
 *    expressions. Verified against the real ManifestRuntimeEngine + storeProvider
 *    path: `self.capacityRemaining` / `self.isAtCapacity` never resolved, so
 *    `warnNearCapacity` never warned AND `blockFull` never blocked — a capacity-3
 *    station happily accepted a 5th task. Station capacity was entirely unenforced.
 *
 * The fix derives the computeds (for read projections / any computed consumer) AND
 * inlines the equivalent STORED-property expressions into the constraints so they
 * actually evaluate:
 *        capacityRemaining   = capacitySimultaneousTasks - currentTaskCount
 *        availablePercentage = percent(capacityRemaining, capacitySimultaneousTasks)
 *        warnNearCapacity    = (capacitySimultaneousTasks - currentTaskCount) == 1
 *        blockFull           = currentTaskCount < capacitySimultaneousTasks
 *
 * Layers of protection:
 *   1. Regression lock against the REAL compiled IR — fails if a computed reverts to
 *      a literal, or if a capacity constraint ever again references a computed.
 *   2. Runtime evaluation through the production engine path — proves the warn fires
 *      at one-slot-remaining and the block enforces capacity (both previously dead).
 *
 * @vitest-environment node
 */
import type { Store } from "@angriff36/manifest";
import { beforeEach, describe, expect, it } from "vitest";
import { createCustomBuiltins } from "../manifest-builtins.js";
import { runManifestCommandCore } from "../run-manifest-command-core.js";
import { ManifestRuntimeEngine } from "../runtime-engine.js";
import { loadMergedPrecompiledIR } from "../runtime/loadManifests";

// Computed property names on Station — constraints must NEVER reference these
// because the runtime cannot resolve computeds inside constraint expressions.
const STATION_COMPUTEDS = new Set([
  "capacityRemaining",
  "availablePercentage",
  "isAtCapacity",
  "isOverCapacity",
  "isAvailable",
]);

/** Collect every `self.<prop>` member-access name referenced in an expression. */
// biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
function selfPropsReferenced(expr: any, acc = new Set<string>()): Set<string> {
  if (!expr || typeof expr !== "object") {
    return acc;
  }
  if (
    expr.kind === "member" &&
    expr.object?.kind === "identifier" &&
    expr.object?.name === "self" &&
    typeof expr.property === "string"
  ) {
    acc.add(expr.property);
  }
  for (const value of Object.values(expr)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        selfPropsReferenced(v, acc);
      }
    } else if (value && typeof value === "object") {
      selfPropsReferenced(value, acc);
    }
  }
  return acc;
}

// ── 1. Regression lock against the compiled artifact ──────────────────────

describe("Station capacity — compiled IR (regression lock)", () => {
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  let station: any;
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  let assignTask: any;

  beforeEach(() => {
    const { ir } = loadMergedPrecompiledIR();
    station = (ir.entities ?? []).find(
      (e: { name: string }) => e.name === "Station"
    );
    expect(station).toBeDefined();
    assignTask = (ir.commands ?? []).find(
      (c: { entity?: string; name?: string }) =>
        c?.entity === "Station" && c?.name === "assignTask"
    );
    expect(assignTask).toBeDefined();
  });

  const computed = (name: string) =>
    (station.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );

  it("capacityRemaining is derived (capacitySimultaneousTasks - currentTaskCount), not a literal", () => {
    const c = computed("capacityRemaining");
    expect(c).toBeDefined();
    expect(c.expression.kind).not.toBe("literal"); // the exact original bug
    expect(c.expression.kind).toBe("binary");
    expect(c.expression.operator).toBe("-");
    expect(c.expression.left.property).toBe("capacitySimultaneousTasks");
    expect(c.expression.right.property).toBe("currentTaskCount");
  });

  it("availablePercentage is a percent(...) call typed number, not a literal", () => {
    const c = computed("availablePercentage");
    expect(c).toBeDefined();
    expect(c.expression.kind).not.toBe("literal");
    expect(c.expression.kind).toBe("call");
    expect(c.expression.callee.name).toBe("percent");
    expect(c.type.name).toBe("number");
  });

  it("capacity constraints reference only STORED props (runtime can't resolve computeds in constraints)", () => {
    // entity-level warnNearCapacity
    const entityWarn = (station.constraints ?? []).find(
      (c: { name: string }) => c.name === "warnNearCapacity"
    );
    expect(entityWarn).toBeDefined();
    // command-level warnNearCapacity + blockFull
    const cmdConstraints = assignTask.constraints ?? [];
    const cmdWarn = cmdConstraints.find(
      (c: { name: string }) => c.name === "warnNearCapacity"
    );
    const cmdBlock = cmdConstraints.find(
      (c: { name: string }) => c.name === "blockFull"
    );
    expect(cmdWarn).toBeDefined();
    expect(cmdBlock).toBeDefined();

    for (const c of [entityWarn, cmdWarn, cmdBlock]) {
      const refs = selfPropsReferenced(c.expression);
      const computedRefs = [...refs].filter((r) => STATION_COMPUTEDS.has(r));
      expect(computedRefs).toEqual([]); // must be empty — else the constraint is dead
    }
  });
});

// ── 2. Runtime evaluation through the production engine path ───────────────

describe("Station capacity — runtime conformance", () => {
  const TENANT = "11111111-1111-4111-a111-111111111111";
  const USER = { id: "u1", tenantId: TENANT, role: "admin" } as const;

  function makeEngine(): ManifestRuntimeEngine {
    const { ir } = loadMergedPrecompiledIR();
    const stores = new Map<string, Store>();
    const storeProvider = (entity: string): Store => {
      let store = stores.get(entity);
      if (!store) {
        store = makeMemStore();
        stores.set(entity, store);
      }
      return store;
    };
    return new ManifestRuntimeEngine(
      ir,
      { tenantId: TENANT, user: { ...USER } },
      { storeProvider, customBuiltins: createCustomBuiltins() }
    );
  }

  // biome-ignore lint/suspicious/noExplicitAny: in-memory store rows are structural.
  function makeMemStore(): Store {
    const items = new Map<string, Record<string, unknown>>();
    return {
      async getAll() {
        return Array.from(items.values()) as never;
      },
      async getById(id: string) {
        return items.get(id) as never;
      },
      async create(data: any) {
        const id = (data.id as string) ?? crypto.randomUUID();
        const row = { ...data, id };
        items.set(id, row);
        return row as never;
      },
      async update(id: string, data: any) {
        const existing = items.get(id);
        if (!existing) {
          return undefined as never;
        }
        const row = { ...existing, ...data, id };
        items.set(id, row);
        return row as never;
      },
      async delete(id: string) {
        return items.delete(id);
      },
      async clear() {
        items.clear();
      },
    } as Store;
  }

  // biome-ignore lint/suspicious/noExplicitAny: engine is structural here.
  let engine: any;

  beforeEach(() => {
    engine = makeEngine();
  });

  const run = (command: string, body: Record<string, unknown>) =>
    runManifestCommandCore(
      { createRuntime: async () => engine },
      { entity: "Station", command, body, user: { ...USER } }
    );

  async function seedStation(capacity: number, id = "s1") {
    const res = await run("create", {
      id,
      tenantId: TENANT,
      locationId: "loc1",
      name: "Grill",
      stationType: "hot-line",
      capacitySimultaneousTasks: capacity,
      equipmentList: [],
      notes: "",
    });
    expect(res.ok).toBe(true);
    return id;
  }

  const warnOf = (
    // biome-ignore lint/suspicious/noExplicitAny: structural result.
    res: any
  ) =>
    (res.constraintOutcomes ?? []).find(
      (o: { constraintName: string }) => o.constraintName === "warnNearCapacity"
    );

  it("warnNearCapacity fires exactly when one slot remains (was permanently dead)", async () => {
    const id = await seedStation(3);

    // Pre-mutate state drives the constraint: current 0 -> 1 -> 2.
    const a1 = await run("assignTask", { id, tenantId: TENANT, taskId: "x1", taskName: "x1" });
    const a2 = await run("assignTask", { id, tenantId: TENANT, taskId: "x2", taskName: "x2" });
    // x3 evaluates against current=2 (remaining 1) -> warn fires.
    const a3 = await run("assignTask", { id, tenantId: TENANT, taskId: "x3", taskName: "x3" });

    expect(warnOf(a1)?.passed).toBe(false); // remaining 3
    expect(warnOf(a2)?.passed).toBe(false); // remaining 2
    expect(a3.ok).toBe(true);
    expect(warnOf(a3)?.passed).toBe(true); // remaining 1 — the previously-dead warning
    // The warn's resolved details expose the live counts (stored props).
    expect(warnOf(a3)?.details?.current).toBe(2);
    expect(warnOf(a3)?.details?.max).toBe(3);
  });

  it("blockFull enforces capacity — the 4th assign on a capacity-3 station is blocked (was never enforced)", async () => {
    const id = await seedStation(3);

    for (const t of ["x1", "x2", "x3"]) {
      const ok = await run("assignTask", { id, tenantId: TENANT, taskId: t, taskName: t });
      expect(ok.ok).toBe(true);
    }
    const overflow = await run("assignTask", {
      id,
      tenantId: TENANT,
      taskId: "x4",
      taskName: "x4",
    });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) {
      expect(overflow.kind).toBe("constraint_blocked");
    }
  });
});
