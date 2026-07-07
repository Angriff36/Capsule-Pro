"use server";

/**
 * Prep-list generation server action.
 *
 * Generation logic is owned by apps/api (POST /api/kitchen/prep-lists/generate,
 * implemented in apps/api/lib/prep-lists/generation.ts). This action forwards
 * the request with session cookies so RSC page loads and other server actions
 * use the exact same code path as the client "Generate" button.
 */

import { apiPostJsonServer } from "../../../../lib/api-server";

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
  /** Count of dishes linked to the event via event_dishes. */
  linkedDishCount: number;
  /** Dishes whose recipe→version→ingredient chain fully resolved. */
  resolvedDishCount: number;
  stationLists: StationPrepList[];
  totalEstimatedTime: number;
  totalIngredients: number;
  unresolvedDishes: UnresolvedDish[];
}

interface GeneratePrepListInput {
  batchMultiplier?: number;
  dietaryRestrictions?: string[];
  eventId: string;
}

/** Wire shape: Date fields arrive as ISO strings from the API. */
type SerializedGenerationResult = Omit<
  PrepListGenerationResult,
  "eventDate" | "generatedAt" | "stationLists"
> & {
  eventDate: string;
  generatedAt: string;
  stationLists: Array<
    Omit<StationPrepList, "tasks"> & {
      tasks: Array<Omit<StationTask, "dueDate"> & { dueDate: string }>;
    }
  >;
};

function reviveGenerationResult(
  raw: SerializedGenerationResult
): PrepListGenerationResult {
  return {
    ...raw,
    eventDate: new Date(raw.eventDate),
    generatedAt: new Date(raw.generatedAt),
    stationLists: raw.stationLists.map((station) => ({
      ...station,
      tasks: station.tasks.map((task) => ({
        ...task,
        dueDate: new Date(task.dueDate),
      })),
    })),
  };
}

export async function generatePrepList(
  input: GeneratePrepListInput
): Promise<PrepListGenerationResult> {
  const response = await apiPostJsonServer("/api/kitchen/prep-lists/generate", {
    eventId: input.eventId,
    batchMultiplier: input.batchMultiplier,
    dietaryRestrictions: input.dietaryRestrictions,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      body?.error ?? `Failed to generate prep list (HTTP ${response.status})`
    );
  }

  const raw = (await response.json()) as SerializedGenerationResult;
  return reviveGenerationResult(raw);
}
