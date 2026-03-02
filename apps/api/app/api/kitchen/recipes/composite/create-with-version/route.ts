import type { ConstraintOutcome } from "@angriff36/manifest/ir";
import { auth } from "@repo/auth/server";
import {
  database,
  type IngredientInput,
  resolveIngredients,
} from "@repo/database";
import { createManifestRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";
import {
  getBlockingConstraints,
  manifestConstraintBlockedResponse,
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-adapters/route-helpers";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createSentryTelemetry } from "@/lib/manifest/telemetry";

export const runtime = "nodejs";

/**
 * Ingredient in resolved format (with pre-resolved IDs).
 * Used when frontend has already resolved ingredient and unit IDs.
 */
interface ResolvedIngredientInput {
  ingredientId: string;
  quantity: number;
  unitId: number;
  preparationNotes?: string;
  isOptional?: boolean;
  sortOrder: number;
}

/**
 * Ingredient in raw format (with name and unit code).
 * Used for backward compatibility with frontend forms that send free-text.
 */
interface RawIngredientInput {
  name: string;
  quantity: number;
  unit?: string | null;
  preparationNotes?: string | null;
  isOptional?: boolean;
  sortOrder: number;
}

/**
 * Union type accepting either resolved or raw ingredient format.
 */
type IngredientInputItem = ResolvedIngredientInput | RawIngredientInput;

/**
 * Type guard to check if ingredient is in resolved format.
 */
function isResolvedIngredient(
  item: IngredientInputItem
): item is ResolvedIngredientInput {
  return typeof (item as ResolvedIngredientInput).ingredientId === "string";
}

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
  // Related entities - supports both resolved and raw formats
  ingredients?: IngredientInputItem[];
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
  // Override support - when provided, constraints will be overridden
  override?: {
    reasonCode: string;
    details: string;
  };
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
    const hasOverride = Boolean(body.override);

    // Collect all constraint outcomes for potential override response
    let allConstraintOutcomes: ConstraintOutcome[] = [];

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

      // Collect constraint outcomes
      if (recipeResult.constraintOutcomes) {
        allConstraintOutcomes = [
          ...allConstraintOutcomes,
          ...recipeResult.constraintOutcomes,
        ];
      }

      // Check for blocking constraints (unless override is provided)
      if (!hasOverride) {
        const blocking = getBlockingConstraints(recipeResult);
        if (blocking) {
          // Return constraint-blocked response instead of throwing
          throw Object.assign(new Error("CONSTRAINT_BLOCKED"), {
            constraintOutcomes: allConstraintOutcomes,
          });
        }
      }

      if (!(recipeResult.success || hasOverride)) {
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

      // Collect constraint outcomes
      if (versionResult.constraintOutcomes) {
        allConstraintOutcomes = [
          ...allConstraintOutcomes,
          ...versionResult.constraintOutcomes,
        ];
      }

      // Check for blocking constraints (unless override is provided)
      if (!hasOverride) {
        const blocking = getBlockingConstraints(versionResult);
        if (blocking) {
          throw Object.assign(new Error("CONSTRAINT_BLOCKED"), {
            constraintOutcomes: allConstraintOutcomes,
          });
        }
      }

      if (!(versionResult.success || hasOverride)) {
        throw new Error(
          versionResult.guardFailure?.formatted ||
            versionResult.policyDenial?.policyName ||
            versionResult.error ||
            "Failed to create recipe version"
        );
      }

      // 3. Resolve and create RecipeIngredients
      const createdIngredients: unknown[] = [];
      if (body.ingredients && body.ingredients.length > 0) {
        // Separate resolved and raw ingredients
        const resolvedIngredients: ResolvedIngredientInput[] = [];
        const rawIngredients: IngredientInput[] = [];

        for (const item of body.ingredients) {
          if (isResolvedIngredient(item)) {
            resolvedIngredients.push(item);
          } else {
            rawIngredients.push({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit ?? null,
              preparationNotes: item.preparationNotes ?? null,
              isOptional: item.isOptional ?? false,
            });
          }
        }

        // Resolve raw ingredients to IDs within the same transaction
        const newlyResolved =
          rawIngredients.length > 0
            ? await resolveIngredients(tx, tenantId, rawIngredients)
            : [];

        // Combine all resolved ingredients with their sort orders
        const allIngredients = [
          ...resolvedIngredients.map((r) => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
            unitId: r.unitId,
            preparationNotes: r.preparationNotes || null,
            isOptional: r.isOptional ?? false,
            sortOrder: r.sortOrder,
          })),
          ...newlyResolved.map((r, idx) => ({
            ingredientId: r.ingredientId,
            quantity: r.quantity,
            unitId: r.unitId,
            preparationNotes: r.preparationNotes,
            isOptional: r.isOptional,
            sortOrder: rawIngredients[idx]?.sortOrder ?? idx,
          })),
        ];

        // Create RecipeIngredient records
        for (const ingredient of allIngredients) {
          const recipeIngredientId = crypto.randomUUID();
          const ingredientResult = await runtime.runCommand(
            "create",
            {
              id: recipeIngredientId,
              recipeVersionId: versionId,
              ingredientId: ingredient.ingredientId,
              quantity: ingredient.quantity,
              unitId: ingredient.unitId,
              preparationNotes: ingredient.preparationNotes || "",
              isOptional: ingredient.isOptional,
              sortOrder: ingredient.sortOrder,
            },
            { entityName: "RecipeIngredient" }
          );

          if (ingredientResult.constraintOutcomes) {
            allConstraintOutcomes = [
              ...allConstraintOutcomes,
              ...ingredientResult.constraintOutcomes,
            ];
          }

          if (!(ingredientResult.success || hasOverride)) {
            throw new Error(
              `Failed to create ingredient: ${ingredientResult.guardFailure?.formatted || ingredientResult.error}`
            );
          }
          if (ingredientResult.result) {
            createdIngredients.push(ingredientResult.result);
          }
        }
      }

      // 4. Create RecipeSteps
      const createdSteps: unknown[] = [];
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

          if (stepResult.constraintOutcomes) {
            allConstraintOutcomes = [
              ...allConstraintOutcomes,
              ...stepResult.constraintOutcomes,
            ];
          }

          if (!(stepResult.success || hasOverride)) {
            throw new Error(
              `Failed to create step ${step.stepNumber}: ${stepResult.guardFailure?.formatted || stepResult.error}`
            );
          }
          if (stepResult.result) {
            createdSteps.push(stepResult.result);
          }
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
        constraintOutcomes: allConstraintOutcomes,
      };
    });

    return manifestSuccessResponse({
      recipe: result.recipe,
      version: result.version,
      ingredients: result.ingredients,
      steps: result.steps,
      events: result.events,
      constraintOutcomes: result.constraintOutcomes,
      recipeId,
    });
  } catch (error) {
    // Check if this is a constraint-blocked error
    if (
      error instanceof Error &&
      error.message === "CONSTRAINT_BLOCKED" &&
      "constraintOutcomes" in error
    ) {
      return manifestConstraintBlockedResponse(
        (error as { constraintOutcomes: unknown[] }).constraintOutcomes,
        "Recipe creation blocked by constraints"
      );
    }

    console.error("[composite/create-with-version] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to create recipe";
    return manifestErrorResponse(message, 500);
  }
}
