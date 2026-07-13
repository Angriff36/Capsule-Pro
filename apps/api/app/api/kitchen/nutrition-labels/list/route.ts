import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get("recipeId");

    // Get recipes
    const recipes = await database.recipe.findMany({
      where: {
        tenantId,
        ...(recipeId ? { id: recipeId } : {}),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    // Batch-fetch the latest version per recipe in one query (distinct on
    // recipeId, newest versionNumber first) instead of one findFirst per recipe.
    const latestVersions = await database.recipeVersion.findMany({
      where: {
        recipeId: { in: recipes.map((r) => r.id) },
        tenantId,
      },
      distinct: ["recipeId"],
      orderBy: { versionNumber: "desc" },
      select: {
        id: true,
        recipeId: true,
        yieldQuantity: true,
      },
    });

    const versionByRecipe = new Map(
      latestVersions.map((v) => [v.recipeId, v]),
    );
    const versionIds = latestVersions.map((v) => v.id);

    // Batch-count ingredients per version in one groupBy instead of one count
    // per version. Versions with zero ingredients are absent from the result and
    // default to 0. Skipped entirely when there are no versions to count.
    const countsByVersion = new Map<string, number>();
    if (versionIds.length > 0) {
      const counts = await database.recipeIngredient.groupBy({
        by: ["recipeVersionId"],
        where: {
          recipeVersionId: { in: versionIds },
          tenantId,
        },
        _count: { recipeVersionId: true },
      });
      for (const c of counts) {
        countsByVersion.set(c.recipeVersionId, c._count.recipeVersionId);
      }
    }

    const recipesWithStats = recipes.map((recipe) => {
      const version = versionByRecipe.get(recipe.id);
      return {
        id: recipe.id,
        name: recipe.name,
        yield: version?.yieldQuantity ? Number(version.yieldQuantity) : null,
        ingredientCount: version
          ? (countsByVersion.get(version.id) ?? 0)
          : 0,
        hasNutritionData: true, // Calculated on demand
        createdAt: recipe.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      recipes: recipesWithStats,
    });
  } catch (error) {
    captureException(error);
    log.error("Error listing nutrition labels:", error);
    return NextResponse.json(
      { error: "Failed to list nutrition labels" },
      { status: 500 }
    );
  }
}
