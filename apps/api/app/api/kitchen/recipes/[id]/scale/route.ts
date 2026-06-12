/**
 * @module RecipeScale
 * @intent Handle API requests to scale recipe costs and update ingredient waste factors
 * @responsibility Calculate scaled costs, update waste factors via manifest runtime
 * @domain Kitchen
 * @tags recipes, api, scaling, cost-calculation
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  getBlockingConstraints,
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-runtime/route-helpers";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

export interface PortionScaleRequest {
  currentYield: number;
  recipeVersionId: string;
  targetPortions: number;
}

export interface ScaledRecipeCost {
  originalCost: number;
  scaledCostPerYield: number;
  scaledTotalCost: number;
  scaleFactor: number;
}

export interface ScaledIngredient {
  ingredientId: string;
  ingredientName: string;
  isOptional: boolean;
  originalQuantity: number;
  preparationNotes: string | null;
  scaledQuantity: number;
  scaleFactor: number;
  unitId: number;
}

/**
 * Calculate scaled recipe cost based on target portions.
 * This is a read-only calculation that does not modify data.
 */
const scaleRecipeCost = async (
  recipeVersionId: string,
  targetPortions: number,
  currentYield: number,
  tenantId: string
): Promise<ScaledRecipeCost> => {
  const recipeVersion = await database.recipeVersion.findFirst({
    where: { tenantId, id: recipeVersionId, deletedAt: null },
    select: { totalCost: true, costPerYield: true, yieldQuantity: true },
  });

  if (!recipeVersion) {
    throw new Error("Recipe version not found");
  }

  const originalCost = Number(recipeVersion.totalCost);
  const scaleFactor = targetPortions / currentYield;
  const scaledTotalCost = originalCost * scaleFactor;
  const scaledCostPerYield = Number(recipeVersion.costPerYield) * scaleFactor;

  return {
    scaledTotalCost,
    scaledCostPerYield,
    scaleFactor,
    originalCost,
  };
};

/**
 * GET - Calculate scaled ingredient quantities for a recipe version.
 * Query params: servings (required), recipeVersionId (optional, uses latest if omitted)
 * Returns server-computed scaled quantities so clients don't need their own scaling math.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const servingsParam = searchParams.get("servings");
    const versionIdParam = searchParams.get("recipeVersionId");

    if (!servingsParam) {
      return manifestErrorResponse("servings query parameter is required", 400);
    }

    const targetServings = Number(servingsParam);
    if (Number.isNaN(targetServings) || targetServings <= 0) {
      return manifestErrorResponse("servings must be a positive number", 400);
    }

    // Find recipe version — use specified version or latest
    const recipeVersion = await database.recipeVersion.findFirst({
      where: {
        tenantId,
        ...(versionIdParam ? { id: versionIdParam } : { recipeId }),
        deletedAt: null,
      },
      orderBy: { versionNumber: "desc" },
      select: {
        id: true,
        yieldQuantity: true,
        versionNumber: true,
        name: true,
      },
    });

    if (!recipeVersion) {
      return manifestErrorResponse("Recipe version not found", 404);
    }

    const yieldQuantity = Number(recipeVersion.yieldQuantity);
    if (yieldQuantity <= 0) {
      return manifestErrorResponse("Recipe has invalid yield quantity", 422);
    }

    const scaleFactor = targetServings / yieldQuantity;

    // Fetch ingredients for this version
    const ingredients = await database.recipeIngredient.findMany({
      where: {
        tenantId,
        recipeVersionId: recipeVersion.id,
        deletedAt: null,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        ingredientId: true,
        quantity: true,
        unitId: true,
        preparationNotes: true,
        isOptional: true,
        wasteFactor: true,
      },
    });

    // Batch fetch ingredient names
    const ingredientIds = ingredients.map((i) => i.ingredientId);
    const ingredientRecords = await database.ingredient.findMany({
      where: {
        tenantId,
        id: { in: ingredientIds },
      },
      select: { id: true, name: true },
    });

    const nameMap = new Map(ingredientRecords.map((i) => [i.id, i.name]));

    // Compute scaled quantities server-side
    const scaledIngredients: ScaledIngredient[] = ingredients.map((ing) => {
      const originalQuantity = Number(ing.quantity);
      const wasteFactor = Number(ing.wasteFactor);
      const scaledQuantity =
        Math.round(originalQuantity * scaleFactor * wasteFactor * 100) / 100;

      return {
        ingredientId: ing.ingredientId,
        ingredientName: nameMap.get(ing.ingredientId) ?? "Unknown",
        originalQuantity,
        scaledQuantity,
        unitId: ing.unitId,
        preparationNotes: ing.preparationNotes,
        isOptional: ing.isOptional,
        scaleFactor,
      };
    });

    return manifestSuccessResponse({
      recipeVersionId: recipeVersion.id,
      recipeVersionName: recipeVersion.name,
      versionNumber: recipeVersion.versionNumber,
      yieldQuantity,
      targetServings,
      scaleFactor,
      ingredients: scaledIngredients,
    });
  } catch (error) {
    log.error("[recipes/scale] GET Error:", error);
    captureException(error);
    const message =
      error instanceof Error ? error.message : "Failed to scale ingredients";
    return manifestErrorResponse(message, 500);
  }
}

/**
 * POST - Calculate scaled recipe cost (read-only, no manifest runtime needed)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const recipeVersionId = recipeId;
    const body = await request.json();
    const { targetPortions, currentYield } = body;
    const { orgId } = await auth();

    if (!(recipeVersionId && targetPortions && currentYield)) {
      return manifestErrorResponse("Missing required fields", 400);
    }

    if (!orgId) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const result = await scaleRecipeCost(
      recipeVersionId,
      targetPortions,
      currentYield,
      tenantId
    );

    return manifestSuccessResponse(result);
  } catch (error) {
    log.error("[recipes/scale] Error:", error);
    captureException(error);
    const message =
      error instanceof Error ? error.message : "Failed to scale recipe cost";
    return manifestErrorResponse(message, 500);
  }
}

/**
 * PATCH - Update ingredient waste factor via manifest runtime
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();

    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body = await request.json();
    const { recipeIngredientId, wasteFactor } = body;

    if (!recipeIngredientId || typeof wasteFactor !== "number") {
      return manifestErrorResponse(
        "recipeIngredientId and wasteFactor are required",
        400
      );
    }

    // Execute update via manifest runtime
    const result = await database.$transaction(async (tx) => {
      const runtime = await createManifestRuntime({
        user: { id: userId, tenantId },
        prismaOverride: tx,
      });

      const updateResult = await runtime.runCommand(
        "updateWasteFactor",
        {
          id: recipeIngredientId,
          newWasteFactor: wasteFactor,
        },
        { entityName: "RecipeIngredient" }
      );

      // Check for blocking constraints
      const blocking = getBlockingConstraints(updateResult);
      if (blocking) {
        throw Object.assign(new Error("CONSTRAINT_BLOCKED"), {
          constraintOutcomes: updateResult.constraintOutcomes || [],
        });
      }

      if (!updateResult.success) {
        throw new Error(
          updateResult.guardFailure?.formatted ||
            updateResult.policyDenial?.policyName ||
            updateResult.error ||
            "Failed to update waste factor"
        );
      }

      return updateResult;
    });

    return manifestSuccessResponse({
      success: true,
      recipeIngredientId,
      wasteFactor,
      events: result.emittedEvents || [],
      constraintOutcomes: result.constraintOutcomes || [],
    });
  } catch (error) {
    // Check if this is a constraint-blocked error
    if (
      error instanceof Error &&
      error.message === "CONSTRAINT_BLOCKED" &&
      "constraintOutcomes" in error
    ) {
      return manifestErrorResponse(
        "Waste factor update blocked by constraints",
        400,
        {
          constraintOutcomes: (error as { constraintOutcomes: unknown[] })
            .constraintOutcomes,
        }
      );
    }

    log.error("[recipes/scale] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to update waste factor";
    return manifestErrorResponse(message, 500);
  }
}
