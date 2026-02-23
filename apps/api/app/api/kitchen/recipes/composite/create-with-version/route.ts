import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createManifestRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-adapters/route-helpers";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createSentryTelemetry } from "@/lib/manifest/telemetry";

export const runtime = "nodejs";

interface CreateRecipeRequest {
  // Recipe fields
  name: string;
  category?: string;
  cuisineType?: string;
  description?: string;
  tags?: string[];
  // Version fields
  yieldQuantity: number;
  yieldUnitId: number;
  yieldDescription?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  restTimeMinutes?: number;
  difficultyLevel?: number;
  instructions?: string;
  notes?: string;
  // Related entities
  ingredients?: {
    ingredientId: string;
    quantity: number;
    unitId: number;
    preparationNotes?: string;
    isOptional?: boolean;
    sortOrder: number;
  }[];
  steps?: {
    stepNumber: number;
    instruction: string;
    durationMinutes?: number;
    temperatureValue?: number;
    temperatureUnit?: string;
    equipmentNeeded?: string;
    tips?: string;
    videoUrl?: string;
    imageUrl?: string;
  }[];
  // Idempotency
  idempotencyKey?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body: CreateRecipeRequest = await request.json();

    // Validate required fields
    if (!body.name) {
      return manifestErrorResponse("Recipe name is required", 400);
    }
    if (!body.yieldQuantity || body.yieldQuantity <= 0) {
      return manifestErrorResponse("Yield quantity must be positive", 400);
    }
    if (!body.yieldUnitId) {
      return manifestErrorResponse("Yield unit is required", 400);
    }

    // Generate IDs upfront
    const recipeId = crypto.randomUUID();
    const versionId = crypto.randomUUID();

    // Execute everything in a single transaction
    const sentryTelemetry = createSentryTelemetry();

    const result = await database.$transaction(async (tx) => {
      // Create manifest runtime with transaction client override
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

      // 1. Create Recipe
      const recipeResult = await runtime.runCommand(
        "create",
        {
          id: recipeId,
          name: body.name,
          category: body.category || "",
          cuisineType: body.cuisineType || "",
          description: body.description || "",
          tags: body.tags || [],
          isActive: true,
        },
        { entityName: "Recipe" }
      );

      if (!recipeResult.success) {
        throw new Error(
          recipeResult.guardFailure?.formatted ||
            recipeResult.policyDenial?.policyName ||
            recipeResult.error ||
            "Failed to create recipe"
        );
      }

      // 2. Create RecipeVersion (version 1)
      const versionResult = await runtime.runCommand(
        "create",
        {
          id: versionId,
          recipeId,
          name: body.name,
          category: body.category || "",
          cuisineType: body.cuisineType || "",
          description: body.description || "",
          tags: body.tags || [],
          versionNumber: 1,
          yieldQuantity: body.yieldQuantity,
          yieldUnitId: body.yieldUnitId,
          yieldDescription: body.yieldDescription || "",
          prepTimeMinutes: body.prepTimeMinutes || 0,
          cookTimeMinutes: body.cookTimeMinutes || 0,
          restTimeMinutes: body.restTimeMinutes || 0,
          difficultyLevel: body.difficultyLevel || 1,
          instructions: body.instructions || "",
          notes: body.notes || "",
        },
        { entityName: "RecipeVersion" }
      );

      if (!versionResult.success) {
        throw new Error(
          versionResult.guardFailure?.formatted ||
            versionResult.policyDenial?.policyName ||
            versionResult.error ||
            "Failed to create recipe version"
        );
      }

      // 3. Create RecipeIngredients
      const createdIngredients = [];
      if (body.ingredients && body.ingredients.length > 0) {
        for (const ingredient of body.ingredients) {
          const ingredientId = crypto.randomUUID();
          const ingredientResult = await runtime.runCommand(
            "create",
            {
              id: ingredientId,
              recipeVersionId: versionId,
              ingredientId: ingredient.ingredientId,
              quantity: ingredient.quantity,
              unitId: ingredient.unitId,
              preparationNotes: ingredient.preparationNotes || "",
              isOptional: ingredient.isOptional || false,
              sortOrder: ingredient.sortOrder,
            },
            { entityName: "RecipeIngredient" }
          );

          if (!ingredientResult.success) {
            throw new Error(
              `Failed to create ingredient: ${ingredientResult.guardFailure?.formatted || ingredientResult.error}`
            );
          }
          createdIngredients.push(ingredientResult.result);
        }
      }

      // 4. Create RecipeSteps
      const createdSteps = [];
      if (body.steps && body.steps.length > 0) {
        for (const step of body.steps) {
          const stepId = crypto.randomUUID();
          const stepResult = await runtime.runCommand(
            "create",
            {
              id: stepId,
              recipeVersionId: versionId,
              stepNumber: step.stepNumber,
              instruction: step.instruction,
              durationMinutes: step.durationMinutes || 0,
              temperatureValue: step.temperatureValue || 0,
              temperatureUnit: step.temperatureUnit || "",
              equipmentNeeded: step.equipmentNeeded || "",
              tips: step.tips || "",
              videoUrl: step.videoUrl || "",
              imageUrl: step.imageUrl || "",
            },
            { entityName: "RecipeStep" }
          );

          if (!stepResult.success) {
            throw new Error(
              `Failed to create step ${step.stepNumber}: ${stepResult.guardFailure?.formatted || stepResult.error}`
            );
          }
          createdSteps.push(stepResult.result);
        }
      }

      return {
        recipe: recipeResult.result,
        version: versionResult.result,
        ingredients: createdIngredients,
        steps: createdSteps,
        events: [
          ...(recipeResult.emittedEvents || []),
          ...(versionResult.emittedEvents || []),
        ],
      };
    });

    return manifestSuccessResponse({
      recipe: result.recipe,
      version: result.version,
      ingredients: result.ingredients,
      steps: result.steps,
      events: result.events,
    });
  } catch (error) {
    console.error("[composite/create-with-version] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to create recipe";
    return manifestErrorResponse(message, 500);
  }
}
