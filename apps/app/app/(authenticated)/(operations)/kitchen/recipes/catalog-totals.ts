/**
 * Catalog totals for the Kitchen Recipes page (db-performance plan item #7).
 *
 * The page previously issued 4 SEQUENTIAL `$queryRaw` COUNT queries (recipes,
 * dishes, ingredients, menus) — each keyed only on (tenantId, deleted_at IS
 * NULL) and fully independent of the others and of the search filters. They
 * back the always-visible tab badges + hub metrics, so all four are needed on
 * every page load regardless of the active tab. Collapsed into ONE round-trip
 * via a single query with four subselects: 4 serial round-trips → 1.
 */
import { database, Prisma } from "@repo/database";

export interface CatalogTotals {
  dishCount: number;
  ingredientCount: number;
  menuCount: number;
  recipeCount: number;
}

export async function getCatalogTotals(
  tenantId: string
): Promise<CatalogTotals> {
  const [row] = await database.$queryRaw<
    Array<{
      recipe_count: number;
      dish_count: number;
      ingredient_count: number;
      menu_count: number;
    }>
  >(Prisma.sql`
    SELECT
      (SELECT COUNT(*)::int FROM tenant_kitchen.recipes WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS recipe_count,
      (SELECT COUNT(*)::int FROM tenant_kitchen.dishes WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS dish_count,
      (SELECT COUNT(*)::int FROM tenant_kitchen.ingredients WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS ingredient_count,
      (SELECT COUNT(*)::int FROM tenant_kitchen.menus WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS menu_count
  `);

  return {
    recipeCount: row?.recipe_count ?? 0,
    dishCount: row?.dish_count ?? 0,
    ingredientCount: row?.ingredient_count ?? 0,
    menuCount: row?.menu_count ?? 0,
  };
}
