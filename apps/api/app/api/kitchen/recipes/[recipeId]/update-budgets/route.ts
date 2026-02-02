import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const updateEventBudgetsForRecipe = async (
  recipeVersionId: string,
  tenantId: string
): Promise<void> => {
  await database.$executeRaw(
    Prisma.sql`
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
    `
  );
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const recipeVersionId = recipeId;
    const _body = await request.json();
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!recipeVersionId) {
      return NextResponse.json(
        { error: "recipeVersionId is required" },
        { status: 400 }
      );
    }

    const tenantId = await getTenantIdForOrg(orgId);
    await updateEventBudgetsForRecipe(recipeVersionId, tenantId);

    return NextResponse.json({
      success: true,
      message: "Event budgets updated",
    });
  } catch (error) {
    console.error("Error updating event budgets:", error);
    return NextResponse.json(
      { error: "Failed to update event budgets" },
      { status: 500 }
    );
  }
}
