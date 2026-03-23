import { NextRequest, NextResponse } from "next/server";
import { getTenantId, requireCurrentUser } from "@repo/auth";
import { database } from "@repo/database";

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const tenantId = await getTenantId();
    
    if (!user || !tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get("recipeId");

    // Get recipes with basic nutrition summary
    const recipes = await database.recipe.findMany({
      where: {
        tenantId,
        ...(recipeId ? { id: recipeId } : {}),
      },
      select: {
        id: true,
        name: true,
        yield: true,
        createdAt: true,
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: {
            version: true,
            ingredients: {
              select: {
                name: true,
                quantity: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Add ingredient count for each recipe
    const recipesWithStats = recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      yield: recipe.yield,
      ingredientCount: recipe.versions[0]?.ingredients.length || 0,
      hasNutritionData: true, // Will be calculated on demand
      createdAt: recipe.createdAt,
    }));

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
