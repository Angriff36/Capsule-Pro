/**
 * @module RecipeIngredientsAPI
 * @intent Fetch recipe ingredients for mobile viewer
 * @responsibility Provide ingredients list for a recipe
 * @domain Kitchen
 * @tags recipes, ingredients, api, mobile
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export interface RecipeIngredient {
  id: string;
  name: string;
  quantity: number;
  unitCode: string;
  notes: string | null;
  isOptional: boolean;
  orderIndex: number;
}

/**
 * GET /api/kitchen/recipes/[recipeId]/ingredients
 * Fetch ingredients for the latest version of a recipe
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

    // Verify recipe exists
    const recipe = await database.recipe.findFirst({
      where: { tenantId, id: recipeId, deletedAt: null },
      select: { id: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Fetch latest recipe version (replaces LATERAL JOIN)
    const latestVersion = await database.recipeVersion.findFirst({
      where: { tenantId, recipeId, deletedAt: null },
      orderBy: { versionNumber: "desc" },
      select: { id: true },
    });

    if (!latestVersion) {
      return NextResponse.json({ ingredients: [] });
    }

    // Fetch recipe ingredients for this version
    const recipeIngredients = await database.recipeIngredient.findMany({
      where: {
        tenantId,
        recipeVersionId: latestVersion.id,
        deletedAt: null,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        ingredientId: true,
        quantity: true,
        unitId: true,
        preparationNotes: true,
        isOptional: true,
        sortOrder: true,
      },
    });

    if (recipeIngredients.length === 0) {
      return NextResponse.json({ ingredients: [] });
    }

    // Batch fetch ingredient names via Map lookup
    const ingredientIds = recipeIngredients.map((ri) => ri.ingredientId);
    const ingredientRows = await database.ingredient.findMany({
      where: {
        tenantId,
        id: { in: ingredientIds },
        deletedAt: null,
      },
      select: { id: true, name: true },
    });
    const ingredientMap = new Map(ingredientRows.map((i) => [i.id, i.name]));

    // Batch fetch unit codes via Map lookup
    const unitIds = [
      ...new Set(
        recipeIngredients
          .map((ri) => ri.unitId)
          .filter((id): id is number => id !== null)
      ),
    ];
    const unitRows =
      unitIds.length > 0
        ? await database.units.findMany({
            where: { id: { in: unitIds } },
            select: { id: true, code: true },
          })
        : [];
    const unitMap = new Map(unitRows.map((u) => [u.id, u.code]));

    return NextResponse.json({
      ingredients: recipeIngredients
        .filter((ri) => ingredientMap.has(ri.ingredientId))
        .map((ri) => ({
          id: ri.ingredientId,
          name: ingredientMap.get(ri.ingredientId) ?? "",
          quantity: Number(ri.quantity),
          unitCode: unitMap.get(ri.unitId) ?? "",
          notes: ri.preparationNotes,
          isOptional: ri.isOptional,
          orderIndex: ri.sortOrder,
        })),
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to fetch recipe ingredients" },
      { status: 500 }
    );
  }
}
