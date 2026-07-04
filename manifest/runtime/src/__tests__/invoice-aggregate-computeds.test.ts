/**
 * Invoice aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `finance/invoice-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up an Invoice's collected payments:
 *     totalPaidAmount       = sum(filter(self.payments, p => p.status == "COMPLETED"), p => p.amount)
 *     completedPaymentCount = count_of(filter(self.payments, p => p.status == "COMPLETED"))
 *
 * The COMPLETED filter carries the business meaning, and that is exactly what
 * silently rots:
 *   - drop the filter and `totalPaidAmount` would sum PENDING/FAILED/REFUNDED
 *     payment attempts, overstating cash actually collected against the invoice —
 *     and `completedPaymentCount` would count attempts, not collections;
 *   - flip the predicate literal (e.g. "COMPLETED" -> "PENDING") and the rollup
 *     quietly reports the wrong number with no compile error.
 * A literal/relationship/predicate change is a behavior change; this test fails
 * when any of those drift. The predicate is deliberately identical to the
 * Client/Event.totalPaidAmount COMPLETED filter (one shared rollup meaning).
 *
 * These reconcile against the manually-maintained stored `amountPaid` field
 * (bumped by applyPayment mutates, can drift) — so they must stay computeds and
 * must NOT collide with or become the stored property. This test locks that they
 * live in `computedProperties`, never the stored `properties` list (a stored
 * column would also fail the schema-drift gate separately).
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

describe("Invoice aggregate computeds — compiled IR (regression lock)", () => {
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

  it("totalPaidAmount sums ONLY COMPLETED payments' amount (money, request-cached)", () => {
    const c = computed("totalPaidAmount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("payments");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("COMPLETED"); // not PENDING/FAILED/REFUNDED

    // sum projects amount (second arg of sum is the value selector lambda)
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("amount");
  });

  it("completedPaymentCount counts ONLY COMPLETED payments (int, request-cached)", () => {
    const c = computed("completedPaymentCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("payments");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("COMPLETED"); // attempts != collections
  });

  it("rollups are computeds, never stored Prisma columns (distinct from stored amountPaid)", () => {
    for (const name of ["totalPaidAmount", "completedPaymentCount"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
    // the manually-maintained running total stays a stored property — the rollups
    // reconcile against it, they do not replace it.
    expect(storedPropNames()).toContain("amountPaid");
  });
});
