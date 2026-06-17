"use server";

import {
  listDishes,
  listIngredients,
  listInventoryItems,
  listRecipes,
} from "@/app/lib/manifest-client.generated";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../../lib/tenant";

interface CandidateRow {
  id: string;
  name: string;
}

const SUPPLY_KEYWORDS = [
  "chafing",
  "chafer",
  "sterno",
  "serveware",
  "servingware",
  "plate",
  "utensil",
  "fork",
  "spoon",
  "knife",
  "napkin",
  "plasticware",
  "disposable",
  "tray",
  "pan",
  "lid",
  "container",
  "place setting",
  "cutlery",
  "tongs",
];

const BEVERAGE_KEYWORDS = [
  "water",
  "iced tea",
  "tea",
  "lemonade",
  "coffee",
  "juice",
  "soda",
  "beverage",
  "drink",
];

const INGREDIENT_KEYWORDS = [
  "cheese",
  "lettuce",
  "tortilla",
  "rice",
  "beans",
  "salsa",
  "cream",
  "butter",
  "onion",
  "pickles",
  "tomato",
  "cilantro",
  "lime",
  "garlic",
  "pepper",
  "salt",
];

const normalize = (value: string) =>
  value
    .replace(/\uFEFF/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const classifyCandidate = (name: string) => {
  const normalized = normalize(name);

  if (SUPPLY_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "inventory", category: "serveware" };
  }

  const isBeverage = BEVERAGE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
  if (isBeverage) {
    const isPackaged =
      normalized.includes("bottle") || normalized.includes("bottled");
    return {
      action: isPackaged ? "inventory" : "skip",
      category: "beverage",
    };
  }

  if (INGREDIENT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return { action: "ingredient", category: "ingredient" };
  }

  return { action: "skip", category: "menu" };
};

const insertInventoryItem = async (
  tenantId: string,
  user: { id: string; tenantId: string; role: string },
  name: string,
  category: string
) => {
  const existing = (await listInventoryItems()).data.find(
    (item) =>
      item.tenantId === tenantId &&
      !item.deletedAt &&
      item.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return existing.id;
  }
  const itemNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  const created = await runManifestCommand({
    entity: "InventoryItem",
    command: "create",
    body: {
      item_number: itemNumber,
      name,
      category,
      description: "Created by cleanup",
      unitOfMeasure: "unit",
      unitCost: 0,
      quantityOnHand: 0,
      parLevel: 0,
      reorder_level: 0,
      supplierId: "",
      tags: ["cleanup"],
      fsa_status: "",
      fsa_temp_logged: false,
      fsa_allergen_info: false,
      fsa_traceable: false,
    },
    user,
  });
  if (!created.ok) {
    throw new Error(created.message || "Failed to create inventory item");
  }
  return (created.result as { id?: string } | null)?.id ?? null;
};

const getFallbackUnitId = async () => {
  const unitIds = (await listIngredients()).data
    .map((ingredient) => ingredient.defaultUnitId)
    .filter((unitId): unitId is number => typeof unitId === "number")
    .sort((a, b) => a - b);
  return unitIds[0];
};

const insertIngredient = async (
  tenantId: string,
  user: { id: string; tenantId: string; role: string },
  name: string,
  defaultUnitId: number,
  category: string
) => {
  const existing = (await listIngredients()).data.find(
    (ingredient) =>
      ingredient.tenantId === tenantId &&
      !ingredient.deletedAt &&
      ingredient.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return existing.id;
  }
  const created = await runManifestCommand({
    entity: "Ingredient",
    command: "create",
    body: {
      name,
      category,
      defaultUnitId,
      densityGPerMl: 1,
      shelfLifeDays: 0,
      storageInstructions: "",
      allergens: [],
    },
    user,
  });
  if (!created.ok) {
    throw new Error(created.message || "Failed to create ingredient");
  }
  return (created.result as { id?: string } | null)?.id ?? null;
};

const deactivateRecipeAndDish = async (
  tenantId: string,
  user: { id: string; tenantId: string; role: string },
  recipeId: string
) => {
  const recipeResult = await runManifestCommand({
    entity: "Recipe",
    command: "deactivate",
    instanceId: recipeId,
    body: { reason: "Cleanup imported item" },
    user,
  });
  if (!recipeResult.ok) {
    throw new Error(recipeResult.message || "Failed to deactivate recipe");
  }

  const dishes = (await listDishes()).data.filter(
    (dish) => dish.tenantId === tenantId && !dish.deletedAt && dish.recipeId === recipeId
  );
  for (const dish of dishes) {
    const dishResult = await runManifestCommand({
      entity: "Dish",
      command: "deactivate",
      instanceId: dish.id,
      body: { reason: "Cleanup imported item", userId: user.id },
      user,
    });
    if (!dishResult.ok) {
      throw new Error(dishResult.message || "Failed to deactivate dish");
    }
  }
};

export const cleanupImportedItems = async (formData: FormData) => {
  const tenantId = await requireTenantId();
  const user = await requireCurrentUser();
  const recipeIds = formData.getAll("recipeIds").map(String);
  if (recipeIds.length === 0) {
    redirect("/kitchen/recipes");
  }

  const candidates: CandidateRow[] = (await listRecipes()).data
    .filter(
      (recipe) =>
        recipe.tenantId === tenantId &&
        !recipe.deletedAt &&
        recipeIds.includes(recipe.id)
    )
    .map((recipe) => ({ id: recipe.id, name: recipe.name }));

  const fallbackUnitId = await getFallbackUnitId();
  if (!fallbackUnitId) {
    throw new Error("No units configured in core.units.");
  }

  for (const candidate of candidates) {
    const classification = classifyCandidate(candidate.name);
    if (classification.action === "inventory") {
      await insertInventoryItem(
        tenantId,
        user,
        candidate.name,
        classification.category
      );
      await deactivateRecipeAndDish(tenantId, user, candidate.id);
      continue;
    }

    if (classification.action === "ingredient") {
      await insertIngredient(
        tenantId,
        user,
        candidate.name,
        fallbackUnitId,
        classification.category
      );
      await deactivateRecipeAndDish(tenantId, user, candidate.id);
    }
  }

  revalidatePath("/kitchen/recipes");
  revalidatePath("/kitchen/recipes/cleanup");
  redirect("/kitchen/recipes");
};
