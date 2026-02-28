/**
 * @module RecipeCost
 * @intent Handle API requests to calculate and update recipe costs
 * @responsibility Calculate ingredient costs, update RecipeVersion via manifest runtime
 * @domain Kitchen
 * @tags recipes, api, cost-calculation
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

export interface UnitConversion {
  fromUnitId: number;
  toUnitId: number;
  multiplier: number;
}

export interface RecipeCostBreakdown {
  totalCost: number;
  costPerYield: number;
  costPerPortion?: number;
  ingredients: IngredientCostBreakdown[];
}

export interface IngredientCostBreakdown {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  adjustedQuantity: number;
  unitCost: number;
  cost: number;
  hasInventoryItem: boolean;
}

/**
 * Calculate recipe cost from ingredients.
 * Returns cost breakdown without persisting (used by both GET and POST).
 */
const calculateRecipeCostData = async (
  tenantId: string,
  recipeVersionId: string
): Promise<{ breakdown: RecipeCostBreakdown; totalCost: number; costPerYield: number } | null> => {
  const recipeVersion = await database.recipeVersion.findFirst({
    where: { tenantId, id: recipeVersionId, deletedAt: null },
    select: { id: true, yieldQuantity: true },
  });

  if (!recipeVersion) {
    return null;
  }

  const recipeIngredients = await database.recipeIngredient.findMany({
    where: {
      tenantId,
      recipeVersionId,
      deletedAt: null,
    },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      ingredientId: true,
      quantity: true,
      unitId: true,
      wasteFactor: true,
      ingredientCost: true,
    },
  });

  // Fetch ingredient names in a single query to avoid N+1
  const ingredientIds = recipeIngredients.map((ri) => ri.ingredientId);
  const ingredients = await database.ingredient.findMany({
    where: { tenantId, id: { in: ingredientIds }, deletedAt: null },
    select: { id: true, name: true },
  });
  const ingredientNameMap = new Map(ingredients.map((i) => [i.id, i.name]));

  let totalCost = 0;
  const costBreakdowns: IngredientCostBreakdown[] = [];

  for (const ri of recipeIngredients) {
    const cost = Number(ri.ingredientCost) || 0;
    totalCost += cost;

    const quantity = Number(ri.quantity);
    const wasteFactor = Number(ri.wasteFactor);
    const adjustedQuantity = quantity * wasteFactor;

    costBreakdowns.push({
      id: ri.id,
      name: ingredientNameMap.get(ri.ingredientId) ?? "Unknown",
      quantity,
      unit: ri.unitId.toString(),
      wasteFactor,
      adjustedQuantity,
      unitCost: adjustedQuantity > 0 ? cost / adjustedQuantity : 0,
      cost,
      hasInventoryItem: ri.ingredientCost !== null,
    });
  }

  const yieldQuantity = Number(recipeVersion.yieldQuantity);
  const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;

  return {
    breakdown: {
      totalCost,
      costPerYield,
      ingredients: costBreakdowns,
    },
    totalCost,
    costPerYield,
  };
};

/**
 * GET - Fetch recipe cost breakdown (read-only, no persistence)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const recipeVersionId = recipeId;
    const { orgId } = await auth();

    if (!orgId) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const costData = await calculateRecipeCostData(tenantId, recipeVersionId);

    if (!costData) {
      return manifestErrorResponse("Recipe version not found", 404);
    }

    return manifestSuccessResponse(costData.breakdown);
  } catch (error) {
    console.error("[recipes/cost] Error:", error);
    captureException(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch recipe cost";
    return manifestErrorResponse(message, 500);
  }
}

/**
 * POST - Recalculate and persist recipe costs via manifest runtime
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeVersionId: string }> }
) {
  try {
    const { recipeVersionId } = await params;
    const { orgId, userId } = await auth();

    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // Calculate costs first
    const costData = await calculateRecipeCostData(tenantId, recipeVersionId);

    if (!costData) {
      return manifestErrorResponse("Recipe version not found", 404);
    }

    // Update ingredient cost timestamps (batch update, no manifest needed)
    await database.recipeIngredient.updateMany({
      where: {
        tenantId,
        recipeVersionId,
        deletedAt: null,
      },
      data: { costCalculatedAt: new Date() },
    });

    // Update RecipeVersion costs via manifest runtime
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
        "updateCosts",
        {
          id: recipeVersionId,
          newTotalCost: costData.totalCost,
          newCostPerYield: costData.costPerYield,
        },
        { entityName: "RecipeVersion" }
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
            "Failed to update costs"
        );
      }

      return updateResult;
    });

    return manifestSuccessResponse({
      ...costData.breakdown,
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
        "Cost update blocked by constraints",
        400,
        { constraintOutcomes: (error as { constraintOutcomes: unknown[] }).constraintOutcomes }
      );
    }

    console.error("[recipes/cost] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to recalculate recipe cost";
    return manifestErrorResponse(message, 500);
  }
}
