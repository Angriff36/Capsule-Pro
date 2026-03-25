import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { requireTenantId } from "@/app/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

interface IngredientInput {
  name: string;
  quantity: number;
  unit: string;
  isSubRecipe?: boolean;
  subRecipeId?: string | null;
}

interface IngredientCostResult {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  cost: number;
  hasInventoryItem: boolean;
  wasteFactor: number;
}

interface CostBreakdownResult {
  totalCost: number;
  costPerYield: number;
  costPerServing: number;
  foodCostPercentage: number | null;
  targetPrice: number | null;
  ingredients: IngredientCostResult[];
}

// Helper function to get vendor catalog cost for an ingredient
async function getIngredientCost(
  tenantId: string,
  ingredientName: string,
  quantity: number,
  unit: string
): Promise<{ cost: number; unitCost: number; hasInventoryItem: boolean; wasteFactor: number }> {
  // Try to find ingredient by name
  const [ingredient] = await database.$queryRaw<
    { id: string; default_unit_id: number; waste_factor?: number }[]
  >(
    Prisma.sql`
      SELECT id, default_unit_id, COALESCE(waste_factor, 1.0) as waste_factor
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${ingredientName}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!ingredient) {
    return { cost: 0, unitCost: 0, hasInventoryItem: false, wasteFactor: 1 };
  }

  // Get waste factor from ingredient or default to 1
  const wasteFactor = ingredient.waste_factor ?? 1;

  // Try to find vendor catalog entry for this ingredient
  const [catalogEntry] = await database.$queryRaw<
    { base_unit_cost: number; unit_of_measure: string }[]
  >(
    Prisma.sql`
      SELECT vc.base_unit_cost, vc.unit_of_measure
      FROM tenant_inventory.vendor_catalog vc
      WHERE vc.tenant_id = ${tenantId}
        AND vc.item_name = ${ingredientName}
        AND vc.is_active = true
        AND (vc.effective_from IS NULL OR vc.effective_from <= CURRENT_DATE)
        AND (vc.effective_to IS NULL OR vc.effective_to >= CURRENT_DATE)
      ORDER BY vc.last_cost_update DESC NULLS LAST
      LIMIT 1
    `
  );

  if (!catalogEntry) {
    return { cost: 0, unitCost: 0, hasInventoryItem: false, wasteFactor };
  }

  // Calculate cost (simplified - assumes unit conversion would be handled)
  // In production, you'd need proper unit conversion logic
  const unitCost = Number(catalogEntry.base_unit_cost);
  const cost = quantity * unitCost * wasteFactor;

  return { cost, unitCost, hasInventoryItem: true, wasteFactor };
}

// Helper function to get sub-recipe cost
async function getSubRecipeCost(
  tenantId: string,
  subRecipeId: string,
  scaleFactor: number
): Promise<{ cost: number; ingredients: IngredientCostResult[] }> {
  // Get the latest version of the sub-recipe
  const [version] = await database.$queryRaw<
    {
      id: string;
      total_cost: number;
      cost_per_yield: number;
      yield_quantity: number;
    }[]
  >(
    Prisma.sql`
      SELECT rv.id, rv.total_cost, rv.cost_per_yield, rv.yield_quantity
      FROM tenant_kitchen.recipe_versions rv
      WHERE rv.tenant_id = ${tenantId}
        AND rv.recipe_id = ${subRecipeId}
        AND rv.deleted_at IS NULL
      ORDER BY rv.version_number DESC
      LIMIT 1
    `
  );

  if (!version) {
    return { cost: 0, ingredients: [] };
  }

  // Get ingredients for sub-recipe
  const ingredients = await database.$queryRaw<
    {
      id: string;
      ingredient_id: string;
      ingredient_name: string;
      quantity: number;
      unit_code: string;
      ingredient_cost: number;
      waste_factor: number;
    }[]
  >(
    Prisma.sql`
      SELECT
        ri.id,
        ri.ingredient_id,
        i.name AS ingredient_name,
        ri.quantity,
        u.code AS unit_code,
        COALESCE(ri.ingredient_cost, 0) AS ingredient_cost,
        COALESCE(ri.waste_factor, 1.0) AS waste_factor
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      LEFT JOIN core.units u ON u.id = ri.unit_id
      WHERE ri.recipe_version_id = ${version.id}
        AND ri.tenant_id = ${tenantId}
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order ASC
    `
  );

  const ingredientCosts: IngredientCostResult[] = ingredients.map((ing) => ({
    id: ing.id,
    name: ing.ingredient_name,
    quantity: Number(ing.quantity) * scaleFactor,
    unit: ing.unit_code,
    unitCost: ing.ingredient_cost / Number(ing.quantity),
    cost: Number(ing.ingredient_cost) * scaleFactor,
    hasInventoryItem: ing.ingredient_cost > 0,
    wasteFactor: Number(ing.waste_factor),
  }));

  return {
    cost: Number(version.total_cost) * scaleFactor,
    ingredients: ingredientCosts,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await requireTenantId();
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
      return NextResponse.json(
        { error: "Invalid ingredients format" },
        { status: 400 }
      );
    }

    const ingredientCosts: IngredientCostResult[] = [];
    let totalCost = 0;

    // Calculate cost for each ingredient
    for (const ingredient of ingredients) {
      let cost = 0;
      let unitCost = 0;
      let hasInventoryItem = false;
      let wasteFactor = 1;

      const scaledQuantity = ingredient.quantity * scaleFactor;

      if (ingredient.isSubRecipe && ingredient.subRecipeId) {
        // Handle sub-recipe
        const subRecipeResult = await getSubRecipeCost(
          tenantId,
          ingredient.subRecipeId,
          scaleFactor
        );
        cost = subRecipeResult.cost;
        unitCost = cost / scaledQuantity;
        hasInventoryItem = true;
        // Add nested ingredients
        ingredientCosts.push(...subRecipeResult.ingredients);
        continue;
      } else {
        // Handle regular ingredient
        const costResult = await getIngredientCost(
          tenantId,
          ingredient.name,
          scaledQuantity,
          ingredient.unit
        );
        cost = costResult.cost;
        unitCost = costResult.unitCost;
        hasInventoryItem = costResult.hasInventoryItem;
        wasteFactor = costResult.wasteFactor;
      }

      totalCost += cost;

      ingredientCosts.push({
        id: `ing-${ingredient.name}`,
        name: ingredient.name,
        quantity: scaledQuantity,
        unit: ingredient.unit,
        unitCost,
        cost,
        hasInventoryItem,
        wasteFactor,
      });
    }

    // Calculate cost per yield and cost per serving
    const costPerYield = totalCost / yieldQuantity;
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
    return NextResponse.json(
      { error: "Failed to calculate recipe cost" },
      { status: 500 }
    );
  }
}
