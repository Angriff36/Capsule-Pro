/**
 * Menu aggregate rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `kitchen/menu-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a Menu's MenuDish children (the hasMany
 * `dishes` back-relation), both FILTERED on isOptional == true:
 *     optionalDishCount        = count_of(filter(self.dishes, d => d.isOptional == true))
 *     optionalDishUpchargeTotal = sum(filter(self.dishes, d => d.isOptional == true), d => d.priceOverride)
 *
 * The FILTER carries the business meaning, and that is exactly what silently rots:
 *   - drop the filter and `optionalDishCount` would count EVERY dish on the menu
 *     (the core/included dishes too), turning an add-on count into a meaningless
 *     total, and `optionalDishUpchargeTotal` would sum the per-menu price override
 *     of dishes the client never pays extra for;
 *   - flip the predicate boolean (isOptional -> something else, or true -> false)
 *     and the rollup quietly reports the COMPLEMENT — the core (included) menu
 *     instead of the optional add-ons — with no compile error.
 * Menu carries NO stored dish counter at all, so these are purely additive: there
 * is no condition-blind number to confuse them with, but the add-on/core split is
 * the whole signal, and it inverts silently if the `isOptional == true` literal drifts.
 * This test fails when the aggregate, the relationship, the predicate property, the
 * literal, or the summed value-field drift, so the rollups can't degrade unnoticed.
 *
 * The upcharge total sums priceOverride (the per-menu premium); the two facets are
 * NOT a duplicate — one is a bare count (no value selector), the other sums a money
 * field over the SAME optional filter.
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

/** A computed aggregate of the form  AGG( filter(self.REL, x => x.PROP == LIT) [, ...] ). */
interface DecodedAggregate {
  aggregate: string; // "sum" | "count_of"
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

describe("Menu aggregate computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const menu = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Menu"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (menu?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (menu?.properties ?? []).map((p: { name: string }) => p.name);

  it("Menu entity exists in the compiled IR", () => {
    expect(menu).toBeDefined();
  });

  it("optionalDishCount counts ONLY optional add-on dishes (int, request-cached)", () => {
    const c = computed("optionalDishCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("dishes");
    expect(decoded.predicateProperty).toBe("isOptional"); // not every dish
    expect(decoded.predicateLiteral).toBe(true); // add-ons, not the core menu
  });

  it("optionalDishUpchargeTotal sums ONLY optional dishes' priceOverride (money, request-cached)", () => {
    const c = computed("optionalDishUpchargeTotal");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("dishes");
    expect(decoded.predicateProperty).toBe("isOptional");
    expect(decoded.predicateLiteral).toBe(true); // not the included dishes' overrides

    // sum projects priceOverride (second arg of sum is the value selector lambda)
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("priceOverride");
  });

  it("the two facets are distinct (count vs money sum over the same optional filter)", () => {
    const count = computed("optionalDishCount");
    const value = computed("optionalDishUpchargeTotal");
    // both filter the same predicate, but one is a bare count and the other a value
    // sum — not a duplicate (count_of has no value selector; sum does).
    expect(callName(count.expression)).toBe("count_of");
    expect(callName(value.expression)).toBe("sum");
    expect(count.expression.args?.length).toBe(1); // filter only
    expect(value.expression.args?.length).toBe(2); // filter + value selector
  });

  it("rollups are computeds, never stored Prisma columns", () => {
    for (const name of ["optionalDishCount", "optionalDishUpchargeTotal"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
  });
});
