"use server";

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import { loadEventRecord } from "@/app/lib/convex/domain-loaders";
import { loadEventDishesSummary } from "@/app/lib/convex/event-domain-loaders";
import {
  loadRecipeIngredientsForVersions,
  loadRecipeVersionsForRecipes,
} from "@/app/lib/convex/event-recipe-loaders";
import {
  activeTenantRows,
  convexDocId,
  msToDate,
  serverListEntity,
} from "@/app/lib/convex/server-reads";
import { requireCurrentUser } from "@/app/lib/tenant";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

interface StationMapping {
  color: string;
  icon: string;
  stationId: string;
  stationName: string;
}

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

export interface IngredientItem {
  allergens: string[];
  baseQuantity: number;
  baseUnit: string;
  category: string | null;
  dietarySubstitutions: string[];
  ingredientId: string;
  ingredientName: string;
  isOptional: boolean;
  preparationNotes: string | null;
  scaledQuantity: number;
  scaledUnit: string;
}

interface RecipeInfo {
  category: string | null;
  cookTimeMinutes: number | null;
  id: string;
  name: string;
  prepTimeMinutes: number | null;
  tags: string[];
  versionId: string;
  yieldQuantity: number;
  yieldUnit: string;
}

interface DishInfo {
  course: string | null;
  dietaryTags: string[];
  id: string;
  minPrepLeadDays: number;
  name: string;
  quantityServings: number;
  recipeId: string | null;
  recipeInfo: RecipeInfo | null;
  servingPortion: number;
}

export interface StationPrepList {
  color: string;
  estimatedTime: number;
  icon: string;
  ingredients: IngredientItem[];
  stationId: string;
  stationName: string;
  tasks: Array<{
    id: string;
    name: string;
    dueDate: Date;
    status: string;
    priority: number;
  }>;
  totalIngredients: number;
}

export interface PrepListGenerationResult {
  batchMultiplier: number;
  dietaryRestrictions: string[];
  eventDate: Date;
  eventId: string;
  eventTitle: string;
  generatedAt: Date;
  guestCount: number;
  stationLists: StationPrepList[];
  totalEstimatedTime: number;
  totalIngredients: number;
}

interface GeneratePrepListInput {
  batchMultiplier?: number;
  customInstructions?: string;
  dietaryRestrictions?: string[];
  eventId: string;
}

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

  const eventDoc = await loadEventRecord(tenantId, input.eventId);
  if (!eventDoc) {
    throw new Error("Event not found");
  }

  const event = {
    id: convexDocId(eventDoc),
    title: String(eventDoc.title ?? ""),
    eventDate: msToDate(eventDoc.eventDate) ?? new Date(),
    guestCount: Number(eventDoc.guestCount ?? 0),
  };

  const eventDishes = await loadEventDishesSummary(tenantId, input.eventId);
  const dishById = new Map(
    activeTenantRows(await serverListEntity("Dish")).map((dish) => [
      convexDocId(dish),
      dish,
    ])
  );
  const recipeById = new Map(
    activeTenantRows(await serverListEntity("Recipe")).map((recipe) => [
      convexDocId(recipe),
      recipe,
    ])
  );

  const recipeIds = [
    ...new Set(
      eventDishes
        .map((row) => row.recipeId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const versionRows = await loadRecipeVersionsForRecipes(tenantId, recipeIds);
  const versionByRecipeId = new Map(
    versionRows.map((row) => [row.recipeId, row])
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

  const dishes: DishInfo[] = eventDishes.map((row): DishInfo => {
    const dishDoc = dishById.get(row.dishId);
    const recipeDoc = row.recipeId ? recipeById.get(row.recipeId) : undefined;
    const version = row.recipeId ? versionByRecipeId.get(row.recipeId) : undefined;

    const recipeInfo = version
      ? {
          id: row.recipeId ?? "",
          name: row.recipeName ?? String(recipeDoc?.name ?? ""),
          versionId: version.versionId,
          yieldQuantity: version.yieldQuantity,
          yieldUnit: version.yieldUnitCode ?? "portion",
          prepTimeMinutes: version.prepTimeMinutes,
          cookTimeMinutes: version.cookTimeMinutes,
          category: (recipeDoc?.category as string | null) ?? null,
          tags: Array.isArray(recipeDoc?.tags)
            ? (recipeDoc.tags as string[])
            : [],
        }
      : null;

    return {
      id: row.dishId,
      name: row.name,
      recipeId: row.recipeId,
      recipeInfo,
      minPrepLeadDays: Number(dishDoc?.minPrepLeadDays ?? 0),
      dietaryTags: row.dietaryTags ?? [],
      servingPortion: 1,
      course: row.course,
      quantityServings: row.quantityServings,
    };
  });

  const allIngredients = await getAllRecipeIngredients(tenantId, dishes.filter((d) => d.recipeInfo !== null));

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
  tenantId: string,
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

  const ingredientRows = await loadRecipeIngredientsForVersions(
    tenantId,
    recipeVersionIds
  );

  const dishByVersionId = new Map(
    dishesWithRecipes.map((d) => [d.recipeInfo!.versionId, d])
  );

  const ingredientDocs = new Map(
    activeTenantRows(await serverListEntity("Ingredient")).map((ing) => [
      convexDocId(ing),
      ing,
    ])
  );

  return ingredientRows.map((row) => {
    const dish = dishByVersionId.get(row.recipeVersionId);
    const ingredientDoc = ingredientDocs.get(row.ingredientId);
    const allergens = Array.isArray(ingredientDoc?.allergens)
      ? (ingredientDoc.allergens as string[])
      : [];

    return {
      dishId: dish?.id ?? "",
      dishName: dish?.name ?? "",
      recipeVersionId: row.recipeVersionId,
      ingredientId: row.ingredientId,
      ingredientName: row.ingredientName,
      quantity: row.quantity,
      unitCode: row.unitCode ?? "",
      category: (ingredientDoc?.category as string | null) ?? null,
      isOptional: row.isOptional,
      preparationNotes: row.preparationNotes,
      allergens,
    };
  });
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

  if (!(orgId && userId)) {
    return { success: false, error: "Unauthorized" };
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const user = await requireCurrentUser();

  try {
    const existingTasks = activeTenantRows(await serverListEntity("PrepTask")).filter(
      (task) => String(task.eventId) === eventId
    );

    for (const station of prepList.stationLists) {
      if (station.ingredients.length === 0) {
        continue;
      }

      for (const task of station.tasks) {
        const duplicate = existingTasks.some(
          (row) =>
            String(row.name ?? "") === task.name &&
            String(row.status ?? "") === "pending"
        );
        if (duplicate) {
          continue;
        }

        const dueMs = new Date(task.dueDate).getTime();
        const quantityTotal = station.ingredients.reduce(
          (sum, ing) => sum + ing.scaledQuantity,
          0
        );
        const notes = JSON.stringify(
          station.ingredients.map((ing) => ({
            name: ing.ingredientName,
            quantity: ing.scaledQuantity,
            unit: ing.scaledUnit,
            notes: ing.preparationNotes,
          }))
        );

        const result = await runManifestCommand({
          entity: "PrepTask",
          command: "create",
          body: {
            name: task.name,
            eventId,
            prepListId: "",
            taskType: "prep",
            priority: task.priority,
            quantityTotal,
            quantityUnitId: 0,
            servingsTotal: prepList.guestCount,
            startByDate: dueMs,
            dueByDate: dueMs,
            notes,
          },
          user: { id: user.id, tenantId, role: user.role },
        });

        if (!result.ok) {
          return {
            success: false,
            error: result.message ?? "Failed to create prep task",
          };
        }
      }
    }

    return { success: true };
  } catch (error) {
    captureException(error);
    return { success: false, error: "Failed to save prep list" };
  }
}

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
  const user = await requireCurrentUser();

  try {
    const totalEstimatedTime = Math.round(prepList.totalEstimatedTime * 60);
    const prepListName = name || `${prepList.eventTitle} - Prep List`;

    const createResult = await runManifestCommand({
      entity: "PrepList",
      command: "create",
      body: {
        eventId,
        name: prepListName,
        batchMultiplier: prepList.batchMultiplier,
        dietaryRestrictions: prepList.dietaryRestrictions ?? [],
        totalItems: prepList.totalIngredients,
        totalEstimatedTime,
        notes: "",
      },
      user: { id: user.id, tenantId, role: user.role },
    });

    if (!createResult.ok) {
      return {
        success: false,
        error: createResult.message ?? "Failed to create prep list",
      };
    }

    const prepListId = (createResult.result as { id?: string } | null)?.id;
    if (!prepListId) {
      return { success: false, error: "PrepList.create did not return an id" };
    }

    let sortOrder = 0;
    for (const station of prepList.stationLists) {
      for (const ingredient of station.ingredients) {
        const itemResult = await runManifestCommand({
          entity: "PrepListItem",
          command: "create",
          body: {
            prepListId,
            stationId: station.stationId,
            stationName: station.stationName,
            ingredientId: ingredient.ingredientId,
            ingredientName: ingredient.ingredientName,
            category: ingredient.category ?? "",
            baseQuantity: ingredient.baseQuantity,
            baseUnit: ingredient.baseUnit,
            scaledQuantity: ingredient.scaledQuantity,
            scaledUnit: ingredient.scaledUnit,
            isOptional: ingredient.isOptional,
            preparationNotes: ingredient.preparationNotes ?? "",
            allergens: ingredient.allergens,
            dietarySubstitutions: ingredient.dietarySubstitutions,
            dishId: "",
            dishName: "",
            recipeVersionId: "",
            sortOrder,
          },
          user: { id: user.id, tenantId, role: user.role },
        });

        if (!itemResult.ok) {
          return {
            success: false,
            error: itemResult.message ?? "Failed to create prep list item",
          };
        }

        sortOrder += 1;
      }
    }

    return { success: true, prepListId };
  } catch (error) {
    captureException(error);
    return { success: false, error: "Failed to save prep list to database" };
  }
}
