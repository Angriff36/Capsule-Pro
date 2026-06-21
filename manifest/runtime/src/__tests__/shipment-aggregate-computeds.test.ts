/**
 * Shipment aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `operations/shipment-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a Shipment's ShipmentItem children (the hasMany
 * `items` back-relation):
 *     goodConditionItemCount = count_of(filter(self.items, i => i.condition == "good"))
 *     goodConditionValue     = sum(filter(self.items, i => i.condition == "good"), i => i.totalCost)
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `goodConditionItemCount` would count EVERY line item
 *     (damaged/expired/spoiled receipts too), collapsing the receipt-quality signal
 *     into the same number the stored `totalItems` counter already holds, and
 *     `goodConditionValue` would sum the value of damaged stock as if it were intact;
 *   - flip the predicate literal (e.g. "good" -> "damaged") and the rollup quietly
 *     reports the COMPLEMENT population — the loss/shrink basis instead of the clean
 *     receipt — with no compile error.
 * The whole point is that `totalItems`/`totalValue` (stored, condition-blind) minus
 * these good-condition rollups is the damage exposure; if the "good" filter drifts,
 * that subtraction silently inverts. This test fails when the aggregate, the
 * relationship, the predicate property, the literal, or the summed value-field drift,
 * so the rollups can't degrade unnoticed.
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

describe("Shipment aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const shipment = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Shipment"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (shipment?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (shipment?.properties ?? []).map((p: { name: string }) => p.name);

  it("Shipment entity exists in the compiled IR", () => {
    expect(shipment).toBeDefined();
  });

  it("goodConditionItemCount counts ONLY good-condition items (int, request-cached)", () => {
    const c = computed("goodConditionItemCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("items");
    expect(decoded.predicateProperty).toBe("condition");
    expect(decoded.predicateLiteral).toBe("good"); // not damaged/expired/every line
  });

  it("goodConditionValue sums ONLY good-condition items' totalCost (money, request-cached)", () => {
    const c = computed("goodConditionValue");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("items");
    expect(decoded.predicateProperty).toBe("condition");
    expect(decoded.predicateLiteral).toBe("good"); // not the value of damaged stock

    // sum projects totalCost (second arg of sum is the value selector lambda)
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("totalCost");
  });

  it("the two facets are distinct (count vs money sum over the same good filter)", () => {
    const count = computed("goodConditionItemCount");
    const value = computed("goodConditionValue");
    // both filter the same literal, but one is a bare count and the other a value sum —
    // not a duplicate (count_of has no value selector; sum does).
    expect(callName(count.expression)).toBe("count_of");
    expect(callName(value.expression)).toBe("sum");
    expect(count.expression.args?.length).toBe(1); // filter only
    expect(value.expression.args?.length).toBe(2); // filter + value selector
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["goodConditionItemCount", "goodConditionValue"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
