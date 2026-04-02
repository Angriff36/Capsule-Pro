/**
 * GET /api/kitchen/recipes/[recipeId]/ingredients
 * Returns the ingredient list for a recipe's latest active version.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const { recipeId } = await params;

    // Verify recipe exists
    const recipe = await database.recipe.findFirst({
      where: { id: recipeId, tenantId, deletedAt: null },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Get latest active version
    const version = await database.recipeVersion.findFirst({
      where: { recipeId, tenantId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!version) {
      return NextResponse.json({ ingredients: [] });
    }

    // Get recipe ingredients
    const recipeIngredients = await database.recipeIngredient.findMany({
      where: { recipeVersionId: version.id, tenantId },
      orderBy: { sortOrder: "asc" },
    });

    if (!recipeIngredients.length) {
      return NextResponse.json({ ingredients: [] });
    }

    // Resolve ingredient names
    const ingredientIds = recipeIngredients.map((ri) => ri.ingredientId);
    const ingredients = await database.ingredient.findMany({
      where: { id: { in: ingredientIds } },
    });
    const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

    // Resolve unit codes
    const unitIds = recipeIngredients.map((ri) => ri.unitId).filter(Boolean) as number[];
    const units = unitIds.length
      ? await database.units.findMany({ where: { id: { in: unitIds } } })
      : [];
    const unitMap = new Map(units.map((u) => [u.id, u]));

    const result = recipeIngredients.map((ri) => ({
      id: ri.ingredientId,
      name: ingredientMap.get(ri.ingredientId)?.name ?? "",
      quantity: ri.quantity,
      unitCode: ri.unitId != null ? (unitMap.get(ri.unitId)?.code ?? null) : null,
      notes: ri.preparationNotes ?? null,
      isOptional: ri.isOptional ?? false,
      orderIndex: ri.sortOrder ?? 0,
    }));

    return NextResponse.json({ ingredients: result });
  } catch (error) {
    console.error("Error fetching recipe ingredients:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
