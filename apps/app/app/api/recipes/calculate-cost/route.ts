import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { listRecipeVersions } from "@/app/lib/manifest-client.generated";
import { getVendorRecipeCostBreakdown } from "@/app/(authenticated)/kitchen/recipes/costing-actions";

interface IngredientInput {
  isSubRecipe?: boolean;
  name: string;
  quantity: number;
  subRecipeId?: string | null;
  unit: string;
}

interface IngredientCostResult {
  cost: number;
  hasInventoryItem: boolean;
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wasteFactor: number;
}

interface CostBreakdownResult {
  costPerServing: number;
  costPerYield: number;
  foodCostPercentage: number | null;
  ingredients: IngredientCostResult[];
  targetPrice: number | null;
  totalCost: number;
}

async function getSubRecipeCost(
  subRecipeId: string,
  scaleFactor: number
): Promise<{ cost: number; ingredients: IngredientCostResult[] }> {
  const version = (await listRecipeVersions()).data
    .filter((entry) => entry.recipeId === subRecipeId && !entry.deletedAt)
    .sort((a, b) => (a.versionNumber ?? 0) < (b.versionNumber ?? 0) ? 1 : -1)[0];
  if (!version) {
    return { cost: 0, ingredients: [] };
  }
  const breakdown = await getVendorRecipeCostBreakdown(subRecipeId);
  if (!breakdown.success) {
    return { cost: 0, ingredients: [] };
  }
  if (!breakdown.data) {
    return { cost: 0, ingredients: [] };
  }
  const ingredients = breakdown.data.ingredients.map((entry) => ({
    id: entry.ingredientId,
    name: entry.ingredientName,
    quantity: entry.quantity * scaleFactor,
    unit: entry.unit,
    unitCost: entry.lowestVendorCost,
    cost: entry.totalCost * scaleFactor,
    hasInventoryItem: entry.lowestVendorCost > 0,
    wasteFactor: entry.wasteFactor,
  }));
  return {
    cost: (version.totalCost ?? 0) * scaleFactor,
    ingredients,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      ingredients,
      scaleFactor = 1,
      yieldQuantity = 1,
    } = body as {
      ingredients: IngredientInput[];
      scaleFactor?: number;
      yieldQuantity?: number;
    };

    if (!Array.isArray(ingredients)) {
      return NextResponse.json({ error: "Invalid ingredients format" }, { status: 400 });
    }

    const ingredientCosts: IngredientCostResult[] = [];
    let totalCost = 0;

    for (const ingredient of ingredients) {
      const scaledQuantity = ingredient.quantity * scaleFactor;
      if (ingredient.isSubRecipe && ingredient.subRecipeId) {
        const subRecipeResult = await getSubRecipeCost(ingredient.subRecipeId, scaleFactor);
        totalCost += subRecipeResult.cost;
        ingredientCosts.push(...subRecipeResult.ingredients);
        continue;
      }
      const breakdown = await getVendorRecipeCostBreakdown(ingredient.subRecipeId ?? "");
      const fallbackCost = breakdown.success && breakdown.data
        ? breakdown.data.ingredients.find(
            (entry) => entry.ingredientName.toLowerCase() === ingredient.name.toLowerCase()
          )
        : null;
      const unitCost = fallbackCost?.lowestVendorCost ?? 0;
      const wasteFactor = fallbackCost?.wasteFactor ?? 1;
      const cost = scaledQuantity * unitCost * wasteFactor;
      totalCost += cost;
      ingredientCosts.push({
        id: `ing-${ingredient.name}`,
        name: ingredient.name,
        quantity: scaledQuantity,
        unit: ingredient.unit,
        unitCost,
        cost,
        hasInventoryItem: unitCost > 0,
        wasteFactor,
      });
    }

    const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;
    const costPerServing = costPerYield;
    return NextResponse.json<CostBreakdownResult>({
      totalCost,
      costPerYield,
      costPerServing,
      foodCostPercentage: null,
      targetPrice: null,
      ingredients: ingredientCosts,
    });
  } catch (error) {
    console.error("Error calculating recipe cost:", error);
    return NextResponse.json({ error: "Failed to calculate recipe cost" }, { status: 500 });
  }
}
