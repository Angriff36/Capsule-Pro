/**
 * @module RecipeIngredientsAPI
 * @intent Fetch recipe ingredients for mobile viewer
 * @responsibility Provide ingredients list for a recipe
 * @domain Kitchen
 * @tags recipes, ingredients, api, mobile
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/recipes/[recipeId]/ingredients
 * Fetch ingredients for the latest version of a recipe
 */
async function GET(request, { params }) {
  try {
    const { recipeId } = await params;
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Fetch ingredients for the recipe's latest version
    const ingredients = await database_1.database.$queryRaw(database_1.Prisma
      .sql`
        SELECT
          i.id,
          i.name,
          ri.quantity,
          u.code AS unit_code,
          ri.notes,
          ri.is_optional,
          ri.sort_order AS order_index
        FROM tenant_kitchen.recipes r
        LEFT JOIN LATERAL (
          SELECT rv.id
          FROM tenant_kitchen.recipe_versions rv
          WHERE rv.tenant_id = r.tenant_id
            AND rv.recipe_id = r.id
            AND rv.deleted_at IS NULL
          ORDER BY rv.version_number DESC
          LIMIT 1
        ) rv ON true
        JOIN tenant_kitchen.recipe_ingredients ri
          ON ri.tenant_id = r.tenant_id
          AND ri.recipe_version_id = rv.id
          AND ri.deleted_at IS NULL
        JOIN tenant_kitchen.ingredients i
          ON i.tenant_id = ri.tenant_id
          AND i.id = ri.ingredient_id
          AND i.deleted_at IS NULL
        LEFT JOIN core.units u ON u.id = ri.unit_id
        WHERE r.tenant_id = ${tenantId}
          AND r.id = ${recipeId}
          AND r.deleted_at IS NULL
        ORDER BY ri.sort_order ASC
      `);
    return server_2.NextResponse.json({
      ingredients: ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        quantity: Number(ing.quantity),
        unitCode: ing.unit_code,
        notes: ing.notes,
        isOptional: ing.is_optional,
        orderIndex: ing.order_index,
      })),
    });
  } catch (error) {
    console.error("Error fetching recipe ingredients:", error);
    return server_2.NextResponse.json(
      { error: "Failed to fetch recipe ingredients" },
      { status: 500 }
    );
  }
}
