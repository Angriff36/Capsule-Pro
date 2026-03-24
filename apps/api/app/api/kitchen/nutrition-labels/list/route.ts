import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
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

    // Get ingredient counts for each recipe via RecipeVersion
    const recipesWithStats = await Promise.all(
      recipes.map(async (recipe) => {
        const latestVersion = await database.recipeVersion.findFirst({
          where: {
            recipeId: recipe.id,
            tenantId,
          },
          orderBy: { versionNumber: "desc" },
          select: {
            versionNumber: true,
            yieldQuantity: true,
          },
        });

        // Count ingredients for this version
        let ingredientCount = 0;
        if (latestVersion) {
          ingredientCount = await database.recipeIngredient.count({
            where: {
              recipeVersionId: latestVersion.id,
              tenantId,
            },
          });
        }

        return {
          id: recipe.id,
          name: recipe.name,
          yield: latestVersion?.yieldQuantity ? Number(latestVersion.yieldQuantity) : null,
          ingredientCount,
          hasNutritionData: true, // Will be calculated on demand
          createdAt: recipe.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      recipes: recipesWithStats,
    });
  } catch (error) {
    console.error("Error listing nutrition labels:", error);
    return NextResponse.json(
      { error: "Failed to list nutrition labels" },
      { status: 500 }
    );
  }
}
