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

interface UpdateRecipeRequest {
  // Recipe fields to update
  name?: string;
  category?: string;
  cuisineType?: string;
  description?: string;
  tags?: string[];
  // New version fields
  yieldQuantity?: number;
  yieldUnitId?: number;
  yieldDescription?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  restTimeMinutes?: number;
  difficultyLevel?: number;
  instructions?: string;
  notes?: string;
  // Related entities (replaces all) - supports both resolved and raw formats
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
  // Override support - when provided, constraints will be overridden
  override?: {
    reasonCode: string;
    details: string;
  };
}

export async function POST(
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

    const { recipeId } = await params;
    const body: UpdateRecipeRequest = await request.json();

    // Get current max version number with lock
    const versionInfo = await database.$queryRaw<{ max_version: bigint }[]>`
      SELECT MAX(version_number) as max_version
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}::uuid
        AND recipe_id = ${recipeId}::uuid
        AND deleted_at IS NULL
      FOR UPDATE
    `;

    if (versionInfo.length === 0 || !versionInfo[0].max_version) {
      return manifestErrorResponse("Recipe not found", 404);
    }

    const newVersionNumber = Number(versionInfo[0].max_version) + 1;
    const newVersionId = crypto.randomUUID();

    // Execute update in a transaction
    const sentryTelemetry = createSentryTelemetry();
    const hasOverride = Boolean(body.override);

    // Collect all constraint outcomes for potential override response
    let allConstraintOutcomes: ConstraintOutcome[] = [];

    const result = await database.$transaction(async (tx) => {
      // Create manifest runtime with transaction client
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

      // 1. Update Recipe if fields provided
      if (
        body.name ||
        body.category ||
        body.cuisineType ||
        body.description ||
        body.tags
      ) {
        // Get current recipe data
        const currentRecipe = await database.$queryRaw<
          {
            name: string;
            category: string | null;
            cuisine_type: string | null;
            description: string | null;
            tags: string[];
          }[]
        >`
          SELECT name, category, cuisine_type, description, tags
          FROM tenant_kitchen.recipes
          WHERE tenant_id = ${tenantId}::uuid
            AND id = ${recipeId}::uuid
            AND deleted_at IS NULL
        `;

        if (currentRecipe.length === 0) {
          throw new Error("Recipe not found");
        }

        const recipe = currentRecipe[0];
        const updateResult = await runtime.runCommand(
          "update",
          {
            id: recipeId,
            name: body.name ?? recipe.name,
            category: body.category ?? recipe.category ?? "",
            cuisineType: body.cuisineType ?? recipe.cuisine_type ?? "",
            description: body.description ?? recipe.description ?? "",
            tags: body.tags ?? recipe.tags ?? [],
          },
          { entityName: "Recipe" }
        );

        // Collect constraint outcomes
        if (updateResult.constraintOutcomes) {
          allConstraintOutcomes = [
            ...allConstraintOutcomes,
            ...updateResult.constraintOutcomes,
          ];
        }

        // Check for blocking constraints (unless override is provided)
        if (!hasOverride) {
          const blocking = getBlockingConstraints(updateResult);
          if (blocking) {
            throw Object.assign(new Error("CONSTRAINT_BLOCKED"), {
              constraintOutcomes: allConstraintOutcomes,
            });
          }
        }
      }

      // 2. Get latest version data for defaults
      const latestVersion = await database.$queryRaw<
        {
          name: string;
          category: string | null;
          cuisine_type: string | null;
          description: string | null;
          tags: string[];
          yield_quantity: bigint;
          yield_unit_id: number;
          yield_description: string | null;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          rest_time_minutes: number | null;
          difficulty_level: number | null;
          instructions: string | null;
          notes: string | null;
        }[]
      >`
        SELECT name, category, cuisine_type, description, tags,
               yield_quantity, yield_unit_id, yield_description,
               prep_time_minutes, cook_time_minutes, rest_time_minutes,
               difficulty_level, instructions, notes
        FROM tenant_kitchen.recipe_versions
        WHERE tenant_id = ${tenantId}::uuid
          AND recipe_id = ${recipeId}::uuid
          AND deleted_at IS NULL
        ORDER BY version_number DESC
        LIMIT 1
      `;

      if (latestVersion.length === 0) {
        throw new Error("No version found for recipe");
      }

      const prev = latestVersion[0];

      // 3. Create new RecipeVersion
      const versionResult = await runtime.runCommand(
        "create",
        {
          id: newVersionId,
          recipeId,
          name: body.name ?? prev.name,
          category: body.category ?? prev.category ?? "",
          cuisineType: body.cuisineType ?? prev.cuisine_type ?? "",
          description: body.description ?? prev.description ?? "",
          tags: body.tags ?? prev.tags ?? [],
          versionNumber: newVersionNumber,
          yieldQuantity: body.yieldQuantity ?? Number(prev.yield_quantity),
          yieldUnitId: body.yieldUnitId ?? prev.yield_unit_id,
          yieldDescription:
            body.yieldDescription ?? prev.yield_description ?? "",
          prepTimeMinutes: body.prepTimeMinutes ?? prev.prep_time_minutes ?? 0,
          cookTimeMinutes: body.cookTimeMinutes ?? prev.cook_time_minutes ?? 0,
          restTimeMinutes: body.restTimeMinutes ?? prev.rest_time_minutes ?? 0,
          difficultyLevel: body.difficultyLevel ?? prev.difficulty_level ?? 1,
          instructions: body.instructions ?? prev.instructions ?? "",
          notes: body.notes ?? prev.notes ?? "",
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
            "Failed to create new version"
        );
      }

      // 4. Resolve and create ingredients if provided
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
              recipeVersionId: newVersionId,
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

      // 5. Create steps if provided
      const createdSteps: unknown[] = [];
      const stepsToCreate = body.steps || [];

      for (const step of stepsToCreate) {
        const stepId = crypto.randomUUID();
        const stepResult = await runtime.runCommand(
          "create",
          {
            id: stepId,
            recipeVersionId: newVersionId,
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

      return {
        version: versionResult.result,
        ingredients: createdIngredients,
        steps: createdSteps,
        newVersionNumber,
        events: versionResult.emittedEvents || [],
        constraintOutcomes: allConstraintOutcomes,
      };
    });

    return manifestSuccessResponse({
      version: result.version,
      ingredients: result.ingredients,
      steps: result.steps,
      newVersionNumber: result.newVersionNumber,
      events: result.events,
      constraintOutcomes: result.constraintOutcomes,
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
        "Recipe update blocked by constraints"
      );
    }

    console.error("[composite/update-with-version] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to update recipe";
    return manifestErrorResponse(message, 500);
  }
}
