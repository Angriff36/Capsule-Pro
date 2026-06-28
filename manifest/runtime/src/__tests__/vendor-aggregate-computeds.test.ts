/**
 * Vendor aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `vendor-rules.manifest` declares two runtime-only (request-cached) aggregate
 * computeds that roll up a Vendor's VendorContract children (the contracts that
 * name this vendor via `vendorId`, exposed through the `contracts` hasMany):
 *     activeContractCount  = count_of(filter(self.contracts, c => c.status == "active"))
 *     committedAnnualSpend = sum(filter(self.contracts, c => c.status == "active"), c => c.annualSpendCommitment)
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `activeContractCount` would count EVERY contract ever
 *     signed (draft/pending/expired/terminated/cancelled too), turning a live
 *     relationship-depth signal into a meaningless lifetime total, and
 *     `committedAnnualSpend` would book the annual commitments of dead contracts
 *     as current exposure — overstating how much money rides on this vendor;
 *   - flip a predicate literal (e.g. "active" -> "expired") and the rollup quietly
 *     reports the wrong lifecycle facet with no compile error.
 * A literal/relationship/predicate change is a behavior change; this test fails
 * when any of those drift, so the rollups can't degrade unnoticed.
 *
 * The two legs share the same `status == "active"` filter ON PURPOSE — they answer
 * "how many live agreements, and what annual spend do they commit" — so the count
 * leg and the money leg are NOT a duplicate: they differ in aggregate kind
 * (count_of vs sum) and the money leg additionally projects `annualSpendCommitment`
 * via a value-selector lambda. This test asserts that distinction explicitly.
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

describe("Vendor aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const vendor = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Vendor"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (vendor?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (vendor?.properties ?? []).map((p: { name: string }) => p.name);

  it("Vendor entity exists in the compiled IR", () => {
    expect(vendor).toBeDefined();
  });

  it("activeContractCount counts ONLY active contracts (int, request-cached)", () => {
    const c = computed("activeContractCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("contracts");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("active"); // not draft/expired/terminated/cancelled
  });

  it("committedAnnualSpend sums ONLY active contracts' annual commitment (money, request-cached)", () => {
    const c = computed("committedAnnualSpend");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("contracts");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("active"); // not dead-contract commitments

    // sum projects annualSpendCommitment (second arg of sum is the value selector lambda)
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("annualSpendCommitment");
  });

  it("the two legs are distinct facets, not a duplicate (count vs sum over the same active filter)", () => {
    const count = computed("activeContractCount");
    const money = computed("committedAnnualSpend");
    const dCount = decodeAggregate(count.expression);
    const dMoney = decodeAggregate(money.expression);

    // same relationship + same active-contract filter, different aggregate kind...
    expect(dCount.relationship).toBe(dMoney.relationship);
    expect(dCount.predicateLiteral).toBe(dMoney.predicateLiteral);
    expect(dCount.aggregate).not.toBe(dMoney.aggregate);
    // ...and only the money leg carries a value-selector lambda
    expect(count.expression.args?.[1]).toBeUndefined();
    expect(money.expression.args?.[1]?.kind).toBe("lambda");
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["activeContractCount", "committedAnnualSpend"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
