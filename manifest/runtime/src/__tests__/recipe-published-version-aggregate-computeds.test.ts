/**
 * Recipe → RecipeVersion published-version rollup computeds — compiled-IR regression lock.
 *
 * WHY this matters (not just WHAT it does):
 *
 * `kitchen/recipe-rules.manifest` declares two runtime-only (request-cached)
 * aggregate computeds that roll up a Recipe's PUBLISHED versions over the existing
 * `hasMany versions: RecipeVersion` back-relation:
 *     publishedVersionCount     = count_of(filter(self.versions, v => v.status == "published"))
 *     publishedVersionCostTotal = sum(filter(self.versions, v => v.status == "published"), v => v.totalCost)
 *
 * The "published" filter carries the business meaning, and that is exactly what
 * silently rots:
 *   - drop the filter and the rollup would count/sum every `draft` version too —
 *     overstating how much of this catalog recipe is actually publishable and
 *     mixing in-progress drafts into the cost lens;
 *   - flip the predicate literal (e.g. "published" -> "draft") and the rollup
 *     quietly reports the unpublished backlog instead of the published cohort,
 *     with no compile error. The enum is a closed vocabulary (RecipeVersionStatus
 *     = draft | published) and "published" is a real reachable state (the
 *     draft->published transition + RecipeVersion.isPublished).
 * The money leg projects `totalCost` (the rolled-up ingredient cost of a version),
 * NOT `costPerYield` (a per-serving derivative) — summing per-yield cost across
 * versions would be meaningless. A literal/relationship/predicate/selector change
 * is a behavior change; this test fails when any of those drift.
 *
 * These are IR-only computeds (no stored Prisma column, no migration) — this test
 * locks that they live in `computedProperties`, never the stored `properties` list,
 * and that they read the `versions` relationship (not `dishes`, the sibling
 * hasMany), so neither leg can quietly be re-pointed at the wrong child.
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

describe("Recipe → RecipeVersion published-version computeds — compiled IR (regression lock)", () => {
  const { ir } = loadMergedPrecompiledIR();
  const recipe = (ir.entities ?? []).find(
    (e: { name: string }) => e.name === "Recipe"
  );

  // biome-ignore lint/suspicious/noExplicitAny: walking structural IR.
  const computed = (name: string): any =>
    (recipe?.computedProperties ?? []).find(
      (c: { name: string }) => c.name === name
    );
  const storedPropNames = () =>
    (recipe?.properties ?? []).map((p: { name: string }) => p.name);

  it("Recipe entity exists in the compiled IR", () => {
    expect(recipe).toBeDefined();
  });

  it("publishedVersionCount counts ONLY published versions (int, request-cached)", () => {
    const c = computed("publishedVersionCount");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("int");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("count_of");
    expect(decoded.relationship).toBe("versions"); // NOT dishes
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("published"); // not draft
  });

  it("publishedVersionCostTotal sums published versions' totalCost (money, request-cached)", () => {
    const c = computed("publishedVersionCostTotal");
    expect(c).toBeDefined();
    expect(c.type?.name).toBe("money");
    expect(c.cache?.strategy).toBe("request");

    const decoded = decodeAggregate(c.expression);
    expect(decoded.aggregate).toBe("sum");
    expect(decoded.relationship).toBe("versions"); // NOT dishes
    expect(decoded.predicateProperty).toBe("status");
    expect(decoded.predicateLiteral).toBe("published");

    // sum projects totalCost (the version's rolled-up cost), not costPerYield (a per-serving derivative)
    const valueLambda = c.expression.args?.[1];
    expect(valueLambda?.kind).toBe("lambda");
    expect(valueLambda.body?.property).toBe("totalCost");
  });

  it("count and sum are DISTINCT facets over the SAME published filter", () => {
    const count = computed("publishedVersionCount");
    const sum = computed("publishedVersionCostTotal");
    // count_of takes one arg (the filtered collection); sum takes a second
    // value-selector lambda — so they are not duplicates of each other.
    expect(count.expression.args?.length).toBe(1);
    expect(sum.expression.args?.length).toBe(2);
    // both read the same relationship + filter literal (one coherent published story)
    expect(decodeAggregate(count.expression).relationship).toBe(
      decodeAggregate(sum.expression).relationship
    );
    expect(decodeAggregate(count.expression).predicateLiteral).toBe(
      decodeAggregate(sum.expression).predicateLiteral
    );
  });

  it("rollups are computeds, never stored Prisma columns (no migration)", () => {
    for (const name of ["publishedVersionCount", "publishedVersionCostTotal"]) {
      expect(computed(name)).toBeDefined();
      expect(storedPropNames()).not.toContain(name);
    }
    // the pre-existing version computed stays a computed too — these read the same child.
    expect(computed("hasVersion")).toBeDefined();
  });
});
