import { auth } from "@repo/auth/server";
import {
  listEvents,
  listIngredients,
  listPrepTasks,
  listRecipeIngredients,
  listRecipeVersions,
  listVendorCatalogs,
  recipeIngredientUpdateWasteFactor,
  recipeVersionUpdateCosts,
} from "@/app/lib/manifest-client.generated";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

export interface RecipeCostBreakdown {
  costPerPortion?: number;
  costPerYield: number;
  ingredients: IngredientCostBreakdown[];
  totalCost: number;
}

export interface IngredientCostBreakdown {
  adjustedQuantity: number;
  cost: number;
  hasInventoryItem: boolean;
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  wasteFactor: number;
}

export interface ScaledRecipeCost {
  originalCost: number;
  scaledCostPerYield: number;
  scaledTotalCost: number;
  scaleFactor: number;
}

async function getTenantId() {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  return getTenantIdForOrg(orgId);
}

async function calculateRecipeCost(recipeVersionId: string): Promise<RecipeCostBreakdown | null> {
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

  const ingredientById = new Map(ingredients.data.map((entry) => [entry.id, entry]));
  const lowestCatalogCostByName = new Map<string, number>();
  for (const catalog of vendorCatalogs.data) {
    if (catalog.deletedAt || !catalog.isActive || !catalog.itemName) continue;
    const key = catalog.itemName.trim().toLowerCase();
    const unitCost = catalog.baseUnitCost ?? 0;
    const current = lowestCatalogCostByName.get(key);
    if (current === undefined || unitCost < current) {
      lowestCatalogCostByName.set(key, unitCost);
    }
  }

  let totalCost = 0;
  const breakdown = recipeIngredients.data
    .filter((entry) => entry.recipeVersionId === recipeVersionId && !entry.deletedAt)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((entry) => {
      const ingredient = ingredientById.get(entry.ingredientId ?? "");
      const ingredientName = ingredient?.name ?? "Ingredient";
      const quantity = entry.quantity ?? 0;
      const wasteFactor = entry.wasteFactor ?? 1;
      const adjustedQuantity = quantity * wasteFactor;
      const unitCost = lowestCatalogCostByName.get(ingredientName.toLowerCase()) ?? 0;
      const cost = adjustedQuantity * unitCost;
      totalCost += cost;
      return {
        id: entry.id,
        name: ingredientName,
        quantity,
        unit: String(entry.unitId ?? ""),
        wasteFactor,
        adjustedQuantity,
        unitCost,
        cost,
        hasInventoryItem: unitCost > 0,
      };
    });

  const yieldQuantity = version.yieldQuantity ?? 1;
  const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;
  await recipeVersionUpdateCosts({
    id: recipeVersionId,
    newTotalCost: totalCost,
    newCostPerYield: costPerYield,
  });

  return { totalCost, costPerYield, ingredients: breakdown };
}

export const getRecipeCostSummary = async (
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> => calculateRecipeCost(recipeVersionId);

export const recalculateRecipeCosts = async (
  recipeVersionId: string
): Promise<RecipeCostBreakdown | null> => calculateRecipeCost(recipeVersionId);

export const scaleRecipeCost = async (
  recipeVersionId: string,
  targetPortions: number,
  currentYield: number
): Promise<ScaledRecipeCost> => {
  const summary = await calculateRecipeCost(recipeVersionId);
  const originalCost = summary?.totalCost ?? 0;
  const scaleFactor = currentYield > 0 ? targetPortions / currentYield : 0;
  return {
    originalCost,
    scaleFactor,
    scaledTotalCost: originalCost * scaleFactor,
    scaledCostPerYield: (summary?.costPerYield ?? 0) * scaleFactor,
  };
};

export const updateRecipeIngredientWasteFactor = async (
  recipeIngredientId: string,
  wasteFactor: number
): Promise<void> => {
  if (wasteFactor <= 0) {
    throw new Error("Waste factor must be greater than 0");
  }
  await recipeIngredientUpdateWasteFactor({
    id: recipeIngredientId,
    newWasteFactor: wasteFactor,
  });
};

export const updateEventBudgetsForRecipe = async (
  recipeVersionId: string
): Promise<void> => {
  await getTenantId();
  const user = await requireCurrentUser();
  const [prepTasks, recipeVersions, events] = await Promise.all([
    listPrepTasks(),
    listRecipeVersions(),
    listEvents(),
  ]);
  const version = recipeVersions.data.find((entry) => entry.id === recipeVersionId);
  if (!version) return;
  const impactedEventIds = new Set(
    prepTasks.data
      .filter((task) => task.recipeVersionId === recipeVersionId && task.eventId && !task.deletedAt)
      .map((task) => task.eventId as string)
  );
  for (const event of events.data) {
    if (!impactedEventIds.has(event.id)) continue;
    await runManifestCommand({
      entity: "Event",
      command: "updateBudget",
      body: {
        id: event.id,
        newBudget: (event.budget ?? 0) + (version.totalCost ?? 0),
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  }
};
