/**
 * LogisticsRoute aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `operations/logistics-all-rules.manifest` declares two runtime-only
 * (request-cached) aggregate computeds that roll up a LogisticsRoute's
 * LogisticsDispatch children (the hasMany `dispatches` back-relation), each
 * FILTERED on a DISTINCT TERMINAL value of the SAME `status` enum:
 *     deliveredDispatchCount = count_of(filter(self.dispatches, d => d.status == "delivered"))
 *     failedDispatchCount    = count_of(filter(self.dispatches, d => d.status == "failed"))
 *
 * The FILTER carries the business meaning, and that is exactly what silently rots:
 *   - drop either filter and the rollup would count EVERY dispatch — turning a
 *     "successful deliveries" / "failed deliveries" signal into meaningless total
 *     dispatch volume (incl. pending/assigned/in_transit that haven't finished);
 *   - flip a literal ("delivered" -> "failed", or to a non-terminal state) and the
 *     rollup quietly reports a DIFFERENT cohort with no compile error;
 *   - point both at the SAME literal and the two facets collapse into a duplicate.
 * The two facets read the SAME property (`status`) but DIFFERENT terminal literals
 * on purpose: `delivered` and `failed` are the two mutually-exclusive END states of
 * the dispatch FSM ("pending"/"assigned"/"in_transit" are still in flight and counted
 * by NEITHER). So one is not the other's restatement — delivered = goods that reached
 * the venue on this route, failed = deliveries that fell over (breakdown / wrong
 * address / access denied). This is a COUNT-ONLY pair (Container / TrainingModule
 * precedent), NOT a count-vs-sum pair — LogisticsDispatch has no money/decimal field,
 * and the route's own distance/duration live on the route, not the dispatch, so there
 * is nothing meaningful to sum here.
 *
 * These are computeds, NOT stored properties — they must never project a Prisma
 * column (verified separately via the schema-drift gate). This test also locks that
 * they live in `computedProperties`, never the stored `properties` list.
 *
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { loadMergedPrecompiledIR } from "../runtime/loadManifests";

// biome-ignore lint/suspicious/noExplicitAny: IR is structural.
type Expr = any;

/** A computed aggregate of the form  AGG( filter(self.REL, x => x.PROP == LIT) [, ...] ). */
interface DecodedAggregate {
  aggregate: string; // "count_of" here
  predicateLiteral: unknown; // RHS literal of the == comparison (string here)
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

  // filter arg 1 = lambda  (x) => x.PROP == LIT
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

describe("LogisticsRoute aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const route = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "LogisticsRoute"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (route?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (route?.properties ?? []).map((p: { name: string }) => p.name);

  it("LogisticsRoute entity exists in the compiled IR", () => {
    expect(route).toBeDefined();
  });

  it("deliveredDispatchCount counts ONLY delivered dispatches (int, request-cached)", () => {
    const c = computed("deliveredDispatchCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("dispatches");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("delivered"); // not every dispatch
  });

  it("failedDispatchCount counts ONLY failed dispatches (int, request-cached)", () => {
    const c = computed("failedDispatchCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("dispatches");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("failed"); // the failure cohort, not delivered
  });

  it("the two facets filter the SAME status on DIFFERENT terminal literals (disjoint, not a duplicate)", () => {
    const delivered = computed("deliveredDispatchCount");
    const failed = computed("failedDispatchCount");
    // both are bare counts over the same relationship + same property, but each
    // filters a DISTINCT terminal status literal — success volume vs failure volume —
    // so one is not the other's restatement.
    expect(callName(delivered.expression)).toBe("count_of");
    expect(callName(failed.expression)).toBe("count_of");
    const d = decodeAggregate(delivered.expression);
    const f = decodeAggregate(failed.expression);
    expect(d.predicateProperty).toBe(f.predicateProperty); // same field: status
    expect(d.predicateLiteral).not.toBe(f.predicateLiteral); // different literals
    // both are bare counts (no value selector) — LogisticsDispatch has no money field.
    expect(delivered.expression.args?.length).toBe(1);
    expect(failed.expression.args?.length).toBe(1);
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["deliveredDispatchCount", "failedDispatchCount"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
