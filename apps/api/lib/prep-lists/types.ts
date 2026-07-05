/**
 * Shared types for prep-list generation.
 *
 * Canonical generation lives in apps/api/lib/prep-lists/generation.ts and is
 * served by POST /api/kitchen/prep-lists/generate. apps/app consumes these
 * shapes over HTTP (dates arrive as ISO strings on the wire).
 */

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

export interface RecipeInfo {
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

export interface DishInfo {
  course: string | null;
  dietaryTags: string[];
  id: string;
  minPrepLeadDays: number;
  name: string;
  quantityServings: number;
  recipeId: string | null;
  recipeInfo: RecipeInfo | null;
  recipeName: string | null;
  servingPortion: number;
}

export interface StationTask {
  dueDate: Date;
  id: string;
  name: string;
  priority: number;
  status: string;
}

export interface StationPrepList {
  color: string;
  estimatedTime: number;
  icon: string;
  ingredients: IngredientItem[];
  stationId: string;
  stationName: string;
  tasks: StationTask[];
  totalIngredients: number;
}

export type UnresolvedDishReason =
  | "no_recipe"
  | "no_recipe_version"
  | "no_ingredients";

/**
 * A dish that is linked to the event but cannot contribute ingredients.
 * Surfaced so the UI can tell the user exactly what to fix instead of
 * pretending no dishes are linked.
 */
export interface UnresolvedDish {
  dishId: string;
  dishName: string;
  reason: UnresolvedDishReason;
  recipeId: string | null;
  recipeName: string | null;
}

export interface PrepListGenerationResult {
  batchMultiplier: number;
  dietaryRestrictions: string[];
  eventDate: Date;
  eventId: string;
  eventTitle: string;
  generatedAt: Date;
  guestCount: number;
  /** Count of dishes linked to the event via tenant_events.event_dishes. */
  linkedDishCount: number;
  /** Dishes whose recipe→version→ingredient chain fully resolved. */
  resolvedDishCount: number;
  stationLists: StationPrepList[];
  totalEstimatedTime: number;
  totalIngredients: number;
  unresolvedDishes: UnresolvedDish[];
}

export interface GeneratePrepListInput {
  batchMultiplier?: number;
  customInstructions?: string;
  dietaryRestrictions?: string[];
  eventId: string;
}

/** One ingredient row attributed to one dish (pre-aggregation). */
export interface DishIngredient {
  allergens: string[];
  category: string | null;
  dishId: string;
  dishName: string;
  ingredientId: string;
  ingredientName: string;
  isOptional: boolean;
  preparationNotes: string | null;
  quantity: number;
  recipeVersionId: string;
  unitCode: string;
}

/** Thrown when the requested event does not exist for the tenant. */
export class PrepListEventNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Event not found: ${eventId}`);
    this.name = "PrepListEventNotFoundError";
  }
}
