/**
 * Canonical prep-list generation.
 *
 * Single source of truth for expanding an event's linked dishes
 * (tenant_events.event_dishes) through recipes → latest recipe version →
 * recipe ingredients into station-grouped ingredient demand.
 *
 * Dishes that cannot resolve (recipe missing, recipe has no version, version
 * has no ingredients) are reported in `unresolvedDishes` instead of being
 * silently dropped — the UI uses this to tell the user what to fix.
 */

import { database, Prisma } from "@repo/database";
import { emptyStationLists, groupIngredientsByStation } from "./stations";
import {
  type DishInfo,
  type DishIngredient,
  type GeneratePrepListInput,
  PrepListEventNotFoundError,
  type PrepListGenerationResult,
  type UnresolvedDish,
} from "./types";

interface EventDishRow {
  cook_time_minutes: number | null;
  course: string | null;
  dietary_tags: string[];
  dish_id: string;
  dish_name: string;
  min_prep_lead_days: number;
  prep_time_minutes: number | null;
  quantity_servings: number;
  recipe_category: string | null;
  recipe_id: string | null;
  recipe_name: string | null;
  recipe_tags: string[] | null;
  recipe_version_id: string | null;
  yield_quantity: number | null;
  yield_unit: string | null;
}

async function getEventDishes(
  tenantId: string,
  eventId: string
): Promise<EventDishRow[]> {
  return await database.$queryRaw<EventDishRow[]>(
    Prisma.sql`
      SELECT
        ed.dish_id,
        d.name AS dish_name,
        d.recipe_id,
        r.name AS recipe_name,
        rv.id AS recipe_version_id,
        rv.yield_quantity::float8 AS yield_quantity,
        u.code AS yield_unit,
        rv.prep_time_minutes,
        rv.cook_time_minutes,
        r.category AS recipe_category,
        r.tags AS recipe_tags,
        d.min_prep_lead_days,
        d.dietary_tags,
        ed.course,
        ed.quantity_servings
      FROM tenant_events.event_dishes ed
      -- Existing commitment read: prep for an event that already committed to a
      -- dish must still include it after catalog soft-delete, so NO d.deleted_at
      -- filter here. (Catalog/picker queries keep it.)
      JOIN tenant_kitchen.dishes d
        ON d.tenant_id = ed.tenant_id
        AND d.id = ed.dish_id
      LEFT JOIN tenant_kitchen.recipes r
        ON r.tenant_id = d.tenant_id
        AND r.id = d.recipe_id
        AND r.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT inner_rv.*
        FROM tenant_kitchen.recipe_versions inner_rv
        WHERE inner_rv.tenant_id = r.tenant_id
          AND inner_rv.recipe_id = r.id
          AND inner_rv.deleted_at IS NULL
        ORDER BY inner_rv.version_number DESC
        LIMIT 1
      ) rv ON true
      LEFT JOIN core.units u ON u.id = rv.yield_unit_id
      WHERE ed.tenant_id = ${tenantId}
        AND ed.event_id = ${eventId}
        AND ed.deleted_at IS NULL
      ORDER BY ed.course ASC, d.name ASC
    `
  );
}

interface RecipeIngredientRow {
  allergens: string[] | null;
  category: string | null;
  ingredient_id: string;
  ingredient_name: string;
  is_optional: boolean;
  preparation_notes: string | null;
  quantity: number;
  recipe_version_id: string;
  unit_code: string | null;
}

/**
 * Fetch all ingredients for the given recipe versions, keyed by version.
 * Attribution to dishes happens in TypeScript so that multiple dishes
 * sharing one recipe version each receive the full ingredient list.
 */
async function getIngredientsByVersion(
  tenantId: string,
  recipeVersionIds: string[]
): Promise<Map<string, RecipeIngredientRow[]>> {
  const byVersion = new Map<string, RecipeIngredientRow[]>();
  if (recipeVersionIds.length === 0) {
    return byVersion;
  }

  const rows = await database.$queryRaw<RecipeIngredientRow[]>(
    Prisma.sql`
      SELECT
        ri.recipe_version_id,
        ri.ingredient_id,
        i.name AS ingredient_name,
        ri.quantity::float8 AS quantity,
        u.code AS unit_code,
        i.category,
        ri.is_optional,
        ri.preparation_notes,
        i.allergens
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i
        ON i.tenant_id = ri.tenant_id
        AND i.id = ri.ingredient_id
        AND i.deleted_at IS NULL
      LEFT JOIN core.units u ON u.id = ri.unit_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = ANY(${recipeVersionIds}::uuid[])
        AND ri.deleted_at IS NULL
      ORDER BY i.name ASC
    `
  );

  for (const row of rows) {
    const list = byVersion.get(row.recipe_version_id);
    if (list) {
      list.push(row);
    } else {
      byVersion.set(row.recipe_version_id, [row]);
    }
  }

  return byVersion;
}

function toDishInfo(row: EventDishRow): DishInfo {
  const recipeInfo = row.recipe_version_id
    ? {
        id: row.recipe_id ?? "",
        name: row.recipe_name ?? "",
        versionId: row.recipe_version_id,
        yieldQuantity: row.yield_quantity ?? 1,
        yieldUnit: row.yield_unit ?? "portion",
        prepTimeMinutes: row.prep_time_minutes,
        cookTimeMinutes: row.cook_time_minutes,
        category: row.recipe_category,
        tags: row.recipe_tags ?? [],
      }
    : null;

  return {
    id: row.dish_id,
    name: row.dish_name,
    recipeId: row.recipe_id,
    recipeName: row.recipe_name,
    recipeInfo,
    minPrepLeadDays: row.min_prep_lead_days,
    dietaryTags: row.dietary_tags ?? [],
    servingPortion: 1,
    course: row.course,
    quantityServings: row.quantity_servings,
  };
}

function classifyUnresolvedDish(
  dish: DishInfo,
  ingredientsByVersion: Map<string, RecipeIngredientRow[]>
): UnresolvedDish | null {
  if (!(dish.recipeId && dish.recipeName)) {
    return {
      dishId: dish.id,
      dishName: dish.name,
      recipeId: dish.recipeId,
      recipeName: dish.recipeName,
      reason: "no_recipe",
    };
  }

  if (!dish.recipeInfo) {
    return {
      dishId: dish.id,
      dishName: dish.name,
      recipeId: dish.recipeId,
      recipeName: dish.recipeName,
      reason: "no_recipe_version",
    };
  }

  const ingredients = ingredientsByVersion.get(dish.recipeInfo.versionId) ?? [];
  if (ingredients.length === 0) {
    return {
      dishId: dish.id,
      dishName: dish.name,
      recipeId: dish.recipeId,
      recipeName: dish.recipeName,
      reason: "no_ingredients",
    };
  }

  return null;
}

/**
 * Core prep-list generation. Accepts tenantId directly; callers own auth.
 */
export async function generatePrepListCore(
  tenantId: string,
  input: GeneratePrepListInput
): Promise<PrepListGenerationResult> {
  const batchMultiplier = input.batchMultiplier ?? 1;
  const dietaryRestrictions = input.dietaryRestrictions ?? [];

  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: input.eventId,
      deletedAt: null,
    },
  });

  if (!event) {
    throw new PrepListEventNotFoundError(input.eventId);
  }

  const eventDishRows = await getEventDishes(tenantId, input.eventId);
  const base = {
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    batchMultiplier,
    dietaryRestrictions,
    generatedAt: new Date(),
  };

  if (eventDishRows.length === 0) {
    return {
      ...base,
      linkedDishCount: 0,
      resolvedDishCount: 0,
      unresolvedDishes: [],
      stationLists: emptyStationLists(),
      totalIngredients: 0,
      totalEstimatedTime: 0,
    };
  }

  const dishes = eventDishRows.map(toDishInfo);

  const recipeVersionIds = Array.from(
    new Set(
      dishes
        .map((dish) => dish.recipeInfo?.versionId)
        .filter((id): id is string => Boolean(id))
    )
  );

  const ingredientsByVersion = await getIngredientsByVersion(
    tenantId,
    recipeVersionIds
  );

  // Attribute every version's ingredients to every dish using that version,
  // so shared recipes contribute demand once per dish.
  const allIngredients: DishIngredient[] = [];
  for (const dish of dishes) {
    if (!dish.recipeInfo) {
      continue;
    }
    const rows = ingredientsByVersion.get(dish.recipeInfo.versionId) ?? [];
    for (const row of rows) {
      allIngredients.push({
        dishId: dish.id,
        dishName: dish.name,
        recipeVersionId: row.recipe_version_id,
        ingredientId: row.ingredient_id,
        ingredientName: row.ingredient_name,
        quantity: row.quantity,
        unitCode: row.unit_code ?? "",
        category: row.category,
        isOptional: row.is_optional,
        preparationNotes: row.preparation_notes,
        allergens: row.allergens ?? [],
      });
    }
  }

  const unresolvedDishes = dishes
    .map((dish) => classifyUnresolvedDish(dish, ingredientsByVersion))
    .filter((entry): entry is UnresolvedDish => entry !== null);

  const stationLists = groupIngredientsByStation(
    allIngredients,
    dishes,
    batchMultiplier,
    event.eventDate,
    dietaryRestrictions
  );

  const totalIngredients = stationLists.reduce(
    (sum, station) => sum + station.totalIngredients,
    0
  );

  const totalEstimatedTime = stationLists.reduce(
    (sum, station) => sum + station.estimatedTime,
    0
  );

  return {
    ...base,
    linkedDishCount: dishes.length,
    resolvedDishCount: dishes.length - unresolvedDishes.length,
    unresolvedDishes,
    stationLists,
    totalIngredients,
    totalEstimatedTime,
  };
}
