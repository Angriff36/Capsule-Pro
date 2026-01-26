import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "../../../../lib/tenant";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    invariant(recipeId, "params.recipeId must exist");
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const versions = await database.$queryRaw<
      Array<{
        id: string;
        version_number: number;
        created_at: Date;
        ingredient_count: number;
        step_count: number;
      }>
    >(
      Prisma.sql`
        SELECT
          rv.id,
          rv.version_number,
          rv.created_at,
          (
            SELECT COUNT(*)
            FROM tenant_kitchen.recipe_ingredients ri
            WHERE ri.tenant_id = rv.tenant_id
              AND ri.recipe_version_id = rv.id
              AND ri.deleted_at IS NULL
          ) as ingredient_count,
          (
            SELECT COUNT(*)
            FROM tenant_kitchen.recipe_steps rs
            WHERE rs.tenant_id = rv.tenant_id
              AND rs.recipe_version_id = rv.id
              AND rs.deleted_at IS NULL
          ) as step_count
        FROM tenant_kitchen.recipe_versions rv
        WHERE rv.tenant_id = ${tenantId}
          AND rv.recipe_id = ${recipeId}
          AND rv.deleted_at IS NULL
        ORDER BY rv.version_number DESC
      `
    );

    return NextResponse.json(versions);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to fetch recipe versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe versions" },
      { status: 500 }
    );
  }
}
