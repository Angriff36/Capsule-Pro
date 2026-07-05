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
  allergens: string[];
  baseQuantity: number;
  baseUnit: string;
  category: string | null;
  dietarySubstitutions: string[];
  dishId: string | null;
  dishName: string | null;
  ingredientId: string;
  ingredientName: string;
  isOptional: boolean;
  preparationNotes: string | null;
  recipeVersionId: string | null;
  scaledQuantity: number;
  scaledUnit: string;
  stationId: string;
  stationName: string;
}

export interface CreatePrepListInput {
  batchMultiplier: number;
  dietaryRestrictions: string[];
  eventId: string;
  items: PrepListItemInput[];
  name: string;
  notes: string | null;
  totalEstimatedTime: number;
  totalItems: number;
}

// ============ Result Types ============

export interface PrepListManifestActionResult {
  constraintOutcomes?: ConstraintOutcome[];
  error?: string;
  prepListId?: string;
  redirectUrl?: string;
  success: boolean;
}

interface OverrideRequestInput {
  authorizedBy: string;
  constraintCode: string;
  reason: string;
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
    response = await apiPostJsonServer(
      "/api/kitchen/prep-lists/commands/create",
      {
        input,
        ...(overrideRequests && overrideRequests.length > 0
          ? { overrideRequests }
          : {}),
      }
    );
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

// ============ Re-export generation types ============

export type {
  IngredientItem,
  PrepListGenerationResult,
  StationPrepList,
} from "./actions";
