/**
 * PurchaseOrder quality-hold aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `procurement/purchase-order-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a PurchaseOrder's PurchaseOrderItem children (the
 * existing hasMany `items` back-relation), each FILTERED on the SAME `"pending"` value of
 * the line item's `qualityStatus`:
 *     pendingQualityItemCount  = count_of(filter(self.items, i => i.qualityStatus == "pending"))
 *     pendingQualityValueTotal = sum(filter(self.items, i => i.qualityStatus == "pending"), i => i.totalCost)
 *
 * The FILTER carries the business meaning, and that is exactly what silently rots:
 *   - drop the filter and the rollup would count/total EVERY line item — turning a
 *     "value still on quality hold" signal into meaningless gross PO volume (incl.
 *     already-accepted/rejected items that are no longer pending review);
 *   - flip the literal ("pending" -> "accepted", say) and the rollup quietly reports a
 *     DIFFERENT cohort with no compile error;
 *   - point the sum's value selector at `discrepancyAmount` instead of `totalCost` and it
 *     would measure only shorted/damaged dollars, NOT the value tied up in the hold.
 * The two facets read the SAME property (`qualityStatus`) and the SAME literal ("pending")
 * on purpose, but they are NOT a duplicate: count_of (1 arg, bare count) answers "how many
 * line items are still awaiting quality acceptance" while sum (2 args, value selector over
 * `totalCost`) answers "how many dollars are tied up in that hold". One is a tally, the
 * other is the held value — distinct facets of one quality-hold story.
 *
 * These are computeds, NOT stored properties — they must never project a Prisma column
 * (verified separately via the schema-drift gate). This test also locks that they live in
 * `computedProperties`, never the stored `properties` list.
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

describe("PurchaseOrder quality-hold aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const po = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "PurchaseOrder"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (po?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (po?.properties ?? []).map((p: { name: string }) => p.name);

  it("PurchaseOrder entity exists in the compiled IR", () => {
    expect(po).toBeDefined();
  });

  it("pendingQualityItemCount counts ONLY pending-QC line items (int, request-cached)", () => {
    const c = computed("pendingQualityItemCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("items");
    expect(decoded.predicateProperty).toBe("qualityStatus");
    expect(decoded.predicateLiteral).toBe("pending"); // not every line item
    expect(decoded.valueProperty).toBeUndefined(); // bare count, no selector
  });

  it("pendingQualityValueTotal sums the totalCost of ONLY pending-QC line items (money, request-cached)", () => {
    const c = computed("pendingQualityValueTotal");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("items");
    expect(decoded.predicateProperty).toBe("qualityStatus");
    expect(decoded.predicateLiteral).toBe("pending");
    // sums the HELD line value (totalCost), NOT discrepancyAmount — that would measure
    // only the shorted/damaged portion, a different cohort.
    expect(decoded.valueProperty).toBe("totalCost");
  });

  it("the two facets share the pending cohort but measure distinct things (count vs held $)", () => {
    const count = computed("pendingQualityItemCount");
    const value = computed("pendingQualityValueTotal");
    const dc = decodeAggregate(count.expression);
    const dv = decodeAggregate(value.expression);
    // same relationship, same property, same literal — one cohort...
    expect(dc.relationship).toBe(dv.relationship);
    expect(dc.predicateProperty).toBe(dv.predicateProperty);
    expect(dc.predicateLiteral).toBe(dv.predicateLiteral);
    // ...but a tally (count_of, 1 arg) vs a money sum (sum, 2 args) — not a duplicate.
    expect(callName(count.expression)).toBe("count_of");
    expect(callName(value.expression)).toBe("sum");
    expect(count.expression.args?.length).toBe(1);
    expect(value.expression.args?.length).toBe(2);
  });

  it("rollups target the line-item children (the existing hasMany `items`)", () => {
    // guards against accidentally re-pointing at `requisitions` (the PO's other hasMany)
    // — the quality-hold story must read `items` (PurchaseOrderItem).
    const dc = decodeAggregate(computed("pendingQualityItemCount").expression);
    expect(dc.relationship).toBe("items");
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of [
      "pendingQualityItemCount",
      "pendingQualityValueTotal",
    ]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
