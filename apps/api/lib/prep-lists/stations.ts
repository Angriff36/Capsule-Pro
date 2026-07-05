/**
 * Station assignment and grouping for prep-list generation.
 * Pure functions — no database access.
 */

import type {
  DishInfo,
  DishIngredient,
  IngredientItem,
  StationPrepList,
} from "./types";

interface StationMapping {
  color: string;
  icon: string;
  stationId: string;
  stationName: string;
}

export const PREP_STATIONS: StationMapping[] = [
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

export function emptyStationLists(): StationPrepList[] {
  return PREP_STATIONS.map((station) => ({
    ...station,
    totalIngredients: 0,
    estimatedTime: 0,
    ingredients: [],
    tasks: [],
  }));
}

export function groupIngredientsByStation(
  allIngredients: DishIngredient[],
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

interface AggregatedIngredient {
  ingredient: DishIngredient;
  scaledQuantity: number;
  stations: Set<string>;
}

function aggregateIngredients(
  allIngredients: DishIngredient[],
  dishes: DishInfo[],
  batchMultiplier: number
): Map<string, AggregatedIngredient> {
  const map = new Map<string, AggregatedIngredient>();

  for (const ingredient of allIngredients) {
    const dish = dishes.find((d) => d.id === ingredient.dishId);
    if (!dish?.recipeInfo) {
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
  const yieldQuantity = dish.recipeInfo?.yieldQuantity || 1;
  const servingsPerRecipe = dish.quantityServings;
  const servingsMultiplier = servingsPerRecipe / yieldQuantity;

  return baseQuantity * batchMultiplier * servingsMultiplier;
}

function populateStations(
  ingredientMap: Map<string, AggregatedIngredient>,
  stationMap: Map<string, StationPrepList>,
  dietaryRestrictions: string[]
): void {
  for (const data of ingredientMap.values()) {
    const stations = Array.from(data.stations);
    const primaryStationId = stations[0];
    if (!primaryStationId) {
      continue;
    }

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
