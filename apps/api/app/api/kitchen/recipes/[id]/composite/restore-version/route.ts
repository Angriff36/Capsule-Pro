import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-runtime/route-helpers";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

interface RestoreVersionRequest {
  sourceVersionId: string;
}

export async function POST(
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

    const { id: recipeId } = await params;
    const body: RestoreVersionRequest = await request.json();

    if (!body.sourceVersionId) {
      return manifestErrorResponse("sourceVersionId is required", 400);
    }

    // Get the source version using Prisma (replaces raw SQL)
    const sourceVersion = await database.recipeVersion.findFirst({
      where: {
        tenantId,
        id: body.sourceVersionId,
        recipeId,
        deletedAt: null,
      },
    });

    if (!sourceVersion) {
      return manifestErrorResponse("Source version not found", 404);
    }

    // Get max version number for new version
    const maxVersionResult = await database.recipeVersion.aggregate({
      where: {
        tenantId,
        recipeId,
        deletedAt: null,
      },
      _max: {
        versionNumber: true,
      },
    });

    const newVersionNumber = (maxVersionResult._max.versionNumber ?? 0) + 1;
    const newVersionId = crypto.randomUUID();

    // Execute restore in a transaction
    const result = await database.$transaction(async (tx) => {
      // Create manifest runtime with transaction client
      const runtime = await createManifestRuntime({
        user: { id: userId, tenantId },
        prismaOverride: tx,
      });

      // Create new version with source data
      const versionResult = await runtime.runCommand(
        "create",
        {
          id: newVersionId,
          recipeId,
          name: sourceVersion.name,
          category: sourceVersion.category || "",
          cuisineType: sourceVersion.cuisineType || "",
          description: sourceVersion.description || "",
          tags: sourceVersion.tags || [],
          versionNumber: newVersionNumber,
          yieldQuantity: Number(sourceVersion.yieldQuantity),
          yieldUnitId: sourceVersion.yieldUnitId,
          yieldDescription: sourceVersion.yieldDescription || "",
          prepTimeMinutes: sourceVersion.prepTimeMinutes || 0,
          cookTimeMinutes: sourceVersion.cookTimeMinutes || 0,
          restTimeMinutes: sourceVersion.restTimeMinutes || 0,
          difficultyLevel: sourceVersion.difficultyLevel || 1,
          instructions: sourceVersion.instructions || "",
          notes: sourceVersion.notes || "",
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

      // Copy ingredients from source version using Prisma (replaces raw SQL)
      const sourceIngredients = await database.recipeIngredient.findMany({
        where: {
          tenantId,
          recipeVersionId: body.sourceVersionId,
          deletedAt: null,
        },
        orderBy: { sortOrder: "asc" },
      });

      for (const ing of sourceIngredients) {
        const ingredientId = crypto.randomUUID();
        await runtime.runCommand(
          "create",
          {
            id: ingredientId,
            recipeVersionId: newVersionId,
            ingredientId: ing.ingredientId,
            quantity: Number(ing.quantity),
            unitId: ing.unitId,
            preparationNotes: ing.preparationNotes || "",
            isOptional: ing.isOptional,
            sortOrder: ing.sortOrder,
          },
          { entityName: "RecipeIngredient" }
        );
      }

      // Copy steps from source version using Prisma (replaces raw SQL)
      const sourceSteps = await database.recipeStep.findMany({
        where: {
          tenantId,
          recipeVersionId: body.sourceVersionId,
          deletedAt: null,
        },
        orderBy: { stepNumber: "asc" },
      });

      for (const step of sourceSteps) {
        const stepId = crypto.randomUUID();
        await runtime.runCommand(
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
    log.error("[composite/restore-version] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to restore version";
    return manifestErrorResponse(message, 500);
  }
}
