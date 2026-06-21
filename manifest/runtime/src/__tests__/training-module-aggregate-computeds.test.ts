/**
 * TrainingModule aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `staff/training-module-rules.manifest` declares two runtime-only
 * (request-cached) aggregate computeds that roll up a TrainingModule's
 * TrainingAttempt children (the hasMany `attempts` back-relation), each FILTERED
 * on a DISTINCT boolean facet of the attempt:
 *     passedAttemptCount         = count_of(filter(self.attempts, a => a.passed == true))
 *     managerReviewAttemptCount  = count_of(filter(self.attempts, a => a.managerReviewRequired == true))
 *
 * The FILTER carries the business meaning, and that is exactly what silently rots:
 *   - drop either filter and the rollup would count EVERY attempt — turning a
 *     "successful completions" / "escalated to manager review" signal into a
 *     meaningless total attempt volume;
 *   - flip a predicate boolean (true -> false) and the rollup quietly reports the
 *     COMPLEMENT (failed attempts, or attempts that did NOT need review) with no
 *     compile error;
 *   - point both at the SAME property and the two facets collapse into a duplicate.
 * The two facets read DIFFERENT TrainingAttempt properties on purpose:
 * `passedAttemptCount` = training effectiveness (how many attempts passed across
 * all staff for this module); `managerReviewAttemptCount` = compliance-risk volume
 * (final failures that escalated to manager review). This is the Container-style
 * disjoint-facet count pair, NOT a count-vs-sum pair — TrainingAttempt has no
 * money/decimal field, and summing scorePercent (a percentage) would be meaningless,
 * so both legs are bare counts over distinct boolean predicates.
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
  predicateLiteral: unknown; // RHS literal of the == comparison (boolean here)
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

describe("TrainingModule aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const trainingModule = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "TrainingModule"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (trainingModule?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (trainingModule?.properties ?? []).map((p: { name: string }) => p.name);

  it("TrainingModule entity exists in the compiled IR", () => {
    expect(trainingModule).toBeDefined();
  });

  it("passedAttemptCount counts ONLY passing attempts (int, request-cached)", () => {
    const c = computed("passedAttemptCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("attempts");
    expect(decoded.predicateProperty).toBe("passed"); // not every attempt
    expect(decoded.predicateLiteral).toBe(true); // passing, not failing
  });

  it("managerReviewAttemptCount counts ONLY escalated attempts (int, request-cached)", () => {
    const c = computed("managerReviewAttemptCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("attempts");
    expect(decoded.predicateProperty).toBe("managerReviewRequired"); // compliance risk
    expect(decoded.predicateLiteral).toBe(true); // escalated, not cleared
  });

  it("the two facets read DIFFERENT predicate properties (disjoint facets, not a duplicate)", () => {
    const passed = computed("passedAttemptCount");
    const review = computed("managerReviewAttemptCount");
    // both are bare counts over the same relationship, but each filters a DISTINCT
    // boolean property — pass volume vs escalation volume — so one is not the other's
    // restatement.
    expect(callName(passed.expression)).toBe("count_of");
    expect(callName(review.expression)).toBe("count_of");
    expect(decodeAggregate(passed.expression).predicateProperty).not.toBe(
      decodeAggregate(review.expression).predicateProperty
    );
    // both are bare counts (no value selector) — TrainingAttempt has no money field.
    expect(passed.expression.args?.length).toBe(1);
    expect(review.expression.args?.length).toBe(1);
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["passedAttemptCount", "managerReviewAttemptCount"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
