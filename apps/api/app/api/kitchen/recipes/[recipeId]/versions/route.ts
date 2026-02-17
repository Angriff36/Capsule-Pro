import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/kitchen/recipes/:recipeId/versions
 *
 * Returns all non-deleted versions for a recipe, ordered by version_number DESC.
 * Shape: RecipeVersionRow[] — consumed by the History tab in recipe-detail-tabs.tsx.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Single query: versions + ingredient/step counts via subqueries.
    // Returns the exact shape the client expects (RecipeVersionRow).
    const versions = await database.$queryRaw<
      Array<{
        id: string;
        version_number: number;
        created_at: Date;
        ingredient_count: bigint;
        step_count: bigint;
      }>
    >`
      SELECT
        rv.id,
        rv.version_number,
        rv.created_at,
        (
          SELECT COUNT(*)
          FROM tenant_kitchen.recipe_ingredients ri
          WHERE ri.recipe_version_id = rv.id
            AND ri.tenant_id = ${tenantId}::uuid
            AND ri.deleted_at IS NULL
        ) AS ingredient_count,
        (
          SELECT COUNT(*)
          FROM tenant_kitchen.recipe_steps rs
          WHERE rs.recipe_version_id = rv.id
            AND rs.tenant_id = ${tenantId}::uuid
            AND rs.deleted_at IS NULL
        ) AS step_count
      FROM tenant_kitchen.recipe_versions rv
      WHERE rv.recipe_id = ${recipeId}::uuid
        AND rv.tenant_id = ${tenantId}::uuid
        AND rv.deleted_at IS NULL
      ORDER BY rv.version_number DESC
    `;

    // Normalise BigInt counts to plain numbers for JSON serialisation.
    const rows = versions.map((v) => ({
      id: v.id,
      version_number: v.version_number,
      created_at: v.created_at,
      ingredient_count: Number(v.ingredient_count),
      step_count: Number(v.step_count),
    }));

    return NextResponse.json(rows);
  } catch (error) {
    console.error(
      "[GET /api/kitchen/recipes/:recipeId/versions] Error:",
      error
    );
    captureException(error);
    return NextResponse.json(
      { error: "Failed to fetch recipe versions" },
      { status: 500 }
    );
  }
}
