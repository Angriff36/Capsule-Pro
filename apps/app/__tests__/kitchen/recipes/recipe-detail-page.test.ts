/**
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { notFound } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecipeDetailPage from "../../../app/(authenticated)/(operations)/kitchen/recipes/[recipeId]/page";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn().mockResolvedValue({ orgId: "org-1" }),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("../../../app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn().mockResolvedValue("tenant-1"),
}));

const RECIPE_ID = "00000000-0000-4000-8000-000000000001";

// Complete recipe-header row (the page reads many nullable columns off it).
const recipeRow = {
  id: RECIPE_ID,
  name: "Test Recipe",
  description: null,
  category: null,
  tags: null,
  is_active: true,
  is_subrecipe: false,
  version_number: 1,
  yield_quantity: 4,
  yield_unit: "servings",
  yield_description: null,
  prep_time_minutes: 10,
  cook_time_minutes: 20,
  rest_time_minutes: null,
  difficulty_level: 2,
  instructions: null,
  notes: null,
  drop_off_notes: null,
  bring_hot_notes: null,
  cook_on_site_notes: null,
  image_url: null,
};

const ingredientRow = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "Flour",
  notes: null,
  order_index: 1,
  quantity: 2,
  unit_code: "cups",
};

interface SqlLike {
  strings: TemplateStringsArray;
  values: unknown[];
}

function sqlText(arg: unknown): string {
  if (arg && typeof arg === "object" && "strings" in (arg as object)) {
    return Array.from((arg as SqlLike).strings).join("");
  }
  return "";
}

// Value-keyed $queryRaw mock: inspect the SQL fragment, return the matching
// fixture. Order-independent — passes whether the page awaits the reads
// serially or in a Promise.all batch.
function resolveQuery(sql: string, overrides: { recipe?: unknown[] } = {}): unknown[] {
  if (sql.includes("LEFT JOIN LATERAL")) return overrides.recipe ?? [recipeRow]; // recipe header (A)
  if (sql.includes("FROM tenant_kitchen.dishes d")) return []; // dish presentation (B)
  if (sql.includes("FROM tenant_kitchen.recipe_ingredients")) return [ingredientRow]; // ingredients (C)
  if (sql.includes("SELECT rv.id AS version_id")) return [{ version_id: "version-1" }]; // version id (D)
  if (sql.includes("FROM tenant_kitchen.recipe_steps")) return []; // steps (E)
  return []; // linked-recipe names (F) + any other
}

describe("RecipeDetailPage", () => {
  let queryRawSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryRawSpy = vi.spyOn(database, "$queryRaw");
  });

  afterEach(() => {
    queryRawSpy?.mockRestore();
  });

  it("uses preparation_notes and sort_order columns for ingredients", async () => {
    queryRawSpy.mockImplementation(
      ((arg: SqlLike) => Promise.resolve(resolveQuery(sqlText(arg)))) as never
    );

    await RecipeDetailPage({ params: Promise.resolve({ recipeId: RECIPE_ID }) });

    const ingredientCall = queryRawSpy.mock.calls.find((call: unknown[]) =>
      sqlText(call[0]).includes("FROM tenant_kitchen.recipe_ingredients")
    );
    expect(ingredientCall).toBeDefined();

    const ingredientSql = sqlText(ingredientCall?.[0]);
    // Regression guard: the ingredient junction table uses preparation_notes /
    // sort_order, NOT the legacy notes / order_index columns.
    expect(ingredientSql).toContain("ri.preparation_notes");
    expect(ingredientSql).toContain("ri.sort_order");
    expect(ingredientSql).not.toContain("ri.notes");
    expect(ingredientSql).not.toContain("ri.order_index");
  });

  it("fetches dish, ingredients, and version concurrently (not serially)", async () => {
    // Hold the dish query (B) pending. If the page awaited B before issuing C/D
    // (serial layout), C and D would not be invoked until dish resolves. Under
    // Promise.all all three fire in the same tick — so C and D must already be
    // in the call log while B is still pending.
    let resolveDish!: (rows: unknown[]) => void;
    const dishPending = new Promise<unknown[]>((res) => {
      resolveDish = res;
    });

    queryRawSpy.mockImplementation(
      ((arg: SqlLike) => {
        const sql = sqlText(arg);
        if (sql.includes("FROM tenant_kitchen.dishes d")) {
          return dishPending;
        }
        return Promise.resolve(resolveQuery(sql));
      }) as never
    );

    const pagePromise = RecipeDetailPage({
      params: Promise.resolve({ recipeId: RECIPE_ID }),
    });
    // Drain microtasks: the existence-guard read (A) resolves, the guard passes,
    // and the Promise.all batch constructs — issuing B, C, D synchronously. The
    // page then blocks on the still-pending dish query.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    const calls = queryRawSpy.mock.calls.map((call: unknown[]) => sqlText(call[0]));
    expect(calls.some((s: string) => s.includes("FROM tenant_kitchen.recipe_ingredients"))).toBe(true);
    expect(calls.some((s: string) => s.includes("SELECT rv.id AS version_id"))).toBe(true);

    resolveDish([]);
    await pagePromise;
  });

  it("short-circuits to notFound when the recipe does not exist", async () => {
    queryRawSpy.mockImplementation(
      ((arg: SqlLike) => {
        const sql = sqlText(arg);
        if (sql.includes("LEFT JOIN LATERAL")) {
          return Promise.resolve([]); // existence-guard read returns no row
        }
        return Promise.resolve(resolveQuery(sql));
      }) as never
    );

    await RecipeDetailPage({ params: Promise.resolve({ recipeId: RECIPE_ID }) });

    expect(notFound).toHaveBeenCalled();
    // Only the existence-guard read fires; no post-guard query runs.
    expect(queryRawSpy.mock.calls).toHaveLength(1);
  });
});
