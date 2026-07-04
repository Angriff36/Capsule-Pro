/**
 * Facility aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `facilities-all-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a Facility's FacilityWorkOrder children:
 *     openWorkOrderCount     = count_of(filter(self.workOrders, w => w.status == "open"))
 *     completedWorkOrderCost = sum(filter(self.workOrders, w => w.status == "completed"), w => w.actualCost)
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `openWorkOrderCount` would count EVERY work order
 *     (assigned/in_progress/completed/cancelled too), overstating the unaddressed
 *     maintenance backlog, and `completedWorkOrderCost` would sum the estimates on
 *     still-open orders, overstating realized maintenance spend;
 *   - flip a predicate literal (e.g. "open" -> "assigned", or "completed" -> "open")
 *     and the rollup quietly reports the wrong number with no compile error.
 * The money leg projects `actualCost` (the cost realized on completion), NOT
 * `estimatedCost` — completed work orders carry the real spend; estimates on open
 * orders are not yet money out the door. A literal/relationship/property change is
 * a behavior change; this test fails when any of those drift.
 *
 * These are computeds, NOT stored properties — they must never project a Prisma
 * column (verified separately via the schema-drift gate). This test also locks
 * that they live in `computedProperties`, never the stored `properties` list.
 *
 * Mirrors the Equipment.openWorkOrderCount/completedWorkOrderCost precedent over
 * MaintenanceWorkOrder; here the parent is Facility and the child is FacilityWorkOrder
 * (back-relation via FacilityWorkOrder.belongsTo facility).
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

describe("Facility aggregate computeds — compiled IR (regression lock)", () => {
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  const facility = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Facility"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (facility?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (facility?.properties ?? []).map((p: { name: string }) => p.name);

  it("Facility entity exists in the compiled IR", () => {
    expect(facility).toBeDefined();
  });

  it("openWorkOrderCount counts ONLY open work orders (int, request-cached)", () => {
    const c = computed("openWorkOrderCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("workOrders");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("open"); // not assigned/in_progress/completed/cancelled
  });

  it("completedWorkOrderCost sums ONLY completed work orders' actual cost (money, request-cached)", () => {
    const c = computed("completedWorkOrderCost");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("workOrders");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("completed"); // not open estimates

    // sum projects actualCost (second arg of sum is the value selector lambda) —
    // realized spend, NOT estimatedCost
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("actualCost");
  });

  it("the two legs are distinct facets (count vs sum; only the money leg has a value selector)", () => {
    const open = computed("openWorkOrderCount");
    const cost = computed("completedWorkOrderCost");
    const openDecoded = decodeAggregate(open.expression);
    const costDecoded = decodeAggregate(cost.expression);

    // same relationship, different aggregate kind + different lifecycle facet
    expect(openDecoded.relationship).toBe(costDecoded.relationship);
    expect(openDecoded.aggregate).not.toBe(costDecoded.aggregate);
    expect(openDecoded.predicateLiteral).not.toBe(costDecoded.predicateLiteral);

    // only the sum leg carries a value-selector lambda
    expect(open.expression.args?.[1]).toBeUndefined();
    expect(cost.expression.args?.[1]?.kind).toBe("lambda");
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["openWorkOrderCount", "completedWorkOrderCost"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
