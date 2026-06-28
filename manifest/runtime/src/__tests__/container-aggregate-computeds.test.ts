/**
 * Container aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `core/container-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a Container's Dish children (the hasMany
 * `dishes` back-relation — Dishes that name this Container as their
 * defaultContainer):
 *     activeDishCount    = count_of(filter(self.dishes, d => d.isActive == true))
 *     eightySixDishCount = count_of(filter(self.dishes, d => d.isEightySix == true))
 *
 * The FILTERS carry the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `activeDishCount` would count EVERY dish (deactivated
 *     and soft-pulled too), turning a live-menu utilization signal into a
 *     meaningless lifetime total;
 *   - flip the predicate boolean (e.g. isActive -> isEightySix, or true -> false)
 *     and the rollup quietly reports the OPPOSITE facet with no compile error.
 * A relationship/predicate-property/literal change is a behavior change; this
 * test fails when any of those drift, so the rollups can't degrade unnoticed.
 *
 * The two facets are intentionally distinct (NOT subset-of-each-other): a Dish
 * can be an active catalog item AND temporarily 86'd at the same time
 * (`isAvailable = isActive and isEightySix == false`). active = current menu
 * load on this container; eightySix = how many of its dishes are pulled now.
 *
 * NO money leg by design: Dish.pricePerPerson is a per-guest menu price, not a
 * cost attributable to a plating container, so summing it across a container's
 * dishes would invent a meaningless financial number (unlike the
 * StorageLocation/Equipment/Vehicle children, which carry a genuine per-parent
 * money facet). This pair is count-only on purpose.
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

/** A computed aggregate of the form  AGG( filter(self.REL, x => x.PROP == LIT) ). */
interface DecodedAggregate {
  aggregate: string; // "count_of"
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

describe("Container aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const container = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Container"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (container?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (container?.properties ?? []).map((p: { name: string }) => p.name);

  it("Container entity exists in the compiled IR", () => {
    expect(container).toBeDefined();
  });

  it("activeDishCount counts ONLY active dishes (int, request-cached)", () => {
    const c = computed("activeDishCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("dishes");
    expect(decoded.predicateProperty).toBe("isActive"); // not isEightySix
    expect(decoded.predicateLiteral).toBe(true); // active, not deactivated
  });

  it("eightySixDishCount counts ONLY 86'd dishes (int, request-cached)", () => {
    const c = computed("eightySixDishCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("dishes");
    expect(decoded.predicateProperty).toBe("isEightySix"); // not isActive
    expect(decoded.predicateLiteral).toBe(true); // currently pulled from service
  });

  it("the two facets read DIFFERENT predicate properties (not a duplicate)", () => {
    const a = decodeAggregate(computed("activeDishCount").expression);
    const e = decodeAggregate(computed("eightySixDishCount").expression);
    expect(a.predicateProperty).not.toBe(e.predicateProperty);
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["activeDishCount", "eightySixDishCount"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
