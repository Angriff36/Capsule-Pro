"use server";

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { getTenantIdForOrg } from "../../../lib/tenant";

type StationMapping = {
  stationId: string;
  stationName: string;
  icon: string;
  color: string;
};

const PREP_STATIONS: StationMapping[] = [
  {
    stationId: "hot-line",
    stationName: "Hot Line",
    icon: "flame",
    color: "bg-orange-500",
  },
  {
    stationId: "cold-prep",
    stationName: "Cold Prep",
    icon: "snowflake",
    color: "bg-blue-500",
  },
  {
    stationId: "bakery",
    stationName: "Bakery",
    icon: "chef-hat",
    color: "bg-amber-500",
  },
  {
    stationId: "prep-station",
    stationName: "Prep Station",
    icon: "utensils",
    color: "bg-purple-500",
  },
  {
    stationId: "garnish",
    stationName: "Garnish",
    icon: "leaf",
    color: "bg-green-500",
  },
];

export type IngredientItem = {
  ingredientId: string;
  ingredientName: string;
  category: string | null;
  baseQuantity: number;
  baseUnit: string;
  scaledQuantity: number;
  scaledUnit: string;
  dietarySubstitutions: string[];
  isOptional: boolean;
  preparationNotes: string | null;
  allergens: string[];
};

type RecipeInfo = {
  id: string;
  name: string;
  versionId: string;
  yieldQuantity: number;
  yieldUnit: string;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  category: string | null;
  tags: string[];
};

type DishInfo = {
  id: string;
  name: string;
  recipeId: string | null;
  recipeInfo: RecipeInfo | null;
  minPrepLeadDays: number;
  dietaryTags: string[];
  servingPortion: number;
  course: string | null;
  quantityServings: number;
};

export type StationPrepList = {
  stationId: string;
  stationName: string;
  icon: string;
  color: string;
  totalIngredients: number;
  estimatedTime: number;
  ingredients: IngredientItem[];
  tasks: Array<{
    id: string;
    name: string;
    dueDate: Date;
    status: string;
    priority: number;
  }>;
};

export type PrepListGenerationResult = {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  guestCount: number;
  batchMultiplier: number;
  dietaryRestrictions: string[];
  stationLists: StationPrepList[];
  totalIngredients: number;
  totalEstimatedTime: number;
  generatedAt: Date;
};

type GeneratePrepListInput = {
  eventId: string;
  batchMultiplier?: number;
  dietaryRestrictions?: string[];
  customInstructions?: string;
};

export async function generatePrepList(
  input: GeneratePrepListInput
): Promise<PrepListGenerationResult> {
  const { orgId, userId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const batchMultiplier = input.batchMultiplier ?? 1;

  const event = await database.events.findFirst({
    where: {
      tenantId,
      id: input.eventId,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const eventDishes = await database.$queryRaw<
    Array<{
      dishId: string;
      dishName: string;
      recipeId: string | null;
      recipe_name: string | null;
      recipeVersionId: string | null;
      yield_quantity: number | null;
      yield_unit: string | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
      recipe_category: string | null;
      recipe_tags: string[];
      min_prep_lead_days: number;
      dietary_tags: string[];
      course: string | null;
      quantity_servings: number;
      presentation_image_url: string | null;
    }>
  >(
    Prisma.sql`
      SELECT 
        ed.dishId,
        d.name AS dishName,
        d.recipeId,
        r.name AS recipe_name,
        rv.id AS recipeVersionId,
        rv.yield_quantity,
        u.code AS yield_unit,
        rv.prep_time_minutes,
        rv.cook_time_minutes,
        r.category AS recipe_category,
        r.tags AS recipe_tags,
        d.min_prep_lead_days,
        d.dietary_tags,
        ed.course,
        ed.quantity_servings,
        d.presentation_image_url
      FROM tenant_events.event_dishes ed
      JOIN tenant_kitchen.dishes d 
        ON d.tenant_id = ed.tenant_id 
        AND d.id = ed.dishId 
        AND d.deleted_at IS NULL
      LEFT JOIN tenant_kitchen.recipes r 
        ON r.tenant_id = d.tenant_id 
        AND r.id = d.recipeId 
        AND r.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT rv.*
        FROM tenant_kitchen.recipe_versions rv
        WHERE rv.tenant_id = r.tenant_id
          AND rv.recipeId = r.id
          AND rv.deleted_at IS NULL
        ORDER BY rv.version_number DESC
        LIMIT 1
      ) rv ON true
      LEFT JOIN core.units u ON u.id = rv.yield_unit_id
      WHERE ed.tenant_id = ${tenantId}
        AND ed.event_id = ${input.eventId}
        AND ed.deleted_at IS NULL
      ORDER BY ed.course ASC, d.name ASC
    `
  );

  if (eventDishes.length === 0) {
    return {
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.eventDate,
      guestCount: event.guestCount,
      batchMultiplier,
      dietaryRestrictions: input.dietaryRestrictions ?? [],
      stationLists: PREP_STATIONS.map((station) => ({
        ...station,
        totalIngredients: 0,
        estimatedTime: 0,
        ingredients: [],
        tasks: [],
      })),
      totalIngredients: 0,
      totalEstimatedTime: 0,
      generatedAt: new Date(),
    };
  }

  const dishes: DishInfo[] = eventDishes.map((dish): DishInfo => {
    const recipeInfo = dish.recipeVersionId
      ? {
          id: dish.recipeId ?? "",
          name: dish.recipe_name ?? "",
          versionId: dish.recipeVersionId,
          yieldQuantity: dish.yield_quantity ?? 1,
          yieldUnit: dish.yield_unit ?? "portion",
          prepTimeMinutes: dish.prep_time_minutes,
          cookTimeMinutes: dish.cook_time_minutes,
          category: dish.recipe_category,
          tags: dish.recipe_tags ?? [],
        }
      : null;

    return {
      id: dish.dishId,
      name: dish.dishName,
      recipeId: dish.recipeId,
      recipeInfo,
      minPrepLeadDays: dish.min_prep_lead_days,
      dietaryTags: dish.dietary_tags ?? [],
      servingPortion: 1,
      course: dish.course,
      quantityServings: dish.quantity_servings,
    };
  });

  const allIngredients = await getAllRecipeIngredients(
    tenantId,
    dishes.filter((d) => d.recipeInfo !== null)
  );

  const stationLists = groupIngredientsByStation(
    allIngredients,
    dishes,
    batchMultiplier,
    event.eventDate,
    input.dietaryRestrictions ?? []
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
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    batchMultiplier,
    dietaryRestrictions: input.dietaryRestrictions ?? [],
    stationLists,
    totalIngredients,
    totalEstimatedTime,
    generatedAt: new Date(),
  };
}

async function getAllRecipeIngredients(
  _tenantId: string,
  dishesWithRecipes: DishInfo[]
): Promise<
  Array<{
    dishId: string;
    dishName: string;
    recipeVersionId: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unitCode: string;
    category: string | null;
    isOptional: boolean;
    preparationNotes: string | null;
    allergens: string[];
  }>
> {
  if (dishesWithRecipes.length === 0) {
    return [];
  }

  const recipeVersionIds = dishesWithRecipes.map((d) => {
    if (!d.recipeInfo) {
      throw new Error(`Dish ${d.id} has no recipe info`);
    }
    return d.recipeInfo.versionId;
  });

  const results = await database.$queryRaw<
    Array<{
      dishId: string;
      dishName: string;
      recipeVersionId: string;
      ingredient_id: string;
      ingredient_name: string;
      quantity: number;
      unit_code: string;
      category: string | null;
      is_optional: boolean;
      preparation_notes: string | null;
      allergens: string[];
    }>
  >(
    Prisma.sql`
      SELECT 
        d.id AS dishId,
        d.name AS dishName,
        ri.recipeVersionId,
        ri.ingredient_id,
        i.name AS ingredient_name,
        ri.quantity,
        u.code AS unit_code,
        i.category,
        ri.is_optional,
        ri.preparation_notes,
        i.allergens
      FROM unnest(${recipeVersionIds}::uuid[]) AS rv_id
      JOIN tenant_kitchen.recipe_ingredients ri 
        ON ri.recipeVersionId = rv_id 
        AND ri.deleted_at IS NULL
      JOIN tenant_kitchen.ingredients i 
        ON i.tenant_id = ri.tenant_id 
        AND i.id = ri.ingredient_id 
        AND i.deleted_at IS NULL
      LEFT JOIN core.units u ON u.id = ri.unit_id
      CROSS JOIN LATERAL (
        SELECT d.id, d.name, d.recipeId
        FROM unnest(${recipeVersionIds}::uuid[]) AS rv_id_inner
        JOIN tenant_kitchen.recipe_versions rv 
          ON rv.id = rv_id_inner 
          AND rv.deleted_at IS NULL
        JOIN tenant_kitchen.dishes d 
          ON d.tenant_id = rv.tenant_id 
          AND d.recipeId = rv.recipeId 
          AND d.deleted_at IS NULL
        WHERE d.recipeId IN (
          SELECT r.id 
          FROM tenant_kitchen.recipes r 
          WHERE r.id IN (
            SELECT rv.recipeId 
            FROM tenant_kitchen.recipe_versions rv 
            WHERE rv.id = rv_id
          )
        )
        LIMIT 1
      ) d ON true
    `
  );

  return results.map((row) => ({
    dishId: row.dishId,
    dishName: row.dishName,
    recipeVersionId: row.recipeVersionId,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    quantity: row.quantity,
    unitCode: row.unit_code,
    category: row.category,
    isOptional: row.is_optional,
    preparationNotes: row.preparation_notes,
    allergens: row.allergens,
  }));
}

function groupIngredientsByStation(
  allIngredients: Array<{
    dishId: string;
    dishName: string;
    recipeVersionId: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unitCode: string;
    category: string | null;
    isOptional: boolean;
    preparationNotes: string | null;
    allergens: string[];
  }>,
  dishes: DishInfo[],
  batchMultiplier: number,
  eventDate: Date,
  dietaryRestrictions: string[]
): StationPrepList[] {
  const stationMap = initializeStations();
  const ingredientMap = aggregateIngredients(
    allIngredients,
    dishes,
    batchMultiplier
  );
  populateStations(ingredientMap, stationMap, dietaryRestrictions);
  createStationTasks(stationMap, dishes, eventDate);

  return Array.from(stationMap.values()).sort((a, b) =>
    a.stationName.localeCompare(b.stationName)
  );
}

function initializeStations(): Map<string, StationPrepList> {
  const map = new Map<string, StationPrepList>();
  for (const station of PREP_STATIONS) {
    map.set(station.stationId, {
      ...station,
      totalIngredients: 0,
      estimatedTime: 0,
      ingredients: [],
      tasks: [],
    });
  }
  return map;
}

function aggregateIngredients(
  allIngredients: Array<{
    dishId: string;
    dishName: string;
    recipeVersionId: string;
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unitCode: string;
    category: string | null;
    isOptional: boolean;
    preparationNotes: string | null;
    allergens: string[];
  }>,
  dishes: DishInfo[],
  batchMultiplier: number
): Map<
  string,
  {
    ingredient: (typeof allIngredients)[number];
    scaledQuantity: number;
    stations: Set<string>;
  }
> {
  const map = new Map<
    string,
    {
      ingredient: (typeof allIngredients)[number];
      scaledQuantity: number;
      stations: Set<string>;
    }
  >();

  for (const ingredient of allIngredients) {
    const dish = dishes.find((d) => d.id === ingredient.dishId);
    const dishMissing = !dish;
    const recipeInfoMissing = !dish?.recipeInfo;

    if (dishMissing || recipeInfoMissing) {
      continue;
    }

    const scaledQuantity = calculateScaledQuantity(
      ingredient.quantity,
      batchMultiplier,
      dish
    );
    const stationId = assignIngredientToStation(ingredient.category);
    const existing = map.get(ingredient.ingredientId);

    if (existing) {
      existing.scaledQuantity += scaledQuantity;
      existing.stations.add(stationId);
      continue;
    }

    map.set(ingredient.ingredientId, {
      ingredient,
      scaledQuantity,
      stations: new Set([stationId]),
    });
  }

  return map;
}

function calculateScaledQuantity(
  baseQuantity: number,
  batchMultiplier: number,
  dish: DishInfo
): number {
  const yieldQuantity = dish.recipeInfo?.yieldQuantity ?? 1;
  const servingsPerRecipe = dish.quantityServings;
  const servingsMultiplier = servingsPerRecipe / yieldQuantity;

  return baseQuantity * batchMultiplier * servingsMultiplier;
}

function populateStations(
  ingredientMap: Map<
    string,
    {
      ingredient: {
        dishId: string;
        dishName: string;
        recipeVersionId: string;
        ingredientId: string;
        ingredientName: string;
        quantity: number;
        unitCode: string;
        category: string | null;
        isOptional: boolean;
        preparationNotes: string | null;
        allergens: string[];
      };
      scaledQuantity: number;
      stations: Set<string>;
    }
  >,
  stationMap: Map<string, StationPrepList>,
  dietaryRestrictions: string[]
): void {
  for (const data of ingredientMap.values()) {
    const stations = Array.from(data.stations);
    const primaryStationId = stations[0];

    const dietarySubstitutions = applyDietaryRestrictions(
      data.ingredient.allergens ?? [],
      dietaryRestrictions
    );

    const ingredientItem: IngredientItem = {
      ingredientId: data.ingredient.ingredientId,
      ingredientName: data.ingredient.ingredientName,
      category: data.ingredient.category,
      baseQuantity: data.ingredient.quantity,
      baseUnit: data.ingredient.unitCode,
      scaledQuantity: Math.round(data.scaledQuantity * 100) / 100,
      scaledUnit: data.ingredient.unitCode,
      dietarySubstitutions,
      isOptional: data.ingredient.isOptional,
      preparationNotes: data.ingredient.preparationNotes,
      allergens: data.ingredient.allergens ?? [],
    };

    const station = stationMap.get(primaryStationId);
    if (station) {
      station.ingredients.push(ingredientItem);
      station.totalIngredients += 1;
    }
  }
}

function createStationTasks(
  stationMap: Map<string, StationPrepList>,
  dishes: DishInfo[],
  eventDate: Date
): void {
  for (const [stationId, station] of stationMap) {
    const stationDishes = dishes.filter((d) =>
      d.recipeInfo?.category
        ?.toLowerCase()
        .includes(stationId.replace("-", " "))
    );

    const maxLeadDays = Math.max(
      ...stationDishes.map((d) => d.minPrepLeadDays),
      0
    );

    station.estimatedTime = Math.ceil(
      station.ingredients.reduce((sum, ing) => {
        const timePerIngredient = ing.isOptional ? 0 : 15;
        return sum + timePerIngredient;
      }, 0) / 60
    );

    if (station.ingredients.length === 0 || maxLeadDays === 0) {
      continue;
    }

    const dueDate = new Date(eventDate);
    dueDate.setDate(dueDate.getDate() - maxLeadDays);

    station.tasks.push({
      id: `${stationId}-${Date.now()}`,
      name: `Prep ${station.stationName} items`,
      dueDate,
      status: "pending",
      priority: maxLeadDays > 2 ? 1 : 3,
    });
  }
}

function assignIngredientToStation(category: string | null): string {
  if (!category) {
    return "prep-station";
  }

  const categoryLower = category.toLowerCase();
  const hotKeywords = ["hot", "grill", "sauté"];
  const coldKeywords = ["cold", "salad", "dressing"];
  const bakeryKeywords = ["bake", "pastry", "dessert"];
  const garnishKeywords = ["garnish", "herb", "decoration"];

  if (hotKeywords.some((keyword) => categoryLower.includes(keyword))) {
    return "hot-line";
  }

  if (coldKeywords.some((keyword) => categoryLower.includes(keyword))) {
    return "cold-prep";
  }

  if (bakeryKeywords.some((keyword) => categoryLower.includes(keyword))) {
    return "bakery";
  }

  if (garnishKeywords.some((keyword) => categoryLower.includes(keyword))) {
    return "garnish";
  }

  return "prep-station";
}

function applyDietaryRestrictions(
  allergens: string[],
  dietaryRestrictions: string[]
): string[] {
  const substitutions: string[] = [];

  for (const restriction of dietaryRestrictions) {
    if (restriction === "gluten-free" && allergens.includes("wheat")) {
      substitutions.push("Use gluten-free alternative");
    }

    if (restriction === "dairy-free" && allergens.includes("dairy")) {
      substitutions.push("Use dairy-free alternative");
    }

    if (
      restriction === "vegan" &&
      allergens.some((a) => ["dairy", "eggs", "honey"].includes(a))
    ) {
      substitutions.push("Use plant-based alternative");
    }

    if (
      restriction === "nut-free" &&
      allergens.some((a) => a.includes("nut"))
    ) {
      substitutions.push("Use nut-free alternative");
    }
  }

  return substitutions;
}

export async function savePrepListToProductionBoard(
  eventId: string,
  prepList: PrepListGenerationResult
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const { orgId, userId } = await auth();

  const orgIdMissing = !orgId;
  const userIdMissing = !userId;

  if (orgIdMissing || userIdMissing) {
    return { success: false, error: "Unauthorized" };
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    for (const station of prepList.stationLists) {
      if (station.ingredients.length === 0) {
        continue;
      }

      for (const task of station.tasks) {
        const existingTask = await database.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`
            SELECT id
            FROM tenant_kitchen.prep_tasks
            WHERE tenant_id = ${tenantId}
              AND event_id = ${eventId}
              AND name = ${task.name}
              AND status = 'pending'
              AND deleted_at IS NULL
            LIMIT 1
          `
        );

        if (existingTask.length > 0) {
          continue;
        }

        const ingredientsJson = JSON.stringify(
          station.ingredients.map((ing) => ({
            name: ing.ingredientName,
            quantity: ing.scaledQuantity,
            unit: ing.scaledUnit,
            notes: ing.preparationNotes,
          }))
        );

        await database.$executeRaw`
          INSERT INTO tenant_kitchen.prep_tasks (
            tenant_id,
            event_id,
            task_type,
            name,
            quantity_total,
            quantity_unit_id,
            quantity_completed,
            servings_total,
            start_by_date,
            due_by_date,
            status,
            priority,
            notes,
            created_at,
            updated_at
          ) VALUES (
            ${tenantId},
            ${eventId},
            'prep',
            ${task.name},
            ${station.ingredients.reduce((sum, ing) => sum + ing.scaledQuantity, 0)},
            1,
            0,
            ${prepList.guestCount},
            ${new Date(task.dueDate).toISOString().split("T")[0]},
            ${new Date(task.dueDate).toISOString().split("T")[0]},
            'pending',
            ${task.priority},
            ${ingredientsJson},
            ${new Date()},
            ${new Date()}
          )
        `;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error saving prep list to production board:", error);
    return { success: false, error: "Failed to save prep list" };
  }
}

/**
 * Save a generated prep list to the database for later viewing/editing
 */
export async function savePrepListToDatabase(
  eventId: string,
  prepList: PrepListGenerationResult,
  name?: string
): Promise<{ success: boolean; prepListId?: string; error?: string }> {
  const { orgId } = await auth();

  if (!orgId) {
    return { success: false, error: "Unauthorized" };
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    // Calculate total estimated time
    const totalEstimatedTime = Math.round(prepList.totalEstimatedTime * 60); // Convert to minutes

    // Create the prep list
    const result = await database.$queryRaw<Array<{ id: string }>>`
      INSERT INTO tenant_kitchen.prep_lists (
        tenant_id,
        event_id,
        name,
        batch_multiplier,
        dietary_restrictions,
        status,
        total_items,
        total_estimated_time
      ) VALUES (
        ${tenantId},
        ${eventId},
        ${name || `${prepList.eventTitle} - Prep List`},
        ${prepList.batchMultiplier},
        ${prepList.dietaryRestrictions || []},
        'draft',
        ${prepList.totalIngredients},
        ${totalEstimatedTime}
      )
      RETURNING id
    `;

    const prepListId = result[0].id;

    // Create all prep list items
    let sortOrder = 0;
    for (const station of prepList.stationLists) {
      for (const ingredient of station.ingredients) {
        await database.$executeRaw`
          INSERT INTO tenant_kitchen.prep_list_items (
            tenant_id,
            prep_list_id,
            station_id,
            station_name,
            ingredient_id,
            ingredient_name,
            category,
            base_quantity,
            base_unit,
            scaled_quantity,
            scaled_unit,
            is_optional,
            preparation_notes,
            allergens,
            dietary_substitutions,
            dishId,
            dishName,
            recipeVersionId,
            sort_order
          ) VALUES (
            ${tenantId},
            ${prepListId},
            ${station.stationId},
            ${station.stationName},
            ${ingredient.ingredientId},
            ${ingredient.ingredientName},
            ${ingredient.category},
            ${ingredient.baseQuantity},
            ${ingredient.baseUnit},
            ${ingredient.scaledQuantity},
            ${ingredient.scaledUnit},
            ${ingredient.isOptional},
            ${ingredient.preparationNotes},
            ${ingredient.allergens},
            ${ingredient.dietarySubstitutions},
            NULL,
            NULL,
            NULL,
            ${sortOrder}
          )
        `;
        sortOrder++;
      }
    }

    return { success: true, prepListId };
  } catch (error) {
    console.error("Error saving prep list to database:", error);
    return { success: false, error: "Failed to save prep list to database" };
  }
}
