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
import { createManifestRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";
import {
  getBlockingConstraints,
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-adapters/route-helpers";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createSentryTelemetry } from "@/lib/manifest/telemetry";

export const runtime = "nodejs";

export interface PortionScaleRequest {
  recipeVersionId: string;
  targetPortions: number;
  currentYield: number;
}

export interface ScaledRecipeCost {
  scaledTotalCost: number;
  scaledCostPerYield: number;
  scaleFactor: number;
  originalCost: number;
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
 * POST - Calculate scaled recipe cost (read-only, no manifest runtime needed)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
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
    console.error("[recipes/scale] Error:", error);
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
  { params }: { params: Promise<{ recipeId: string }> }
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
    const sentryTelemetry = createSentryTelemetry();

    const result = await database.$transaction(async (tx) => {
      const runtime = await createManifestRuntime(
        {
          prisma: database,
          prismaOverride: tx,
          log,
          captureException,
          telemetry: sentryTelemetry,
        },
        {
          user: { id: userId, tenantId },
        }
      );

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

    console.error("[recipes/scale] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to update waste factor";
    return manifestErrorResponse(message, 500);
  }
}
