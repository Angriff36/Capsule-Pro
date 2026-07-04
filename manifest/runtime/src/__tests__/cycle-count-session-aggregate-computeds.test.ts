/**
 * CycleCountSession aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `cycle-count-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a CycleCountSession's VarianceReport children:
 *     pendingVarianceReportCount = count_of(filter(self.varianceReports, v => v.status == "pending"))
 *     adjustedVarianceAmount     = sum(filter(self.varianceReports, v => v.status == "adjusted"), v => v.adjustmentAmount)
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `pendingVarianceReportCount` would count EVERY variance
 *     report (reviewed/approved/adjusted/rejected too), overstating the unresolved
 *     reconciliation backlog, and `adjustedVarianceAmount` would sum the adjustment
 *     figures on reports that were never booked (pending/approved/rejected),
 *     overstating the realized inventory-adjustment value;
 *   - flip a predicate literal (e.g. "pending" -> "reviewed", or "adjusted" -> "approved")
 *     and the rollup quietly reports the wrong number with no compile error.
 * The money leg projects `adjustmentAmount` ONLY for status=="adjusted" reports —
 * the realized, booked adjustment, NOT the figures sitting on pending/approved
 * reports that may never be applied (or on rejected reports that carry none). A
 * literal/relationship/property change is a behavior change; this test fails when
 * any of those drift.
 *
 * These are computeds, NOT stored properties — they must never project a Prisma
 * column (verified separately via the schema-drift gate). This test also locks
 * that they live in `computedProperties`, never the stored `properties` list.
 *
 * Mirrors the Facility.openWorkOrderCount/completedWorkOrderCost precedent over
 * FacilityWorkOrder (pending=open backlog, adjusted=realized spend); here the
 * parent is CycleCountSession and the child is VarianceReport (back-relation via
 * VarianceReport.belongsTo session through the hasMany varianceReports relation).
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

describe("CycleCountSession aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  const session = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "CycleCountSession"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (session?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (session?.properties ?? []).map((p: { name: string }) => p.name);

  it("CycleCountSession entity exists in the compiled IR", () => {
    expect(session).toBeDefined();
  });

  it("pendingVarianceReportCount counts ONLY pending variance reports (int, request-cached)", () => {
    const c = computed("pendingVarianceReportCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("varianceReports");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("pending"); // not reviewed/approved/adjusted/rejected
  });

  it("adjustedVarianceAmount sums ONLY adjusted reports' adjustmentAmount (money, request-cached)", () => {
    const c = computed("adjustedVarianceAmount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("varianceReports");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("adjusted"); // realized, not pending/approved estimates

    // sum projects adjustmentAmount (second arg of sum is the value selector lambda) —
    // realized booked adjustment value
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("adjustmentAmount");
  });

  it("the two legs are distinct facets (count vs sum; only the money leg has a value selector)", () => {
    const open = computed("pendingVarianceReportCount");
    const cost = computed("adjustedVarianceAmount");
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
    for (const name of [
      "pendingVarianceReportCount",
      "adjustedVarianceAmount",
    ]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
