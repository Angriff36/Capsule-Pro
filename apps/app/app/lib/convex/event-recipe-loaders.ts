import "server-only";

import {
  activeTenantRows,
  convexDocId,
  parseDecimalString,
  serverListEntity,
  type ConvexDoc,
} from "./server-reads";

export type RecipeVersionRow = {
  recipeId: string;
  recipeName: string;
  versionId: string;
  yieldQuantity: number;
  yieldUnitCode: string | null;
  instructions: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  restTimeMinutes: number | null;
};

export type RecipeIngredientRow = {
  recipeVersionId: string;
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitCode: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
};

export type RecipeStepRow = {
  recipeVersionId: string;
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
  temperatureValue: number | null;
  temperatureUnit: string | null;
  equipmentNeeded: string[];
  tips: string | null;
};

export type InventoryItemRow = {
  ingredientId: string;
  inventoryItemId: string;
  itemName: string;
  parLevel: number | null;
};

export type InventoryStockRow = {
  itemId: string;
  onHand: number;
  unitCode: string | null;
};

function latestVersionByRecipe(
  versions: ConvexDoc[],
  recipeIds: Set<string>
): Map<string, ConvexDoc> {
  const byRecipe = new Map<string, ConvexDoc>();

  for (const version of versions) {
    const recipeId = String(version.recipeId);
    if (!recipeIds.has(recipeId)) {
      continue;
    }

    const existing = byRecipe.get(recipeId);
    const versionNumber = Number(version.versionNumber ?? 0);
    const existingNumber = existing
      ? Number(existing.versionNumber ?? 0)
      : -1;

    if (!existing || versionNumber > existingNumber) {
      byRecipe.set(recipeId, version);
    }
  }

  return byRecipe;
}

export async function loadRecipeVersionsForRecipes(
  _tenantId: string,
  recipeIds: string[]
): Promise<RecipeVersionRow[]> {
  if (recipeIds.length === 0) {
    return [];
  }

  const recipeIdSet = new Set(recipeIds);
  const [versionsRaw, recipesRaw] = await Promise.all([
    serverListEntity("RecipeVersion"),
    serverListEntity("Recipe"),
  ]);

  const recipeById = new Map(
    activeTenantRows(recipesRaw).map((recipe) => [convexDocId(recipe), recipe])
  );

  return Array.from(
    latestVersionByRecipe(activeTenantRows(versionsRaw), recipeIdSet).entries()
  ).map(([recipeId, version]) => {
    const recipe = recipeById.get(recipeId);
    return {
      recipeId,
      recipeName: String(recipe?.name ?? version.name ?? ""),
      versionId: convexDocId(version),
      yieldQuantity: parseDecimalString(version.yieldQuantity),
      yieldUnitCode:
        version.yieldUnitId != null ? String(version.yieldUnitId) : null,
      instructions: (version.instructions as string | null) ?? null,
      prepTimeMinutes:
        version.prepTimeMinutes != null
          ? Number(version.prepTimeMinutes)
          : null,
      cookTimeMinutes:
        version.cookTimeMinutes != null
          ? Number(version.cookTimeMinutes)
          : null,
      restTimeMinutes:
        version.restTimeMinutes != null
          ? Number(version.restTimeMinutes)
          : null,
    };
  });
}

export async function loadRecipeIngredientsForVersions(
  _tenantId: string,
  recipeVersionIds: string[]
): Promise<RecipeIngredientRow[]> {
  if (recipeVersionIds.length === 0) {
    return [];
  }

  const versionIdSet = new Set(recipeVersionIds);
  const [linksRaw, ingredientsRaw] = await Promise.all([
    serverListEntity("RecipeIngredient"),
    serverListEntity("Ingredient"),
  ]);

  const ingredientById = new Map(
    activeTenantRows(ingredientsRaw).map((ingredient) => [
      convexDocId(ingredient),
      ingredient,
    ])
  );

  return activeTenantRows(linksRaw)
    .filter((link) => versionIdSet.has(String(link.recipeVersionId)))
    .map((link) => ({
      link,
      ingredient: ingredientById.get(String(link.ingredientId)),
    }))
    .sort(
      (a, b) =>
        Number(a.link.sortOrder ?? 0) - Number(b.link.sortOrder ?? 0) ||
        String(a.ingredient?.name ?? "").localeCompare(
          String(b.ingredient?.name ?? "")
        )
    )
    .map(({ link, ingredient }) => ({
      recipeVersionId: String(link.recipeVersionId),
      ingredientId: String(link.ingredientId),
      ingredientName: String(ingredient?.name ?? ""),
      quantity: parseDecimalString(link.quantity),
      unitCode: link.unitId != null ? String(link.unitId) : null,
      preparationNotes: (link.preparationNotes as string | null) ?? null,
      isOptional: Boolean(link.isOptional),
    }));
}

export async function loadRecipeStepsForVersions(
  _tenantId: string,
  recipeVersionIds: string[]
): Promise<RecipeStepRow[]> {
  if (recipeVersionIds.length === 0) {
    return [];
  }

  const versionIdSet = new Set(recipeVersionIds);

  return activeTenantRows(await serverListEntity("RecipeStep"))
    .filter((step) => versionIdSet.has(String(step.recipeVersionId)))
    .map((step) => ({
      recipeVersionId: String(step.recipeVersionId),
      stepNumber: Number(step.stepNumber ?? 0),
      instruction: String(step.instruction ?? ""),
      durationMinutes:
        step.durationMinutes != null ? Number(step.durationMinutes) : null,
      temperatureValue: step.temperatureValue
        ? parseDecimalString(step.temperatureValue)
        : null,
      temperatureUnit: (step.temperatureUnit as string | null) ?? null,
      equipmentNeeded: Array.isArray(step.equipmentNeeded)
        ? (step.equipmentNeeded as string[])
        : [],
      tips: (step.tips as string | null) ?? null,
    }))
    .sort((a, b) => a.stepNumber - b.stepNumber);
}

export async function loadInventoryItemsForIngredients(
  _tenantId: string,
  ingredientIds: string[]
): Promise<InventoryItemRow[]> {
  if (ingredientIds.length === 0) {
    return [];
  }

  const ingredientIdSet = new Set(ingredientIds);
  const [ingredientsRaw, itemsRaw] = await Promise.all([
    serverListEntity("Ingredient"),
    serverListEntity("InventoryItem"),
  ]);

  const items = activeTenantRows(itemsRaw);
  const itemById = new Map(items.map((item) => [convexDocId(item), item]));
  const itemByName = new Map(
    items.map((item) => [String(item.name).toLowerCase(), item])
  );

  const rows: InventoryItemRow[] = [];

  for (const ingredient of activeTenantRows(ingredientsRaw)) {
    const ingredientId = convexDocId(ingredient);
    if (!ingredientIdSet.has(ingredientId)) {
      continue;
    }

    let item =
      ingredient.inventoryItemId != null
        ? itemById.get(String(ingredient.inventoryItemId))
        : undefined;

    if (!item) {
      item = itemByName.get(String(ingredient.name).toLowerCase());
    }

    if (!item) {
      continue;
    }

    rows.push({
      ingredientId,
      inventoryItemId: convexDocId(item),
      itemName: String(item.name ?? ""),
      parLevel: item.reorder_level
        ? parseDecimalString(item.reorder_level)
        : null,
    });
  }

  return rows;
}

export async function loadInventoryStockForItems(
  _tenantId: string,
  inventoryItemIds: string[]
): Promise<InventoryStockRow[]> {
  if (inventoryItemIds.length === 0) {
    return [];
  }

  const itemIdSet = new Set(inventoryItemIds);
  const aggregated = new Map<string, { onHand: number; unitCode: string | null }>();

  for (const stock of activeTenantRows(await serverListEntity("InventoryStock"))) {
    const itemId = String(stock.itemId);
    if (!itemIdSet.has(itemId)) {
      continue;
    }

    const qty = parseDecimalString(stock.quantityOnHand);
    const unitCode = stock.unitId != null ? String(stock.unitId) : null;
    const existing = aggregated.get(itemId);

    if (existing) {
      existing.onHand += qty;
      continue;
    }

    aggregated.set(itemId, { onHand: qty, unitCode });
  }

  return Array.from(aggregated.entries()).map(([itemId, value]) => ({
    itemId,
    onHand: value.onHand,
    unitCode: value.unitCode,
  }));
}
