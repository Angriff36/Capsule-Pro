/**
 * Recipe Commands
 *
 * Commands for managing recipes:
 * - update, deactivate, activate, create (recipe & ingredient), createRecipeVersion, createRecipeIngredient
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import type { OverrideRequest } from "@angriff36/manifest/ir";
import type { RecipeCommandResult } from "../types";

/**
 * Update a recipe
 */
export async function updateRecipe(
  engine: RuntimeEngine,
  recipeId: string,
  newName: string,
  newCategory: string,
  newCuisineType: string,
  newDescription: string,
  newTags: string,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "update",
    { newName, newCategory, newCuisineType, newDescription, newTags },
    {
      entityName: "Recipe",
      instanceId: recipeId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Recipe", recipeId);
  return {
    ...result,
    recipeId,
    name: instance?.name as string | undefined,
    isActive: instance?.isActive as boolean | undefined,
  };
}

/**
 * Deactivate a recipe
 */
export async function deactivateRecipe(
  engine: RuntimeEngine,
  recipeId: string,
  reason: string,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "deactivate",
    { reason },
    {
      entityName: "Recipe",
      instanceId: recipeId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Recipe", recipeId);
  return {
    ...result,
    recipeId,
    name: instance?.name as string | undefined,
    isActive: false,
  };
}

/**
 * Activate a recipe
 */
export async function activateRecipe(
  engine: RuntimeEngine,
  recipeId: string,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "activate",
    {},
    {
      entityName: "Recipe",
      instanceId: recipeId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Recipe", recipeId);
  return {
    ...result,
    recipeId,
    name: instance?.name as string | undefined,
    isActive: true,
  };
}

/**
 * Create a new ingredient via Manifest command pipeline
 */
export async function createIngredient(
  engine: RuntimeEngine,
  ingredientId: string,
  name: string,
  defaultUnitId: number,
  category: string,
  allergens: string,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      name,
      defaultUnitId,
      category,
      allergens,
    },
    {
      entityName: "Ingredient",
      instanceId: ingredientId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Ingredient", ingredientId);
  return {
    ...result,
    recipeId: ingredientId,
    name: instance?.name as string | undefined,
    isActive: instance?.isActive as boolean | undefined,
  };
}

/**
 * Create a recipe version
 */
export async function createRecipeVersion(
  engine: RuntimeEngine,
  versionId: string,
  yieldQty: number,
  yieldUnit: number,
  prepTime: number,
  cookTime: number,
  restTime: number,
  difficulty: number,
  instructionsText: string,
  notesText: string
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      yieldQty,
      yieldUnit,
      prepTime,
      cookTime,
      restTime,
      difficulty,
      instructionsText,
      notesText,
    },
    {
      entityName: "RecipeVersion",
      instanceId: versionId,
    }
  );

  return {
    ...result,
    recipeId: versionId,
  };
}

/**
 * Create a new recipe ingredient via Manifest command pipeline
 */
export async function createRecipeIngredient(
  engine: RuntimeEngine,
  recipeIngredientId: string,
  recipeVersionId: string,
  ingredientId: string,
  quantity: number,
  unitId: number,
  sortOrder: number,
  preparationNotes: string,
  isOptional: boolean,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      recipeVersionId,
      ingredientId,
      quantity,
      unitId,
      sortOrder,
      preparationNotes,
      isOptional,
    },
    {
      entityName: "RecipeIngredient",
      instanceId: recipeIngredientId,
      overrideRequests,
    }
  );

  return {
    ...result,
    recipeId: recipeIngredientId,
  };
}

/**
 * Create a recipe via Manifest runtime with constraint validation and event emission
 */
export async function createRecipe(
  engine: RuntimeEngine,
  recipeId: string,
  name: string,
  category: string,
  cuisineType: string,
  description: string,
  tags: string,
  overrideRequests?: OverrideRequest[]
): Promise<RecipeCommandResult> {
  const result = await engine.runCommand(
    "create",
    { name, category, cuisineType, description, tags },
    {
      entityName: "Recipe",
      instanceId: recipeId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("Recipe", recipeId);
  return {
    ...result,
    recipeId,
    name: instance?.name as string | undefined,
    isActive: true,
  };
}
