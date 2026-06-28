/**
 * Lead aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `lead-rules.manifest` declares two runtime-only (request-cached) aggregate
 * computeds that roll up a Lead's sales-pipeline children:
 *     wonDealCount          = count_of(filter(self.deals,     d => d.status == "won"))
 *     acceptedProposalValue = sum(filter(self.proposals, p => p.status == "accepted"), p => p.total)
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `wonDealCount` would count EVERY deal (open/lost/abandoned
 *     too), overstating conversion, and `acceptedProposalValue` would sum draft/
 *     sent/rejected proposals, overstating booked pipeline value;
 *   - flip a predicate literal (e.g. "won" -> "open", or "accepted" -> "sent") and
 *     the rollup quietly reports the wrong number with no compile error.
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

describe("Lead aggregate computeds — compiled IR (regression lock)", () => {
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  const lead = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Lead"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (lead?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (lead?.properties ?? []).map((p: { name: string }) => p.name);

  it("Lead entity exists in the compiled IR", () => {
    expect(lead).toBeDefined();
  });

  it("wonDealCount counts ONLY won deals (int, request-cached)", () => {
    const c = computed("wonDealCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("deals");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("won"); // not open/lost/abandoned
  });

  it("acceptedProposalValue sums ONLY accepted proposals' total (money, request-cached)", () => {
    const c = computed("acceptedProposalValue");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("proposals");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("accepted"); // not draft/sent/rejected

    // sum projects total (second arg of sum is the value selector lambda)
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("total");
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["wonDealCount", "acceptedProposalValue"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
