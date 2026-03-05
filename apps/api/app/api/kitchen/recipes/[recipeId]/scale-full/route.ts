/**
 * @module RecipeScaleFull
 * @intent Handle comprehensive recipe scaling with unit conversion and ingredient scaling
 * @responsibility Scale recipes by yield with measurement system conversion
 * @domain Kitchen
 * @tags recipes, api, scaling, unit-conversion, prep-list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  generatePrepListFromScaledRecipe,
  manifestErrorResponse,
  manifestSuccessResponse,
  type ScaledRecipe,
  scaleRecipe,
} from "@repo/manifest-adapters";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

interface ScaleRecipeRequest {
  targetYieldQuantity: number;
  targetYieldUnitId?: number;
  convertToSystem?: "metric" | "imperial";
  generatePrepList?: boolean;
}

interface ScaleRecipeResponse {
  scaledRecipe: ScaledRecipe;
  prepList?: Array<{
    stationId: string;
    stationName: string;
    ingredients: Array<{
      ingredientId: string;
      ingredientName: string;
      scaledQuantity: number;
      scaledUnitCode: string;
      scaledCost: number;
    }>;
  }>;
}

/**
 * POST - Scale recipe with ingredient quantities and unit conversion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const body = (await request.json()) as ScaleRecipeRequest;
    const { orgId } = await auth();

    if (!orgId) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const {
      targetYieldQuantity,
      targetYieldUnitId,
      convertToSystem,
      generatePrepList,
    } = body;

    if (!targetYieldQuantity || targetYieldQuantity <= 0) {
      return manifestErrorResponse("Invalid target yield quantity", 400);
    }

    // Scale the recipe
    const scaledRecipe = await scaleRecipe(
      database,
      tenantId,
      recipeId,
      targetYieldQuantity,
      targetYieldUnitId,
      convertToSystem
    );

    let prepList;
    if (generatePrepList) {
      const stationPrepLists = await generatePrepListFromScaledRecipe(
        database,
        tenantId,
        scaledRecipe
      );

      prepList = stationPrepLists.map((station) => ({
        stationId: station.stationId,
        stationName: station.stationName,
        ingredients: station.ingredients.map((ing) => ({
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredientName,
          scaledQuantity: ing.scaledQuantity,
          scaledUnitCode: ing.scaledUnitCode,
          scaledCost: ing.scaledCost,
        })),
      }));
    }

    const response: ScaleRecipeResponse = {
      scaledRecipe,
      prepList,
    };

    return manifestSuccessResponse(response);
  } catch (error) {
    console.error("[recipes/scale-full] Error:", error);
    captureException(error);
    const message =
      error instanceof Error ? error.message : "Failed to scale recipe";
    return manifestErrorResponse(message, 500);
  }
}
