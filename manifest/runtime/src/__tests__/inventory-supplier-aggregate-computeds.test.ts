/**
 * InventorySupplier aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `inventory-supplier-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a supplier's Shipment children (the hasMany
 * `shipments` back-relation — Shipments naming this supplier as their supplierId):
 *     inTransitShipmentCount = count_of(filter(self.shipments, s => s.status == "in_transit"))
 *     deliveredShipmentValue = sum(filter(self.shipments, s => s.status == "delivered"), s => s.totalValue)
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `inTransitShipmentCount` would count EVERY shipment
 *     (draft/scheduled/preparing/delivered/returned/cancelled too), overstating the
 *     supplier's OPEN inbound pipeline with shipments that already landed or were
 *     cancelled, and `deliveredShipmentValue` would sum the value of shipments that
 *     were never received (in-flight estimates, cancelled orders), overstating the
 *     realized received goods value;
 *   - flip a predicate literal (e.g. "in_transit" -> "delivered", or "delivered"
 *     -> "in_transit") and the rollup quietly reports the wrong number with no
 *     compile error.
 * The value leg projects `totalValue` (the realized goods value) ONLY for
 * status=="delivered" shipments — what actually arrived — NOT `shippingCost`, and
 * NOT the value of in-flight/cancelled shipments that may never be received. A
 * literal/relationship/property change is a behavior change; this test fails when
 * any of those drift.
 *
 * These are computeds, NOT stored properties — they must never project a Prisma
 * column (verified separately via the schema-drift gate). This test also locks
 * that they live in `computedProperties`, never the stored `properties` list.
 *
 * Mirrors the Facility.openWorkOrderCount/completedWorkOrderCost precedent over
 * FacilityWorkOrder (in_transit=open pipeline, delivered=realized value); here the
 * parent is InventorySupplier and the child is Shipment (back-relation via
 * Shipment.belongsTo supplier through the hasMany shipments relation).
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

describe("InventorySupplier aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: IR is structural.
  const supplier = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "InventorySupplier"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (supplier?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (supplier?.properties ?? []).map((p: { name: string }) => p.name);

  it("InventorySupplier entity exists in the compiled IR", () => {
    expect(supplier).toBeDefined();
  });

  it("inTransitShipmentCount counts ONLY in_transit shipments (int, request-cached)", () => {
    const c = computed("inTransitShipmentCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("shipments");
    expect(decoded.predicateProperty).toBe("status");
    // open inbound pipeline only — not draft/scheduled/preparing/delivered/returned/cancelled
    expect(decoded.predicateLiteral).toBe("in_transit");
  });

  it("deliveredShipmentValue sums ONLY delivered shipments' totalValue (decimal, request-cached)", () => {
    const c = computed("deliveredShipmentValue");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("decimal");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("shipments");
    expect(decoded.predicateProperty).toBe("status");
    // realized received value only — not in-flight/cancelled estimates
    expect(decoded.predicateLiteral).toBe("delivered");

    // sum projects totalValue (second arg of sum is the value selector lambda) —
    // realized received goods value, NOT shippingCost
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("totalValue");
  });

  it("the two legs are distinct facets (count vs sum; only the value leg has a value selector)", () => {
    const open = computed("inTransitShipmentCount");
    const value = computed("deliveredShipmentValue");
    const openDecoded = decodeAggregate(open.expression);
    const valueDecoded = decodeAggregate(value.expression);

    // same relationship, different aggregate kind + different lifecycle facet
    expect(openDecoded.relationship).toBe(valueDecoded.relationship);
    expect(openDecoded.aggregate).not.toBe(valueDecoded.aggregate);
    expect(openDecoded.predicateLiteral).not.toBe(
      valueDecoded.predicateLiteral
    );

    // only the sum leg carries a value-selector lambda
    expect(open.expression.args?.[1]).toBeUndefined();
    expect(value.expression.args?.[1]?.kind).toBe("lambda");
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["inTransitShipmentCount", "deliveredShipmentValue"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
