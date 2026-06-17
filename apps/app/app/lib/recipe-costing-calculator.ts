import {
  listIngredients,
  listRecipeIngredients,
  listRecipeVersions,
  listVendorCatalogs,
  recipeVersionUpdateCosts,
} from "@/app/lib/manifest-client.generated";

export interface RecipeCostBreakdownCore {
  costPerPortion?: number;
  costPerYield: number;
  ingredients: IngredientCostBreakdownCore[];
  totalCost: number;
}

export interface IngredientCostBreakdownCore {
  adjustedQuantity: number;
  cost: number;
  hasInventoryItem: boolean;
  id: string;
  inventoryItemId?: string | null;
  name: string;
  quantity: number;
  recipeIngredientId: string;
  unit: string;
  unitCost: number;
  wasteFactor: number;
}

export interface ScaledRecipeCostCore {
  originalCost: number;
  scaledCostPerPortion: number | null;
  scaledCostPerYield: number;
  scaledTotalCost: number;
  scaleFactor: number;
}

export async function calculateRecipeCostBreakdown(
  recipeVersionId: string,
  options: { persist?: boolean } = {}
): Promise<RecipeCostBreakdownCore | null> {
  const [recipeVersions, recipeIngredients, ingredients, vendorCatalogs] =
    await Promise.all([
      listRecipeVersions(),
      listRecipeIngredients(),
      listIngredients(),
      listVendorCatalogs(),
    ]);

  const version = recipeVersions.data.find(
    (entry) => entry.id === recipeVersionId && !entry.deletedAt
  );
  if (!version) {
    return null;
  }

  const ingredientById = new Map(
    ingredients.data.map((entry) => [entry.id, entry])
  );
  const lowestCatalogCostByName = new Map<string, number>();
  for (const catalog of vendorCatalogs.data) {
    if (catalog.deletedAt || !catalog.isActive || !catalog.itemName) {
      continue;
    }
    const key = catalog.itemName.trim().toLowerCase();
    const unitCost = catalog.baseUnitCost ?? 0;
    const current = lowestCatalogCostByName.get(key);
    if (current === undefined || unitCost < current) {
      lowestCatalogCostByName.set(key, unitCost);
    }
  }

  let totalCost = 0;
  const breakdown = recipeIngredients.data
    .filter(
      (entry) => entry.recipeVersionId === recipeVersionId && !entry.deletedAt
    )
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((entry) => {
      const ingredient = ingredientById.get(entry.ingredientId ?? "");
      const ingredientName = ingredient?.name ?? "Ingredient";
      const quantity = entry.quantity ?? 0;
      const wasteFactor = entry.wasteFactor ?? 1;
      const adjustedQuantity = quantity * wasteFactor;
      const unitCost =
        lowestCatalogCostByName.get(ingredientName.toLowerCase()) ?? 0;
      const cost = adjustedQuantity * unitCost;
      totalCost += cost;
      return {
        id: entry.id,
        recipeIngredientId: entry.id,
        name: ingredientName,
        quantity,
        unit: String(entry.unitId ?? ""),
        wasteFactor,
        adjustedQuantity,
        unitCost,
        cost,
        hasInventoryItem: unitCost > 0,
        inventoryItemId: null,
      };
    });

  const yieldQuantity = version.yieldQuantity ?? 1;
  const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;

  if (options.persist) {
    await recipeVersionUpdateCosts({
      id: recipeVersionId,
      newTotalCost: totalCost,
      newCostPerYield: costPerYield,
    });
  }

  return {
    totalCost,
    costPerYield,
    ingredients: breakdown,
  };
}

export async function scaleRecipeCostBreakdown(
  recipeVersionId: string,
  targetPortions: number,
  currentYield: number
): Promise<ScaledRecipeCostCore> {
  const summary = await calculateRecipeCostBreakdown(recipeVersionId);
  const originalCost = summary?.totalCost ?? 0;
  const scaleFactor = currentYield > 0 ? targetPortions / currentYield : 0;
  const scaledTotalCost = originalCost * scaleFactor;
  const scaledCostPerYield = (summary?.costPerYield ?? 0) * scaleFactor;

  return {
    originalCost,
    scaleFactor,
    scaledTotalCost,
    scaledCostPerYield,
    scaledCostPerPortion: null,
  };
}
