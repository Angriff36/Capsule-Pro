/**
 * Vehicle aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `logistics-all-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a Vehicle's route children:
 *     activeRouteCount       = count_of(filter(self.routes, r => r.status == "in_progress"))
 *     completedRouteDistance = sum(filter(self.routes, r => r.status == "completed"), r => r.totalDistance)
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `activeRouteCount` would count EVERY route
 *     (planned/in_progress/completed/cancelled too), overstating the vehicle's
 *     live workload, and `completedRouteDistance` would sum planned-route
 *     distance estimates that may still change, overstating distance driven;
 *   - flip a predicate literal (e.g. "in_progress" -> "planned", or
 *     "completed" -> "in_progress") and the rollup quietly reports the wrong
 *     number with no compile error.
 * A literal/relationship/predicate change is a behavior change; this test fails
 * when any of those drift, so the rollups can't degrade unnoticed.
 *
 * These are computeds, NOT stored properties — they must never project a Prisma
 * column (verified separately via the schema-drift gate). This test also locks
 * that they live in `computedProperties`, never the stored `properties` list.
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

describe("Vehicle aggregate computeds — compiled IR (regression lock)", () => {
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  const vehicle = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Vehicle"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (vehicle?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (vehicle?.properties ?? []).map((p: { name: string }) => p.name);

  it("Vehicle entity exists in the compiled IR", () => {
    expect(vehicle).toBeDefined();
  });

  it("activeRouteCount counts ONLY in-progress routes (int, request-cached)", () => {
    const c = computed("activeRouteCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("routes");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("in_progress"); // not planned/completed/cancelled
  });

  it("completedRouteDistance sums ONLY completed routes' distance (decimal, request-cached)", () => {
    const c = computed("completedRouteDistance");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("decimal");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("routes");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("completed"); // not planned estimates

    // sum projects totalDistance (second arg of sum is the value selector lambda)
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("totalDistance");
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["activeRouteCount", "completedRouteDistance"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
