"use server";

/**
 * Prep list creation server actions.
 *
 * apps/app does not execute Manifest directly (architecture contract:
 * docs/manifest-architecture-contract.md). These actions forward to the
 * allowlisted apps/api orchestration route
 * `POST /api/kitchen/prep-lists/commands/create`, which runs the governed
 * PrepList.create constraint check and persists the prep list, items, and
 * outbox event atomically.
 */

import type { ConstraintOutcome } from "@repo/design-system/components/constraint-override-dialog";
import { revalidatePath } from "next/cache";
import { apiPostJsonServer } from "../../../lib/api-server";
import { requireCurrentUser } from "../../../lib/tenant";

// ============ Helper Types ============

export interface PrepListItemInput {
  stationId: string;
  stationName: string;
  ingredientId: string;
  ingredientName: string;
  category: string | null;
  baseQuantity: number;
  baseUnit: string;
  scaledQuantity: number;
  scaledUnit: string;
  isOptional: boolean;
  preparationNotes: string | null;
  allergens: string[];
  dietarySubstitutions: string[];
  dishId: string | null;
  dishName: string | null;
  recipeVersionId: string | null;
}

export interface CreatePrepListInput {
  eventId: string;
  name: string;
  batchMultiplier: number;
  dietaryRestrictions: string[];
  totalItems: number;
  totalEstimatedTime: number;
  notes: string | null;
  items: PrepListItemInput[];
}

// ============ Result Types ============

export interface PrepListManifestActionResult {
  success: boolean;
  constraintOutcomes?: ConstraintOutcome[];
  redirectUrl?: string;
  error?: string;
  prepListId?: string;
}

interface OverrideRequestInput {
  constraintCode: string;
  reason: string;
  authorizedBy: string;
  timestamp: number;
}

/**
 * Create override requests from user-provided reason and details
 */
function createOverrideRequests(
  constraints: ConstraintOutcome[],
  reason: string,
  userId: string
): OverrideRequestInput[] {
  return constraints.map((c) => ({
    constraintCode: c.code,
    reason,
    authorizedBy: userId,
    timestamp: Date.now(),
  }));
}

// ============ Public Actions ============

/**
 * Create a new prep list via the apps/api orchestration route (governed
 * Manifest constraint checking + atomic persistence).
 *
 * @param input - Prep list creation data
 * @param overrideRequests - Optional override requests for blocking constraints
 * @returns ActionResult with constraint outcomes and redirect URL
 */
export const createPrepListManifest = async (
  input: CreatePrepListInput,
  overrideRequests?: OverrideRequestInput[]
): Promise<PrepListManifestActionResult> => {
  let response: Response;
  try {
    response = await apiPostJsonServer("/api/kitchen/prep-lists/commands/create", {
      input,
      ...(overrideRequests && overrideRequests.length > 0
        ? { overrideRequests }
        : {}),
    });
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create prep list",
    };
  }

  const result = (await response
    .json()
    .catch(() => null)) as PrepListManifestActionResult | null;

  if (!result) {
    return {
      success: false,
      error: `Failed to create prep list (${response.status})`,
    };
  }

  if (result.success) {
    revalidatePath("/kitchen/prep-lists");
  }

  return result;
};

/**
 * Create a prep list with override requests.
 * Helper function for the frontend to call after user confirms override.
 */
export const createPrepListWithOverride = async (
  input: CreatePrepListInput,
  reason: string,
  details: string
): Promise<PrepListManifestActionResult> => {
  const currentUser = await requireCurrentUser();

  // First run without overrides to get constraint outcomes
  const initialResult = await createPrepListManifest(input);

  if (!initialResult.success && initialResult.constraintOutcomes) {
    // Create override requests from the blocking constraints
    const overrideRequests = createOverrideRequests(
      initialResult.constraintOutcomes.filter(
        (c) => !c.passed && c.severity === "block"
      ),
      `${reason}: ${details}`,
      currentUser.id
    );

    // Re-run with override requests
    return createPrepListManifest(input, overrideRequests);
  }

  return initialResult;
};

// ============ Re-export existing actions ============

// Re-export generatePrepList, savePrepListToProductionBoard, savePrepListToDatabase from original actions
import {
  generatePrepList as _generatePrepList,
  savePrepListToDatabase as _savePrepListToDatabase,
  savePrepListToProductionBoard as _savePrepListToProductionBoard,
} from "./actions";

export const generatePrepList = _generatePrepList;
export const savePrepListToDatabase = _savePrepListToDatabase;
export const savePrepListToProductionBoard = _savePrepListToProductionBoard;

// Re-export types
export type {
  IngredientItem,
  PrepListGenerationResult,
  StationPrepList,
} from "./actions";
