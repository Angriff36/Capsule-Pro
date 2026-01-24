Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
const updateEventBudgetsForRecipe = async (recipeVersionId, tenantId) => {
  await database_1.database.$executeRaw(database_1.Prisma.sql`
      WITH recipe_events AS (
        SELECT DISTINCT pt.event_id
        FROM tenant_kitchen.prep_tasks pt
        WHERE pt.tenant_id = ${tenantId}
          AND pt.recipe_version_id = ${recipeVersionId}
          AND pt.deleted_at IS NULL
      ),
      event_recipe_costs AS (
        SELECT
          e.id as event_id,
          COALESCE(SUM(rv.total_cost), 0) as total_recipe_cost
        FROM recipe_events re
        JOIN tenant_events.events e ON e.id = re.event_id
        JOIN tenant_kitchen.recipe_versions rv
          ON rv.recipe_id IN (
            SELECT DISTINCT pt.dish_id
            FROM tenant_kitchen.prep_tasks pt
            WHERE pt.event_id = e.id
              AND pt.tenant_id = ${tenantId}
              AND pt.deleted_at IS NULL
          )
          AND rv.version_number = (
            SELECT MAX(version_number)
            FROM tenant_kitchen.recipe_versions
            WHERE recipe_id = rv.recipe_id
          )
        WHERE e.tenant_id = ${tenantId}
          AND e.budget IS NOT NULL
        GROUP BY e.id
      )
      UPDATE tenant_events.events e
      SET budget = COALESCE(e.budget, 0) + COALESCE(
        (SELECT total_recipe_cost FROM event_recipe_costs WHERE event_id = e.id),
        0
      )
      WHERE e.tenant_id = ${tenantId}
        AND e.id IN (SELECT event_id FROM recipe_events)
    `);
};
async function POST(request, { params }) {
  try {
    const { recipeVersionId } = await params;
    const body = await request.json();
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!recipeVersionId) {
      return server_2.NextResponse.json(
        { error: "recipeVersionId is required" },
        { status: 400 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    await updateEventBudgetsForRecipe(recipeVersionId, tenantId);
    return server_2.NextResponse.json({
      success: true,
      message: "Event budgets updated",
    });
  } catch (error) {
    console.error("Error updating event budgets:", error);
    return server_2.NextResponse.json(
      { error: "Failed to update event budgets" },
      { status: 500 }
    );
  }
}
