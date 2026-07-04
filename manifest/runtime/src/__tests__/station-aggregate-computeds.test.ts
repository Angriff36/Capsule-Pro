/**
 * Station → PrepTask open-backlog rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `kitchen/station-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a Station's OPEN prep tasks over the existing
 * `hasMany prepTasks: PrepTask` back-relation:
 *     openPrepTaskCount   = count_of(filter(self.prepTasks, t => t.status == "open"))
 *     openPrepTaskMinutes = sum(filter(self.prepTasks, t => t.status == "open"), t => t.estimatedMinutes)
 *
 * The "open" filter carries the business meaning, and that is exactly what
 * silently rots:
 *   - drop the filter and the rollup would count/sum every in_progress/done/canceled
 *     task too — overstating the still-waiting backlog and folding completed and
 *     cancelled work into a queue-depth/load-balancing signal;
 *   - flip the predicate literal (e.g. "open" -> "done") and the rollup quietly
 *     reports throughput instead of backlog, with no compile error. PrepTaskStatus
 *     is a closed vocabulary (open | pending | in_progress | done | canceled) and
 *     "open" is the real initial/default state (PrepTask.status = open).
 * The minutes leg projects `estimatedMinutes` (each task's planned duration), NOT
 * `servingsTotal` or a quantity field — summing servings/quantity would answer a
 * different question than "remaining prep minutes queued at the station". A
 * literal/relationship/predicate/selector change is a behavior change; this test
 * fails when any of those drift.
 *
 * These rollups are COMPLEMENTARY to the stored `currentTaskCount` (kept by the
 * syncTaskCount middleware at the in_progress/active load): currentTaskCount = work
 * in flight, openPrepTask* = work still waiting. They read `prepTasks`, NOT the
 * sibling `prepListItems` hasMany — this test locks that neither leg can quietly be
 * re-pointed at the wrong child, and that both live in `computedProperties` (no
 * stored Prisma column, no migration).
 *
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { loadMergedPrecompiledIR } from "../runtime/loadManifests";

// biome-ignore lint/suspicious/noExplicitAny: IR is structural.
type Expr = any;

/** A computed aggregate of the form  AGG( filter(self.REL, x => x.PROP == "LIT") [, ...] ). */
interface DecodedAggregate {
  aggregate: string; // "sum" | "count_of"
  predicateLiteral: string; // RHS string literal of the == comparison
  predicateProperty: string; // <param>.<property> in the filter lambda
  relationship: string; // self.<relationship>
}

function callName(expr: Expr): string | undefined {
  return expr?.kind === "call" ? expr.callee?.name : undefined;
}

/** Decode the filtered-aggregate shape, asserting each structural hop exists. */
function decodeAggregate(expr: Expr): DecodedAggregate {
  expect(expr?.kind).toBe("call");
  const aggregate = callName(expr);
  expect(aggregate).toBeDefined();

  // first arg is the filter(...) call
  const filterCall = expr.args?.[0];
  expect(callName(filterCall)).toBe("filter");

  // filter arg 0 = self.<relationship>
  const collection = filterCall.args?.[0];
  expect(collection?.kind).toBe("member");
  expect(collection.object?.name).toBe("self");

  // filter arg 1 = lambda  (x) => x.PROP == "LIT"
  const lambda = filterCall.args?.[1];
  expect(lambda?.kind).toBe("lambda");
  const body = lambda.body;
  expect(body?.kind).toBe("binary");
  expect(body.operator).toBe("==");
  expect(body.left?.kind).toBe("member");
  expect(body.right?.kind).toBe("literal");

  return {
    aggregate: aggregate as string,
    relationship: collection.property,
    predicateProperty: body.left.property,
    predicateLiteral: body.right.value?.value ?? body.right.value,
  };
}

describe("Station → PrepTask open-backlog computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  const station = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Station"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (station?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (station?.properties ?? []).map((p: { name: string }) => p.name);

  it("Station entity exists in the compiled IR", () => {
    expect(station).toBeDefined();
  });

  it("openPrepTaskCount counts ONLY open prep tasks (int, request-cached)", () => {
    const c = computed("openPrepTaskCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("prepTasks"); // NOT prepListItems
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("open"); // backlog, not done
  });

  it("openPrepTaskMinutes sums open tasks' estimatedMinutes (int, request-cached)", () => {
    const c = computed("openPrepTaskMinutes");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("prepTasks"); // NOT prepListItems
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("open");

    // sum projects estimatedMinutes (the task's planned duration), not servingsTotal/quantity
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("estimatedMinutes");
  });

  it("count and sum are DISTINCT facets over the SAME open filter", () => {
    const count = computed("openPrepTaskCount");
    const sum = computed("openPrepTaskMinutes");
    // count_of takes one arg (the filtered collection); sum takes a second
    // value-selector lambda — so they are not duplicates of each other.
    expect(count.expression.args?.length).toBe(1);
    expect(sum.expression.args?.length).toBe(2);
    // both read the same relationship + filter literal (one coherent backlog story)
    expect(decodeAggregate(count.expression).relationship).toBe(
      decodeAggregate(sum.expression).relationship
    );
    expect(decodeAggregate(count.expression).predicateLiteral).toBe(
      decodeAggregate(sum.expression).predicateLiteral
    );
  });

  it("rollups are computeds, never stored Prisma columns (no migration)", () => {
    for (const name of ["openPrepTaskCount", "openPrepTaskMinutes"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
    // the stored currentTaskCount stays a stored prop — the open backlog is a
    // SEPARATE computed lens, it does not replace the in-flight task counter.
    expect(storedPropNames()).toContain("currentTaskCount");
    expect(computed("currentTaskCount")).toBeUndefined();
  });
});
