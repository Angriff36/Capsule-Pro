import "server-only";

import {
  loadRecipeIngredientsForVersions,
} from "./event-recipe-loaders";
import { latestVersionByRecipe } from "./kitchen-recipe-utils";
import {
  activeTenantRows,
  convexDocId,
  msToDate,
  parseDecimalString,
  serverGetEntity,
  serverListEntity,
  type ConvexDoc,
} from "./server-reads";

export interface KitchenRecipeCatalogRecipeRow {
  category: string | null;
  cook_time_minutes: number | null;
  description: string | null;
  dish_count: number;
  id: string;
  image_url: string | null;
  ingredient_count: number;
  is_active: boolean;
  name: string;
  prep_time_minutes: number | null;
  rest_time_minutes: number | null;
  tags: string[] | null;
  yield_quantity: number | null;
  yield_unit: string | null;
}

export interface KitchenRecipeCatalogDishRow {
  category: string | null;
  cost_per_person: number | null;
  dietary_tags: string[] | null;
  event_count: number;
  id: string;
  is_active: boolean;
  name: string;
  prep_task_count: number;
  presentation_image_url: string | null;
  price_per_person: number | null;
  recipe_name: string | null;
}

export interface KitchenRecipeCatalogIngredientRow {
  allergens: string[] | null;
  category: string | null;
  id: string;
  is_active: boolean;
  name: string;
  unit_code: string | null;
}

export interface KitchenRecipeCatalogFilters {
  activeTab: string;
  query?: string;
  category?: string;
  dietary?: string;
  status?: string;
}

export interface KitchenRecipeCatalogResult {
  totals: {
    recipes: number;
    dishes: number;
    ingredients: number;
    menus: number;
  };
  recipes: KitchenRecipeCatalogRecipeRow[];
  dishes: KitchenRecipeCatalogDishRow[];
  ingredients: KitchenRecipeCatalogIngredientRow[];
}

function matchesQuery(name: string, query?: string): boolean {
  if (!query) return true;
  return name.toLowerCase().includes(query.toLowerCase());
}

function matchesCategory(category: string | null | undefined, filter?: string): boolean {
  if (!filter) return true;
  return (category ?? "").toLowerCase() === filter.toLowerCase();
}

function matchesStatus(isActive: boolean, status?: string): boolean {
  if (status === "active") return isActive;
  if (status === "inactive") return !isActive;
  return true;
}

function matchesDietary(tags: string[] | null | undefined, dietary?: string): boolean {
  if (!dietary) return true;
  const list = tags ?? [];
  return list.includes(dietary);
}

function firstStepImage(
  steps: ConvexDoc[],
  versionId: string | undefined
): string | null {
  if (!versionId) return null;
  for (const step of steps) {
    if (String(step.recipeVersionId) !== versionId) continue;
    const url = step.imageUrl as string | null | undefined;
    if (url) return url;
  }
  return null;
}

export async function loadKitchenRecipeCatalog(
  filters: KitchenRecipeCatalogFilters
): Promise<KitchenRecipeCatalogResult> {
  const [
    recipesRaw,
    versionsRaw,
    ingredientsLinkRaw,
    stepsRaw,
    dishesRaw,
    ingredientsRaw,
    eventDishesRaw,
    prepTasksRaw,
    menusRaw,
  ] = await Promise.all([
    serverListEntity("Recipe"),
    serverListEntity("RecipeVersion"),
    serverListEntity("RecipeIngredient"),
    serverListEntity("RecipeStep"),
    serverListEntity("Dish"),
    serverListEntity("Ingredient"),
    serverListEntity("EventDish"),
    serverListEntity("PrepTask"),
    serverListEntity("Menu"),
  ]);

  const recipes = activeTenantRows(recipesRaw);
  const versions = activeTenantRows(versionsRaw);
  const ingredientLinks = activeTenantRows(ingredientsLinkRaw);
  const steps = activeTenantRows(stepsRaw);
  const dishes = activeTenantRows(dishesRaw);
  const ingredients = activeTenantRows(ingredientsRaw);
  const eventDishes = activeTenantRows(eventDishesRaw);
  const prepTasks = activeTenantRows(prepTasksRaw);
  const menus = activeTenantRows(menusRaw);

  const recipeIds = new Set(recipes.map((r) => convexDocId(r)));
  const latestByRecipe = latestVersionByRecipe(versions, recipeIds);

  const ingredientCountByVersion = new Map<string, number>();
  for (const link of ingredientLinks) {
    const vid = String(link.recipeVersionId);
    ingredientCountByVersion.set(vid, (ingredientCountByVersion.get(vid) ?? 0) + 1);
  }

  const dishCountByRecipe = new Map<string, number>();
  for (const dish of dishes) {
    const rid = String(dish.recipeId ?? "");
    if (!rid) continue;
    dishCountByRecipe.set(rid, (dishCountByRecipe.get(rid) ?? 0) + 1);
  }

  const prepTaskCountByDish = new Map<string, number>();
  for (const task of prepTasks) {
    const did = String(task.dishId ?? "");
    if (!did) continue;
    prepTaskCountByDish.set(did, (prepTaskCountByDish.get(did) ?? 0) + 1);
  }

  const eventCountByDish = new Map<string, number>();
  for (const link of eventDishes) {
    const did = String(link.dishId ?? "");
    if (!did) continue;
    eventCountByDish.set(did, (eventCountByDish.get(did) ?? 0) + 1);
  }

  const recipeNameById = new Map(recipes.map((r) => [convexDocId(r), String(r.name ?? "")]));

  const showRecipes = filters.activeTab === "recipes";
  const showDishes = filters.activeTab === "dishes" || filters.activeTab === "costing";
  const showIngredients = filters.activeTab === "ingredients";

  const recipeRows: KitchenRecipeCatalogRecipeRow[] = showRecipes
    ? recipes
        .filter((recipe) => {
          const name = String(recipe.name ?? "");
          const category = (recipe.category as string | null) ?? null;
          const tags = Array.isArray(recipe.tags) ? (recipe.tags as string[]) : [];
          const isActive = recipe.isActive !== false;
          return (
            matchesQuery(name, filters.query) &&
            matchesCategory(category, filters.category) &&
            matchesDietary(tags, filters.dietary) &&
            matchesStatus(isActive, filters.status)
          );
        })
        .map((recipe) => {
          const id = convexDocId(recipe);
          const version = latestByRecipe.get(id);
          const versionId = version ? convexDocId(version) : undefined;
          return {
            id,
            name: String(recipe.name ?? ""),
            description: (recipe.description as string | null) ?? null,
            category: (recipe.category as string | null) ?? null,
            tags: Array.isArray(recipe.tags) ? (recipe.tags as string[]) : null,
            is_active: recipe.isActive !== false,
            yield_quantity: version?.yieldQuantity
              ? parseDecimalString(version.yieldQuantity)
              : null,
            yield_unit:
              version?.yieldUnitId != null ? String(version.yieldUnitId) : null,
            prep_time_minutes:
              version?.prepTimeMinutes != null
                ? Number(version.prepTimeMinutes)
                : null,
            cook_time_minutes:
              version?.cookTimeMinutes != null
                ? Number(version.cookTimeMinutes)
                : null,
            rest_time_minutes:
              version?.restTimeMinutes != null
                ? Number(version.restTimeMinutes)
                : null,
            ingredient_count: versionId
              ? (ingredientCountByVersion.get(versionId) ?? 0)
              : 0,
            dish_count: dishCountByRecipe.get(id) ?? 0,
            image_url: firstStepImage(steps, versionId),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const dishRows: KitchenRecipeCatalogDishRow[] = showDishes
    ? dishes
        .filter((dish) => {
          const name = String(dish.name ?? "");
          const category = (dish.category as string | null) ?? null;
          const dietaryTags = Array.isArray(dish.dietaryTags)
            ? (dish.dietaryTags as string[])
            : [];
          const isActive = dish.isActive !== false;
          return (
            matchesQuery(name, filters.query) &&
            matchesCategory(category, filters.category) &&
            matchesDietary(dietaryTags, filters.dietary) &&
            matchesStatus(isActive, filters.status)
          );
        })
        .map((dish) => {
          const id = convexDocId(dish);
          const recipeId = String(dish.recipeId ?? "");
          return {
            id,
            name: String(dish.name ?? ""),
            category: (dish.category as string | null) ?? null,
            dietary_tags: Array.isArray(dish.dietaryTags)
              ? (dish.dietaryTags as string[])
              : null,
            price_per_person: dish.pricePerPerson
              ? parseDecimalString(dish.pricePerPerson)
              : null,
            cost_per_person: dish.costPerPerson
              ? parseDecimalString(dish.costPerPerson)
              : null,
            presentation_image_url:
              (dish.presentationImageUrl as string | null) ?? null,
            is_active: dish.isActive !== false,
            recipe_name: recipeId ? (recipeNameById.get(recipeId) ?? null) : null,
            prep_task_count: prepTaskCountByDish.get(id) ?? 0,
            event_count: eventCountByDish.get(id) ?? 0,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const ingredientRows: KitchenRecipeCatalogIngredientRow[] = showIngredients
    ? ingredients
        .filter((ingredient) => {
          const name = String(ingredient.name ?? "");
          const category = (ingredient.category as string | null) ?? null;
          const allergens = Array.isArray(ingredient.allergens)
            ? (ingredient.allergens as string[])
            : [];
          const isActive = ingredient.isActive !== false;
          return (
            matchesQuery(name, filters.query) &&
            matchesCategory(category, filters.category) &&
            matchesDietary(allergens, filters.dietary) &&
            matchesStatus(isActive, filters.status)
          );
        })
        .map((ingredient) => ({
          id: convexDocId(ingredient),
          name: String(ingredient.name ?? ""),
          category: (ingredient.category as string | null) ?? null,
          allergens: Array.isArray(ingredient.allergens)
            ? (ingredient.allergens as string[])
            : null,
          is_active: ingredient.isActive !== false,
          unit_code:
            ingredient.defaultUnitId != null
              ? String(ingredient.defaultUnitId)
              : null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return {
    totals: {
      recipes: recipes.length,
      dishes: dishes.length,
      ingredients: ingredients.length,
      menus: menus.length,
    },
    recipes: recipeRows,
    dishes: dishRows,
    ingredients: ingredientRows,
  };
}

export interface KitchenRecipeDetailRow {
  category: string | null;
  cook_time_minutes: number | null;
  description: string | null;
  id: string;
  image_url: string | null;
  instructions: string | null;
  is_active: boolean;
  name: string;
  notes: string | null;
  prep_time_minutes: number | null;
  rest_time_minutes: number | null;
  tags: string[] | null;
  yield_quantity: number | null;
  yield_unit: string | null;
}

export interface KitchenRecipeDetailIngredientRow {
  id: string;
  name: string;
  notes: string | null;
  order_index: number;
  quantity: number;
  unit_code: string;
}

export interface KitchenRecipeDetailStepRow {
  duration_minutes: number | null;
  equipment_needed: string[] | null;
  image_url: string | null;
  instruction: string;
  step_number: number;
  temperature_unit: string | null;
  temperature_value: number | null;
  tips: string | null;
  video_url: string | null;
}

export async function loadKitchenRecipeDetail(recipeId: string): Promise<{
  recipe: KitchenRecipeDetailRow;
  ingredients: KitchenRecipeDetailIngredientRow[];
  steps: KitchenRecipeDetailStepRow[];
  recipeVersionId: string | null;
} | null> {
  const recipeDoc = await serverGetEntity("Recipe", recipeId);
  if (!recipeDoc) {
    return null;
  }

  const versions = activeTenantRows(await serverListEntity("RecipeVersion")).filter(
    (v) => String(v.recipeId) === recipeId
  );

  const latest =
    versions.length > 0
      ? versions.reduce((best, current) =>
          Number(current.versionNumber ?? 0) > Number(best.versionNumber ?? 0)
            ? current
            : best
        )
      : null;
  const versionId = latest ? convexDocId(latest) : null;

  const ingredientRows = versionId
    ? await loadRecipeIngredientsForVersions("", [versionId])
    : [];

  const stepsFromEntity = versionId
    ? activeTenantRows(await serverListEntity("RecipeStep"))
        .filter((s) => String(s.recipeVersionId) === versionId)
        .sort((a, b) => Number(a.stepNumber ?? 0) - Number(b.stepNumber ?? 0))
    : [];

  const imageUrl =
    stepsFromEntity.find((s) => s.imageUrl)?.imageUrl?.toString() ?? null;

  const recipe: KitchenRecipeDetailRow = {
    id: recipeId,
    name: String(recipeDoc.name ?? ""),
    description: (recipeDoc.description as string | null) ?? null,
    category: (recipeDoc.category as string | null) ?? null,
    tags: Array.isArray(recipeDoc.tags) ? (recipeDoc.tags as string[]) : null,
    is_active: recipeDoc.isActive !== false,
    yield_quantity: latest?.yieldQuantity
      ? parseDecimalString(latest.yieldQuantity)
      : null,
    yield_unit: latest?.yieldUnitId != null ? String(latest.yieldUnitId) : null,
    prep_time_minutes:
      latest?.prepTimeMinutes != null ? Number(latest.prepTimeMinutes) : null,
    cook_time_minutes:
      latest?.cookTimeMinutes != null ? Number(latest.cookTimeMinutes) : null,
    rest_time_minutes:
      latest?.restTimeMinutes != null ? Number(latest.restTimeMinutes) : null,
    instructions: (latest?.instructions as string | null) ?? null,
    notes: (latest?.notes as string | null) ?? null,
    image_url: imageUrl,
  };

  const ingredients: KitchenRecipeDetailIngredientRow[] = ingredientRows.map(
    (row, index) => ({
      id: row.ingredientId,
      name: row.ingredientName,
      quantity: row.quantity,
      unit_code: row.unitCode ?? "",
      notes: row.preparationNotes,
      order_index: index,
    })
  );

  const steps: KitchenRecipeDetailStepRow[] = stepsFromEntity.map((step) => ({
    step_number: Number(step.stepNumber ?? 0),
    instruction: String(step.instruction ?? ""),
    duration_minutes:
      step.durationMinutes != null ? Number(step.durationMinutes) : null,
    temperature_value: step.temperatureValue
      ? parseDecimalString(step.temperatureValue)
      : null,
    temperature_unit: (step.temperatureUnit as string | null) ?? null,
    equipment_needed: Array.isArray(step.equipmentNeeded)
      ? (step.equipmentNeeded as string[])
      : null,
    tips: (step.tips as string | null) ?? null,
    video_url: (step.videoUrl as string | null) ?? null,
    image_url: (step.imageUrl as string | null) ?? null,
  }));

  return { recipe, ingredients, steps, recipeVersionId: versionId };
}

export interface PrepTaskPlanWorkflowStats {
  total: number;
  created: number;
  generating: number;
  reviewing: number;
  approving: number;
  approved: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgTasks: number;
}

const GENERATING_STATUSES = new Set(["generating", "generation_completed"]);
const REVIEWING_STATUSES = new Set([
  "reviewing",
  "review_completed",
  "awaiting_review",
]);
const APPROVING_STATUSES = new Set(["approving", "awaiting_approval"]);

export async function loadPrepTaskPlanWorkflowStats(): Promise<PrepTaskPlanWorkflowStats> {
  const rows = activeTenantRows(await serverListEntity("PrepTaskPlanWorkflow"));
  let generatedSum = 0;

  const counts = {
    total: rows.length,
    created: 0,
    generating: 0,
    reviewing: 0,
    approving: 0,
    approved: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    const status = String(row.status ?? "created");
    generatedSum += Number(row.generatedCount ?? 0);

    if (status === "created") counts.created += 1;
    if (GENERATING_STATUSES.has(status)) counts.generating += 1;
    if (REVIEWING_STATUSES.has(status)) counts.reviewing += 1;
    if (APPROVING_STATUSES.has(status)) counts.approving += 1;
    if (status === "approved") counts.approved += 1;
    if (status === "completed") counts.completed += 1;
    if (status === "failed") counts.failed += 1;
    if (status === "cancelled") counts.cancelled += 1;
  }

  return {
    ...counts,
    avgTasks: rows.length > 0 ? Math.round(generatedSum / rows.length) : 0,
  };
}
