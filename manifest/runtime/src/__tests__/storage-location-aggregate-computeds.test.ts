/**
 * StorageLocation aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `inventory/inventory-extended-rules.manifest` declares two runtime-only
 * (request-cached) aggregate computeds that roll up a StorageLocation's
 * InventoryTransaction children (the hasMany `transactions` back-relation):
 *     wasteTransactionCount = count_of(filter(self.transactions, t => t.transactionType == "waste"))
 *     wasteCostTotal        = sum(filter(self.transactions, t => t.transactionType == "waste"), t => t.totalCost)
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `wasteTransactionCount` would count EVERY transaction
 *     (receipts/issues/adjustments/transfers/returns too), turning a waste signal
 *     into a meaningless total activity count, and `wasteCostTotal` would sum the
 *     cost of all those non-waste movements, wildly overstating loss;
 *   - flip the predicate literal (e.g. "waste" -> "receipt") and the rollup
 *     quietly reports an unrelated number with no compile error.
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

describe("StorageLocation aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const storageLocation = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "StorageLocation"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (storageLocation?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (storageLocation?.properties ?? []).map((p: { name: string }) => p.name);

  it("StorageLocation entity exists in the compiled IR", () => {
    expect(storageLocation).toBeDefined();
  });

  it("wasteTransactionCount counts ONLY waste transactions (int, request-cached)", () => {
    const c = computed("wasteTransactionCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("transactions");
    expect(decoded.predicateProperty).toBe("transactionType");
    expect(decoded.predicateLiteral).toBe("waste"); // not receipt/issue/adjustment/transfer/return
  });

  it("wasteCostTotal sums ONLY waste transactions' totalCost (money, request-cached)", () => {
    const c = computed("wasteCostTotal");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("transactions");
    expect(decoded.predicateProperty).toBe("transactionType");
    expect(decoded.predicateLiteral).toBe("waste"); // not the cost of every movement

    // sum projects totalCost (second arg of sum is the value selector lambda)
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("totalCost");
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["wasteTransactionCount", "wasteCostTotal"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
