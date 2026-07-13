/**
 * @vitest-environment node
 *
 * db-performance plan item #7 (apps/app RSC waterfalls): the Kitchen Recipes
 * page previously issued 4 SEQUENTIAL `$queryRaw` COUNT queries (recipes,
 * dishes, ingredients, menus) — each keyed only on (tenantId, deleted_at IS
 * NULL) and fully independent of the others and of the search filters. They
 * back the always-visible tab badges + hub metrics, so all four are needed on
 * every page load. `getCatalogTotals` collapses them into ONE round-trip (a
 * single query with four subselects): 4 serial round-trips → 1.
 *
 * This test pins:
 *  1. exactly ONE `$queryRaw` + ONE `Prisma.sql` call (the 4→1 regression guard
 *     — re-introducing a per-entity serial count would fail this).
 *  2. the four counts map out to the response shape.
 *  3. defensive zeros when no row is returned.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
  },
  Prisma: {
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    })),
  },
}));

import { database, Prisma } from "@repo/database";
import { getCatalogTotals } from "../../app/(authenticated)/(operations)/kitchen/recipes/catalog-totals";

const queryRaw = database.$queryRaw as ReturnType<typeof vi.fn>;
const prismaSql = Prisma.sql as ReturnType<typeof vi.fn>;
const TENANT_ID = "tenant-1";

describe("getCatalogTotals — one combined COUNT query (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues a single $queryRaw + single Prisma.sql and maps the four counts", async () => {
    queryRaw.mockResolvedValue([
      {
        recipe_count: 12,
        dish_count: 7,
        ingredient_count: 30,
        menu_count: 4,
      },
    ]);

    const totals = await getCatalogTotals(TENANT_ID);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(prismaSql).toHaveBeenCalledTimes(1);
    expect(totals).toEqual({
      recipeCount: 12,
      dishCount: 7,
      ingredientCount: 30,
      menuCount: 4,
    });
  });

  it("scopes every subselect to the given tenantId (bound, not interpolated)", async () => {
    queryRaw.mockResolvedValue([
      { recipe_count: 0, dish_count: 0, ingredient_count: 0, menu_count: 0 },
    ]);

    await getCatalogTotals(TENANT_ID);

    // The combined query filters every subselect on tenantId; it is carried as
    // the sole bound value (repeated once per subselect) of the Prisma.sql
    // fragment, never string-interpolated.
    const sqlValues = prismaSql.mock.calls[0]!.slice(1);
    expect(sqlValues.length).toBe(4);
    expect(sqlValues.every((v) => v === TENANT_ID)).toBe(true);
  });

  it("returns zeros when no row is returned (defensive)", async () => {
    queryRaw.mockResolvedValue([]);

    const totals = await getCatalogTotals(TENANT_ID);

    expect(totals).toEqual({
      recipeCount: 0,
      dishCount: 0,
      ingredientCount: 0,
      menuCount: 0,
    });
  });
});
