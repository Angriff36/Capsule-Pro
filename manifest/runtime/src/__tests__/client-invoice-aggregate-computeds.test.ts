/**
 * Client invoice-delinquency aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `crm/client-rules.manifest` declares two runtime-only (request-cached) aggregate
 * computeds that roll up a Client's Invoice children (the hasMany `invoices`
 * back-relation — a DIFFERENT child than the Client's existing `payments` rollups),
 * each FILTERED on the SAME terminal `OVERDUE` value of the invoice `status`:
 *     overdueInvoiceCount  = count_of(filter(self.invoices, i => i.status == "OVERDUE"))
 *     overdueBalanceTotal  = sum(filter(self.invoices, i => i.status == "OVERDUE"), i => i.amountDue)
 *
 * The FILTER carries the business meaning, and that is exactly what silently rots:
 *   - drop the filter and the rollup would count/total EVERY invoice — turning a
 *     "past-due AR exposure" signal into meaningless gross billing volume (incl.
 *     drafts, paid, and current SENT/VIEWED invoices that aren't delinquent);
 *   - flip the literal ("OVERDUE" -> "PAID", say) and the rollup quietly reports a
 *     DIFFERENT cohort with no compile error;
 *   - point the sum's value selector at `total` instead of `amountDue` and it would
 *     double-count dollars the client has already paid down.
 * The two facets read the SAME property (`status`) and the SAME literal ("OVERDUE")
 * on purpose, but they are NOT a duplicate: count_of (1 arg, bare count) answers
 * "how many invoices have gone past due" while sum (2 args, value selector over
 * `amountDue`) answers "how many dollars are still owed across them". One is a
 * tally, the other is the outstanding balance — distinct facets of one delinquency
 * story.
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

/**
 * A computed aggregate of the form
 *   AGG( filter(self.REL, x => x.PROP == LIT) [, x => x.VALUEPROP] ).
 */
interface DecodedAggregate {
  aggregate: string; // "count_of" | "sum"
  predicateLiteral: unknown; // RHS literal of the == comparison
  predicateProperty: string; // <param>.<property> in the filter lambda
  relationship: string; // self.<relationship>
  valueProperty?: string; // <param>.<property> in the value-selector lambda (sum only)
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

  // optional second aggregate arg = value selector lambda  (x) => x.VALUEPROP
  let valueProperty: string | undefined;
  const valueLambda = expr.args?.[1];
  if (valueLambda) {
    expect(valueLambda.kind).toBe("lambda");
    expect(valueLambda.body?.kind).toBe("member");
    valueProperty = valueLambda.body.property;
  }

  return {
    aggregate: aggregate as string,
    relationship: collection.property,
    predicateProperty: body.left.property,
    predicateLiteral: body.right.value?.value ?? body.right.value,
    valueProperty,
  };
}

describe("Client invoice aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const client = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Client"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (client?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (client?.properties ?? []).map((p: { name: string }) => p.name);

  it("Client entity exists in the compiled IR", () => {
    expect(client).toBeDefined();
  });

  it("overdueInvoiceCount counts ONLY overdue invoices (int, request-cached)", () => {
    const c = computed("overdueInvoiceCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("invoices");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("OVERDUE"); // not every invoice
    expect(decoded.valueProperty).toBeUndefined(); // bare count, no selector
  });

  it("overdueBalanceTotal sums the amountDue of ONLY overdue invoices (money, request-cached)", () => {
    const c = computed("overdueBalanceTotal");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("invoices");
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("OVERDUE");
    // sums the OUTSTANDING balance (amountDue), NOT total — total would double-count
    // dollars already paid down.
    expect(decoded.valueProperty).toBe("amountDue");
  });

  it("the two facets share the OVERDUE cohort but measure distinct things (count vs outstanding $)", () => {
    const count = computed("overdueInvoiceCount");
    const balance = computed("overdueBalanceTotal");
    const dc = decodeAggregate(count.expression);
    const db = decodeAggregate(balance.expression);
    // same relationship, same property, same literal — one cohort...
    expect(dc.relationship).toBe(db.relationship);
    expect(dc.predicateProperty).toBe(db.predicateProperty);
    expect(dc.predicateLiteral).toBe(db.predicateLiteral);
    // ...but a tally (count_of, 1 arg) vs a money sum (sum, 2 args) — not a duplicate.
    expect(callName(count.expression)).toBe("count_of");
    expect(callName(balance.expression)).toBe("sum");
    expect(count.expression.args?.length).toBe(1);
    expect(balance.expression.args?.length).toBe(2);
  });

  it("these invoice rollups are a DIFFERENT child than the existing payments rollups", () => {
    // guards against accidentally re-pointing at `payments` (the Client's other
    // money rollup) — the invoice-delinquency story must read `invoices`.
    const dc = decodeAggregate(computed("overdueInvoiceCount").expression);
    const paid = computed("completedPaymentCount");
    expect(paid).toBeDefined(); // pre-existing payments rollup still present
    const dp = decodeAggregate(paid.expression);
    expect(dc.relationship).toBe("invoices");
    expect(dp.relationship).toBe("payments");
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["overdueInvoiceCount", "overdueBalanceTotal"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
