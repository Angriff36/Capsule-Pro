"use server";

import { auth } from "@repo/auth/server";
import {
  listDishes,
  listIngredients,
  listRecipeIngredients,
  listRecipes,
  listRecipeVersions,
  listVendorCatalogs,
} from "@/app/lib/manifest-client.generated";
import { getTenantIdForOrg } from "../../../lib/tenant";

export interface VendorRecipeCostSummary {
  costPerYield: number;
  foodCostPercent: number | null;
  ingredientCount: number;
  lastCalculated: Date | null;
  margin: number | null;
  menuPrice: number | null;
  recipeId: string;
  recipeName: string;
  recipeVersionId: string;
  totalCost: number;
  yieldQuantity: number;
  yieldUnit: string | null;
}

export interface IngredientCostDetail {
  adjustedQuantity: number;
  costPercentOfTotal: number;
  ingredientId: string;
  ingredientName: string;
  lowestVendorCost: number;
  quantity: number;
  totalCost: number;
  unit: string;
  vendorItemCount: number;
  vendorName: string | null;
  wasteFactor: number;
}

export interface VendorRecipeCostBreakdown {
  costs: {
    totalCost: number;
    costPerYield: number;
    costPerPortion: number | null;
    foodCostPercent: number | null;
  };
  ingredients: IngredientCostDetail[];
  recipe: {
    id: string;
    name: string;
    description: string | null;
    yieldQuantity: number;
    yieldUnit: string | null;
  };
  vendors: Array<{
    name: string | null;
    itemCost: number;
  }>;
}

export interface CostingSummaryStats {
  avgFoodCostPercent: number;
  highestMarginDish: {
    name: string;
    margin: number;
  } | null;
  highFoodCostAlerts: number;
  lowestMarginDish: {
    name: string;
    margin: number;
  } | null;
  recipesWithCostData: number;
  totalRecipes: number;
  totalRecipeValue: number;
}

async function assertAuthorizedTenant() {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  await getTenantIdForOrg(orgId);
}

function getLowestVendorCostByItem(vendorCatalogs: Awaited<ReturnType<typeof listVendorCatalogs>>["data"]) {
  const map = new Map<string, { cost: number; vendor: string | null; count: number }>();
  for (const entry of vendorCatalogs) {
    if (entry.deletedAt || !entry.isActive || !entry.itemName) continue;
    const key = entry.itemName.toLowerCase();
    const cost = entry.baseUnitCost ?? 0;
    const existing = map.get(key);
    if (!existing || cost < existing.cost) {
      map.set(key, { cost, vendor: entry.supplierName ?? null, count: 1 });
    } else if (cost === existing.cost) {
      existing.count += 1;
      map.set(key, existing);
    }
  }
  return map;
}

export async function getVendorRecipeCostSummary(): Promise<{
  success: boolean;
  data?: VendorRecipeCostSummary[];
  error?: string;
}> {
  try {
    await assertAuthorizedTenant();
    const [recipes, versions, ingredients, dishes] = await Promise.all([
      listRecipes(),
      listRecipeVersions(),
      listRecipeIngredients(),
      listDishes(),
    ]);
    const data = recipes.data
      .filter((recipe) => !recipe.deletedAt)
      .map((recipe) => {
        const version = versions.data
          .filter((entry) => entry.recipeId === recipe.id && !entry.deletedAt)
          .sort((a, b) => (a.versionNumber ?? 0) < (b.versionNumber ?? 0) ? 1 : -1)[0];
        const ingredientCount = ingredients.data.filter(
          (entry) => entry.recipeVersionId === version?.id && !entry.deletedAt
        ).length;
        const relatedDishes = dishes.data.filter(
          (dish) => dish.recipeId === recipe.id && !dish.deletedAt && (dish.pricePerPerson ?? 0) > 0
        );
        const menuPrice =
          relatedDishes.length > 0
            ? relatedDishes.reduce((sum, dish) => sum + (dish.pricePerPerson ?? 0), 0) /
              relatedDishes.length
            : null;
        const totalCost = version?.totalCost ?? 0;
        const yieldQuantity = version?.yieldQuantity ?? 1;
        const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;
        const foodCostPercent =
          menuPrice && menuPrice > 0 ? Number(((costPerYield / menuPrice) * 100).toFixed(2)) : null;
        const margin =
          menuPrice && menuPrice > 0
            ? Number((((menuPrice - costPerYield) / menuPrice) * 100).toFixed(2))
            : null;
        return {
          recipeId: recipe.id,
          recipeName: recipe.name ?? "",
          recipeVersionId: version?.id ?? "",
          yieldQuantity,
          yieldUnit: version?.yieldUnitId ? String(version.yieldUnitId) : null,
          totalCost,
          costPerYield,
          foodCostPercent,
          menuPrice,
          margin,
          ingredientCount,
          lastCalculated: version?.costCalculatedAt ? new Date(version.costCalculatedAt) : null,
        };
      });
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch recipe costs",
    };
  }
}

export async function getVendorRecipeCostBreakdown(recipeId: string): Promise<{
  success: boolean;
  data?: VendorRecipeCostBreakdown;
  error?: string;
}> {
  try {
    await assertAuthorizedTenant();
    const [recipes, versions, recipeIngredients, ingredients, vendorCatalogs, dishes] =
      await Promise.all([
        listRecipes(),
        listRecipeVersions(),
        listRecipeIngredients(),
        listIngredients(),
        listVendorCatalogs(),
        listDishes(),
      ]);
    const recipe = recipes.data.find((entry) => entry.id === recipeId && !entry.deletedAt);
    if (!recipe) {
      return { success: false, error: "Recipe not found" };
    }
    const version = versions.data
      .filter((entry) => entry.recipeId === recipeId && !entry.deletedAt)
      .sort((a, b) => (a.versionNumber ?? 0) < (b.versionNumber ?? 0) ? 1 : -1)[0];
    if (!version) {
      return { success: false, error: "Recipe version not found" };
    }
    const ingredientById = new Map(ingredients.data.map((entry) => [entry.id, entry]));
    const lowestVendorCostByItem = getLowestVendorCostByItem(vendorCatalogs.data);

    const detail = recipeIngredients.data
      .filter((entry) => entry.recipeVersionId === version.id && !entry.deletedAt)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((entry) => {
        const ingredient = ingredientById.get(entry.ingredientId ?? "");
        const ingredientName = ingredient?.name ?? "Ingredient";
        const vendor = lowestVendorCostByItem.get(ingredientName.toLowerCase());
        const quantity = entry.quantity ?? 0;
        const wasteFactor = entry.wasteFactor ?? 1;
        const adjustedQuantity = quantity * wasteFactor;
        const lowestVendorCost = vendor?.cost ?? 0;
        const totalCost = adjustedQuantity * lowestVendorCost;
        return {
          ingredientId: ingredient?.id ?? entry.ingredientId ?? "",
          ingredientName,
          quantity,
          unit: String(entry.unitId ?? ""),
          wasteFactor,
          adjustedQuantity,
          lowestVendorCost,
          totalCost,
          costPercentOfTotal: 0,
          vendorItemCount: vendor?.count ?? 0,
          vendorName: vendor?.vendor ?? null,
        };
      });
    const totalCost = detail.reduce((sum, entry) => sum + entry.totalCost, 0);
    for (const entry of detail) {
      entry.costPercentOfTotal = totalCost > 0 ? Number(((entry.totalCost / totalCost) * 100).toFixed(2)) : 0;
    }
    const relatedDishes = dishes.data.filter(
      (dish) => dish.recipeId === recipeId && !dish.deletedAt && (dish.pricePerPerson ?? 0) > 0
    );
    const avgPrice =
      relatedDishes.length > 0
        ? relatedDishes.reduce((sum, dish) => sum + (dish.pricePerPerson ?? 0), 0) / relatedDishes.length
        : null;
    const costPerYield = (version.yieldQuantity ?? 1) > 0 ? totalCost / (version.yieldQuantity ?? 1) : 0;
    return {
      success: true,
      data: {
        recipe: {
          id: recipe.id,
          name: recipe.name ?? "",
          description: recipe.description ?? null,
          yieldQuantity: version.yieldQuantity ?? 1,
          yieldUnit: version.yieldUnitId ? String(version.yieldUnitId) : null,
        },
        costs: {
          totalCost,
          costPerYield,
          costPerPortion: version.portionSize ? costPerYield * version.portionSize : null,
          foodCostPercent: avgPrice && avgPrice > 0 ? (costPerYield / avgPrice) * 100 : null,
        },
        ingredients: detail,
        vendors: detail
          .filter((entry) => entry.vendorName)
          .map((entry) => ({ name: entry.vendorName, itemCost: entry.lowestVendorCost })),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch recipe breakdown",
    };
  }
}

export async function getCostingSummaryStats(): Promise<{
  success: boolean;
  data?: CostingSummaryStats;
  error?: string;
}> {
  try {
    const summary = await getVendorRecipeCostSummary();
    if (!summary.success) {
      return { success: false, error: summary.error };
    }
    if (!summary.data) {
      return { success: false, error: summary.error };
    }
    const summaryData = summary.data;
    const withMargin = summaryData.filter((entry) => entry.margin !== null);
    const avgFoodCostPercent =
      withMargin.length > 0
        ? withMargin.reduce((sum, entry) => sum + (entry.foodCostPercent ?? 0), 0) / withMargin.length
        : 0;
    const sortedByMargin = [...withMargin].sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0));
    return {
      success: true,
      data: {
        avgFoodCostPercent,
        totalRecipeValue: summaryData.reduce((sum, entry) => sum + entry.totalCost, 0),
        highestMarginDish:
          sortedByMargin.length > 0
            ? {
                name: sortedByMargin.at(-1)?.recipeName ?? "",
                margin: sortedByMargin.at(-1)?.margin ?? 0,
              }
            : null,
        lowestMarginDish:
          sortedByMargin.length > 0
            ? { name: sortedByMargin[0].recipeName, margin: sortedByMargin[0].margin ?? 0 }
            : null,
        recipesWithCostData: summaryData.filter((entry) => entry.totalCost > 0).length,
        totalRecipes: summaryData.length,
        highFoodCostAlerts: summaryData.filter((entry) => (entry.foodCostPercent ?? 0) > 35).length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch summary stats",
    };
  }
}
