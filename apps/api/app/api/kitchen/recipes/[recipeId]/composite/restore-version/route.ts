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

interface RestoreVersionRequest {
  sourceVersionId: string;
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
    const body: RestoreVersionRequest = await request.json();

    if (!body.sourceVersionId) {
      return manifestErrorResponse("sourceVersionId is required", 400);
    }

    // Get the source version and lock for update to prevent concurrent restores
    const sourceVersion = await database.$queryRaw<
      {
        id: string;
        recipe_id: string;
        version_number: number;
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
        max_version: bigint;
      }[]
    >`
      SELECT v.*, MAX(v.version_number) as max_version
      FROM tenant_kitchen.recipe_versions v
      WHERE v.tenant_id = ${tenantId}::uuid
        AND v.id = ${body.sourceVersionId}::uuid
        AND v.recipe_id = ${recipeId}::uuid
        AND v.deleted_at IS NULL
      GROUP BY v.id
      FOR UPDATE
    `;

    if (sourceVersion.length === 0) {
      return manifestErrorResponse("Source version not found", 404);
    }

    const source = sourceVersion[0];
    const newVersionNumber = Number(source.max_version) + 1;
    const newVersionId = crypto.randomUUID();

    // Execute restore in a transaction
    const sentryTelemetry = createSentryTelemetry();

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

      // Create new version with source data
      const versionResult = await runtime.runCommand(
        "create",
        {
          id: newVersionId,
          recipeId,
          name: source.name,
          category: source.category || "",
          cuisineType: source.cuisine_type || "",
          description: source.description || "",
          tags: source.tags || [],
          versionNumber: newVersionNumber,
          yieldQuantity: Number(source.yield_quantity),
          yieldUnitId: source.yield_unit_id,
          yieldDescription: source.yield_description || "",
          prepTimeMinutes: source.prep_time_minutes || 0,
          cookTimeMinutes: source.cook_time_minutes || 0,
          restTimeMinutes: source.rest_time_minutes || 0,
          difficultyLevel: source.difficulty_level || 1,
          instructions: source.instructions || "",
          notes: source.notes || "",
        },
        { entityName: "RecipeVersion" }
      );

      if (!versionResult.success) {
        throw new Error(
          versionResult.guardFailure?.formatted ||
            versionResult.policyDenial?.policyName ||
            versionResult.error ||
            "Failed to create restored version"
        );
      }

      // Copy ingredients from source version
      const sourceIngredients = await database.$queryRaw<
        {
          id: string;
          ingredient_id: string;
          quantity: bigint;
          unit_id: number;
          preparation_notes: string | null;
          is_optional: boolean;
          sort_order: number;
        }[]
      >`
        SELECT ingredient_id, quantity, unit_id, preparation_notes, is_optional, sort_order
        FROM tenant_kitchen.recipe_ingredients
        WHERE tenant_id = ${tenantId}::uuid
          AND recipe_version_id = ${body.sourceVersionId}::uuid
          AND deleted_at IS NULL
        ORDER BY sort_order
      `;

      for (const ing of sourceIngredients) {
        const ingredientId = crypto.randomUUID();
        await runtime.runCommand(
          "create",
          {
            id: ingredientId,
            recipeVersionId: newVersionId,
            ingredientId: ing.ingredient_id,
            quantity: Number(ing.quantity),
            unitId: ing.unit_id,
            preparationNotes: ing.preparation_notes || "",
            isOptional: ing.is_optional,
            sortOrder: ing.sort_order,
          },
          { entityName: "RecipeIngredient" }
        );
      }

      // Copy steps from source version
      const sourceSteps = await database.$queryRaw<
        {
          step_number: number;
          instruction: string;
          duration_minutes: number | null;
          temperature_value: number | null;
          temperature_unit: string | null;
          equipment_needed: string[] | null;
          tips: string | null;
          video_url: string | null;
          image_url: string | null;
        }[]
      >`
        SELECT step_number, instruction, duration_minutes, temperature_value,
               temperature_unit, equipment_needed, tips, video_url, image_url
        FROM tenant_kitchen.recipe_steps
        WHERE tenant_id = ${tenantId}::uuid
          AND recipe_version_id = ${body.sourceVersionId}::uuid
          AND deleted_at IS NULL
        ORDER BY step_number
      `;

      for (const step of sourceSteps) {
        const stepId = crypto.randomUUID();
        await runtime.runCommand(
          "create",
          {
            id: stepId,
            recipeVersionId: newVersionId,
            stepNumber: step.step_number,
            instruction: step.instruction,
            durationMinutes: step.duration_minutes || 0,
            temperatureValue: step.temperature_value || 0,
            temperatureUnit: step.temperature_unit || "",
            equipmentNeeded: step.equipment_needed?.join(",") || "",
            tips: step.tips || "",
            videoUrl: step.video_url || "",
            imageUrl: step.image_url || "",
          },
          { entityName: "RecipeStep" }
        );
      }

      return {
        version: versionResult.result,
        sourceVersionId: body.sourceVersionId,
        newVersionNumber,
        events: versionResult.emittedEvents || [],
      };
    });

    return manifestSuccessResponse({
      version: result.version,
      sourceVersionId: result.sourceVersionId,
      newVersionNumber: result.newVersionNumber,
      events: result.events,
    });
  } catch (error) {
    console.error("[composite/restore-version] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to restore version";
    return manifestErrorResponse(message, 500);
  }
}
