/**
 * Invoice → CollectionCase recovery rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `finance/invoice-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up an Invoice's RESOLVED collection cases over the
 * existing `hasMany collectionCases: CollectionCase` back-relation:
 *     resolvedCollectionCaseCount = count_of(filter(self.collectionCases, c => c.status == "RESOLVED"))
 *     recoveredCollectionAmount   = sum(filter(self.collectionCases, c => c.status == "RESOLVED"), c => c.collectedAmount)
 *
 * The RESOLVED filter carries the business meaning, and that is exactly what
 * silently rots:
 *   - drop the filter and the rollup would count/sum ACTIVE/IN_PROGRESS/LEGAL/
 *     DISPUTED (still-open) and WRITTEN_OFF/DEFAULTED/CANCELLED (never-recovered)
 *     cases — overstating dollars actually recovered through collections;
 *   - flip the predicate literal (e.g. "RESOLVED" -> "ACTIVE") and the rollup
 *     quietly reports open exposure instead of realized recovery, with no compile
 *     error.
 * The money leg projects `collectedAmount` (realized cash recovered on a resolved
 * case), NOT `originalAmount`/`outstandingAmount` — those describe the debt, not
 * what was collected. A literal/relationship/predicate/selector change is a
 * behavior change; this test fails when any of those drift.
 *
 * This is the complementary lens to Client.overdueBalanceTotal (open AR exposure):
 * the collections that were worked to recovery. These are IR-only computeds (no
 * stored Prisma column, no migration) — this test locks that they live in
 * `computedProperties`, never the stored `properties` list, and that they read the
 * `collectionCases` relationship, not `payments` (the sibling payment rollups).
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

describe("Invoice → CollectionCase recovery computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  const invoice = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Invoice"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (invoice?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (invoice?.properties ?? []).map((p: { name: string }) => p.name);

  it("Invoice entity exists in the compiled IR", () => {
    expect(invoice).toBeDefined();
  });

  it("resolvedCollectionCaseCount counts ONLY RESOLVED collection cases (int, request-cached)", () => {
    const c = computed("resolvedCollectionCaseCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("collectionCases"); // NOT payments
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("RESOLVED"); // not ACTIVE/WRITTEN_OFF/etc.
  });

  it("recoveredCollectionAmount sums RESOLVED cases' collectedAmount (money, request-cached)", () => {
    const c = computed("recoveredCollectionAmount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("collectionCases"); // NOT payments
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("RESOLVED");

    // sum projects collectedAmount (realized recovery), not originalAmount/outstandingAmount
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("collectedAmount");
  });

  it("count and sum are DISTINCT facets over the SAME RESOLVED filter", () => {
    const count = computed("resolvedCollectionCaseCount");
    const sum = computed("recoveredCollectionAmount");
    // count_of takes one arg (the filtered collection); sum takes a second
    // value-selector lambda — so they are not duplicates of each other.
    expect(count.expression.args?.length).toBe(1);
    expect(sum.expression.args?.length).toBe(2);
    // both read the same relationship + filter literal (one coherent recovery story)
    expect(decodeAggregate(count.expression).relationship).toBe(
      decodeAggregate(sum.expression).relationship
    );
    expect(decodeAggregate(count.expression).predicateLiteral).toBe(
      decodeAggregate(sum.expression).predicateLiteral
    );
  });

  it("rollups are computeds, never stored Prisma columns (no migration)", () => {
    for (const name of [
      "resolvedCollectionCaseCount",
      "recoveredCollectionAmount",
    ]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
    // the sibling payment rollups stay computeds too — these read a different child.
    expect(computed("totalPaidAmount")).toBeDefined();
  });
});
