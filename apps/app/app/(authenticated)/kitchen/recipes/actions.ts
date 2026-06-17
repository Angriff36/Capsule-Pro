"use server";

import { randomUUID } from "node:crypto";
import {
  dishCreate,
  dishDeactivate,
  dishUpdate,
  dishUpdatePricing,
  listDishes,
  listIngredients,
  listRecipeIngredients,
  listRecipes,
  listRecipeSteps,
  listRecipeVersions,
  recipeDeactivate,
  recipeUpdate,
} from "@/app/lib/manifest-client.generated";
import { put } from "@repo/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invariant } from "../../../lib/invariant";
import { requireTenantId } from "../../../lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

const parseList = (value: FormDataEntryValue | null) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const parseNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readImageFile = (formData: FormData, key: string) => {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Image must be an image file.");
  }
  return file;
};

const uploadImage = async (tenantId: string, pathPrefix: string, file: File) => {
  const filename = file.name?.trim() || "image";
  const blob = await put(`tenants/${tenantId}/${pathPrefix}/${filename}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });
  return blob.url;
};

export interface RecipeForEdit {
  category: string | null;
  description: string | null;
  id: string;
  ingredients: {
    id: string;
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string;
    isOptional: boolean;
    sortOrder: number;
  }[];
  name: string;
  steps: {
    id: string;
    stepNumber: number;
    instruction: string;
    imageUrl: string | null;
  }[];
  tags: string[];
  version: {
    id: string;
    versionNumber: number;
    yieldQuantity: number;
    yieldUnit: string;
    yieldDescription: string | null;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    restTimeMinutes: number | null;
    difficultyLevel: number | null;
    notes: string | null;
  };
}

export const updateRecipeImage = async (recipeId: string, formData: FormData) => {
  const tenantId = await requireTenantId();
  if (!recipeId) {
    throw new Error("Recipe id is required.");
  }
  const imageFile = readImageFile(formData, "imageFile");
  if (!imageFile) {
    return;
  }
  const imageUrl = await uploadImage(tenantId, `recipes/${recipeId}/hero`, imageFile);
  const latestVersion = (await listRecipeVersions()).data
    .filter((version) => version.recipeId === recipeId && !version.deletedAt)
    .sort((a, b) => (a.versionNumber ?? 0) < (b.versionNumber ?? 0) ? 1 : -1)[0];
  if (latestVersion?.id) {
    await runManifestCommand({
      entity: "RecipeStep",
      command: "create",
      body: {
        recipeVersionId: latestVersion.id,
        stepNumber: 1,
        instruction: "Reference photo",
        imageUrl,
      },
    });
  }
  revalidatePath("/kitchen/recipes");
};

export const createDish = async (formData: FormData) => {
  const tenantId = await requireTenantId();
  const name = String(formData.get("name") || "").trim();
  const recipeId = String(formData.get("recipeId") || "").trim();
  if (!(name && recipeId)) {
    throw new Error("Dish name and recipe are required.");
  }
  const imageFile = readImageFile(formData, "imageFile");
  const dishId = randomUUID();
  const imageUrl = imageFile
    ? await uploadImage(tenantId, `dishes/${dishId}/hero`, imageFile)
    : null;

  await dishCreate({
    recipeId,
    name,
    description: String(formData.get("description") || "").trim() || "",
    category: String(formData.get("category") || "").trim() || "",
    serviceStyle: String(formData.get("serviceStyle") || "").trim() || "",
    defaultContainerId: "",
    presentationImageUrl: imageUrl ?? "",
    minPrepLeadDays: parseNumber(formData.get("minPrepLeadDays")) ?? 0,
    maxPrepLeadDays: parseNumber(formData.get("maxPrepLeadDays")) ?? 0,
    portionSizeDescription:
      String(formData.get("portionSizeDescription") || "").trim() || "",
    dietaryTags: parseList(formData.get("dietaryTags")),
    allergens: parseList(formData.get("allergens")),
    pricePerPerson: parseNumber(formData.get("pricePerPerson")) ?? 0,
    costPerPerson: parseNumber(formData.get("costPerPerson")) ?? 0,
  });

  revalidatePath("/kitchen/recipes");
  redirect("/kitchen/recipes?tab=dishes");
};

export const getRecipeForEdit = async (
  recipeId: string
): Promise<RecipeForEdit | null> => {
  if (!recipeId) {
    return null;
  }
  const recipe = (await listRecipes()).data.find(
    (entry) => entry.id === recipeId && !entry.deletedAt
  );
  if (!recipe) {
    return null;
  }
  const version = (await listRecipeVersions()).data
    .filter((entry) => entry.recipeId === recipeId && !entry.deletedAt)
    .sort((a, b) => (a.versionNumber ?? 0) < (b.versionNumber ?? 0) ? 1 : -1)[0];
  if (!version) {
    return null;
  }
  const ingredientsById = new Map(
    (await listIngredients()).data.map((ingredient) => [ingredient.id, ingredient])
  );
  const ingredients = (await listRecipeIngredients()).data
    .filter((entry) => entry.recipeVersionId === version.id && !entry.deletedAt)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((entry) => ({
      id: entry.id,
      ingredientId: entry.ingredientId ?? "",
      name: ingredientsById.get(entry.ingredientId ?? "")?.name ?? "Ingredient",
      quantity: entry.quantity ?? 0,
      unit: String(entry.unitId ?? ""),
      isOptional: entry.isOptional ?? false,
      sortOrder: entry.sortOrder ?? 0,
    }));
  const steps = (await listRecipeSteps()).data
    .filter((entry) => entry.recipeVersionId === version.id && !entry.deletedAt)
    .sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0))
    .map((entry) => ({
      id: entry.id,
      stepNumber: entry.stepNumber ?? 0,
      instruction: entry.instruction ?? "",
      imageUrl: entry.imageUrl ?? null,
    }));
  return {
    id: recipe.id,
    name: recipe.name ?? "",
    category: recipe.category ?? null,
    description: recipe.description ?? null,
    tags: recipe.tags ?? [],
    version: {
      id: version.id,
      versionNumber: version.versionNumber ?? 1,
      yieldQuantity: version.yieldQuantity ?? 1,
      yieldUnit: String(version.yieldUnitId ?? ""),
      yieldDescription: version.yieldDescription ?? null,
      prepTimeMinutes: version.prepTimeMinutes ?? null,
      cookTimeMinutes: version.cookTimeMinutes ?? null,
      restTimeMinutes: version.restTimeMinutes ?? null,
      difficultyLevel: version.difficultyLevel ?? null,
      notes: version.notes ?? null,
    },
    ingredients,
    steps,
  };
};

export const deleteRecipe = async (recipeId: string) => {
  await recipeDeactivate({ id: recipeId, reason: "Deleted from recipes UI" });
  revalidatePath("/kitchen/recipes");
};

export const deleteDish = async (dishId: string) => {
  await dishDeactivate({ id: dishId, reason: "Deleted from recipes UI" });
  revalidatePath("/kitchen/recipes");
};

export const bulkDeleteRecipes = async (recipeIds: string[]) => {
  for (const recipeId of recipeIds) {
    await recipeDeactivate({ id: recipeId, reason: "Bulk deleted from recipes UI" });
  }
  revalidatePath("/kitchen/recipes");
};

export const bulkDeleteDishes = async (dishIds: string[]) => {
  for (const dishId of dishIds) {
    await dishDeactivate({ id: dishId, reason: "Bulk deleted from recipes UI" });
  }
  revalidatePath("/kitchen/recipes");
};

export const renameRecipe = async (recipeId: string, newName: string) => {
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw new Error("Recipe name cannot be empty.");
  }
  await recipeUpdate({ id: recipeId, newName: trimmedName });
  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/${recipeId}`);
};

export const updateDish = async (dishId: string, formData: FormData) => {
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    throw new Error("Dish name is required.");
  }
  await dishUpdate({
    id: dishId,
    newName: name,
    newDescription: String(formData.get("description") || "").trim() || "",
    newCategory: String(formData.get("category") || "").trim() || "",
    newServiceStyle: String(formData.get("serviceStyle") || "").trim() || "",
    newPortionSizeDescription:
      String(formData.get("portionSizeDescription") || "").trim() || "",
    newDietaryTags: parseList(formData.get("dietaryTags")),
    newAllergens: parseList(formData.get("allergens")),
    newMinPrepLeadDays: parseNumber(formData.get("minPrepLeadDays")) ?? 0,
    newMaxPrepLeadDays: parseNumber(formData.get("maxPrepLeadDays")) ?? 0,
  });
  await dishUpdatePricing({
    id: dishId,
    newPricePerPerson: parseNumber(formData.get("pricePerPerson")) ?? 0,
    newCostPerPerson: parseNumber(formData.get("costPerPerson")) ?? 0,
  });
  revalidatePath("/kitchen/recipes");
  revalidatePath(`/kitchen/recipes/dishes/${dishId}`);
};

export const updateRecipeName = async (recipeId: string, name: string) => {
  invariant(name.trim().length > 0, "Name cannot be empty");
  await recipeUpdate({ id: recipeId, newName: name.trim() });
  revalidatePath("/kitchen/recipes");
};

export const updateDishName = async (dishId: string, name: string) => {
  invariant(name.trim().length > 0, "Name cannot be empty");
  await dishUpdate({ id: dishId, newName: name.trim() });
  revalidatePath("/kitchen/recipes");
};

export const updateDishPrice = async (dishId: string, price: string) => {
  const num = Number.parseFloat(price);
  invariant(!Number.isNaN(num) && num >= 0, "Invalid price");
  await dishUpdatePricing({ id: dishId, newPricePerPerson: num });
  revalidatePath("/kitchen/recipes");
};

export const bulkUpdateDishPrice = async (dishIds: string[], price: string) => {
  const num = Number.parseFloat(price);
  invariant(!Number.isNaN(num) && num >= 0, "Invalid price");
  for (const dishId of dishIds) {
    await dishUpdatePricing({ id: dishId, newPricePerPerson: num });
  }
  revalidatePath("/kitchen/recipes");
};

export const bulkUpdateNames = async (
  ids: string[],
  type: "recipes" | "dishes",
  name: string
) => {
  invariant(name.trim().length > 0, "Name cannot be empty");
  if (type === "recipes") {
    for (const id of ids) {
      await recipeUpdate({ id, newName: name.trim() });
    }
  } else {
    for (const id of ids) {
      await dishUpdate({ id, newName: name.trim() });
    }
  }
  revalidatePath("/kitchen/recipes");
};

export interface DishSummary {
  category: string | null;
  description: string | null;
  id: string;
  name: string;
}

export interface DishWithCost extends DishSummary {
  allergens: string[];
  costPerPerson: number | null;
  dietaryTags: string[];
  pricePerPerson: number | null;
}

export interface MenuDetail {
  id: string;
}

export const getDishes = async (): Promise<DishSummary[]> =>
  (await listDishes()).data
    .filter((dish) => !dish.deletedAt && dish.isActive)
    .map((dish) => ({
      id: dish.id,
      name: dish.name ?? "",
      description: dish.description ?? null,
      category: dish.category ?? null,
    }));

export const getDishesWithCost = async (): Promise<DishWithCost[]> =>
  (await listDishes()).data
    .filter((dish) => !dish.deletedAt && dish.isActive)
    .map((dish) => ({
      id: dish.id,
      name: dish.name ?? "",
      description: dish.description ?? null,
      category: dish.category ?? null,
      dietaryTags: dish.dietaryTags ?? [],
      allergens: dish.allergens ?? [],
      pricePerPerson: dish.pricePerPerson ?? null,
      costPerPerson: dish.costPerPerson ?? null,
    }));

export const getMenuById = async (_menuId: string): Promise<MenuDetail | null> => null;
