import { randomUUID } from "node:crypto";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import {
  buildRestoreResponse,
  copyIngredientsFromVersion,
  copyStepsFromVersion,
  createRuntimeContext,
  createVersionViaManifest,
  fetchAndValidateRecipe,
  fetchSourceVersion,
  formatTagsForStorage,
  getAuthContext,
  getNextVersionNumber,
  updateRecipeMetadata,
} from "@/app/lib/recipe-version-helpers";

interface RouteContext {
  params: Promise<{ recipeId: string }>;
}

interface RestoreRequestBody {
  sourceVersionId: string;
}

/**
 * Restore a previous recipe version using Manifest runtime
 *
 * POST /api/kitchen/manifest/recipes/:recipeId/restore
 *
 * This endpoint restores a previous recipe version by copying its data
 * into a new version using the Manifest runtime for:
 * - Constraint checking on the restored version
 * - Event emission (RecipeVersionRestored)
 * - Audit logging
 */
export async function POST(request: Request, context: RouteContext) {
  // Validate authentication and get context
  const authResult = await getAuthContext();
  if (!authResult.success) {
    return authResult.response;
  }

  const { tenantId } = authResult.context;
  const { recipeId } = await context.params;
  const body = (await request.json()) as RestoreRequestBody;

  if (!body.sourceVersionId) {
    return NextResponse.json(
      { message: "sourceVersionId is required" },
      { status: 400 }
    );
  }

  // Validate recipe exists
  const recipeResult = await fetchAndValidateRecipe(tenantId, recipeId);
  if (!recipeResult.success) {
    return recipeResult.response;
  }

  // Get the source version
  const sourceResult = await fetchSourceVersion(
    tenantId,
    recipeId,
    body.sourceVersionId
  );
  if (!sourceResult.success) {
    return sourceResult.response;
  }

  const sourceVersion = sourceResult.version;
  const nextVersionNumber = await getNextVersionNumber(tenantId, recipeId);
  const runtimeContext = await createRuntimeContext(authResult.context);
  const newVersionId = randomUUID();

  // Create the new RecipeVersion entity with restored data via Manifest
  const manifestResult = await createVersionViaManifest(runtimeContext, {
    id: newVersionId,
    recipeId,
    name: sourceVersion.name,
    versionNumber: nextVersionNumber,
    category: sourceVersion.category ?? "",
    cuisineType: sourceVersion.cuisine_type ?? "",
    description: sourceVersion.description ?? "",
    tags: formatTagsForStorage(sourceVersion.tags ?? undefined),
    yieldQuantity: sourceVersion.yield_quantity,
    yieldUnitId: sourceVersion.yield_unit_id,
    yieldDescription: sourceVersion.yield_description ?? "",
    prepTimeMinutes: sourceVersion.prep_time_minutes ?? 0,
    cookTimeMinutes: sourceVersion.cook_time_minutes ?? 0,
    restTimeMinutes: sourceVersion.rest_time_minutes ?? 0,
    difficultyLevel: sourceVersion.difficulty_level ?? 1,
    instructions: sourceVersion.instructions ?? "",
    notes: sourceVersion.notes ?? "",
    ingredientCount: 0,
    stepCount: 0,
  });

  if (!manifestResult.success) {
    return manifestResult.response;
  }

  // Update recipe metadata to match the restored version
  await updateRecipeMetadata(tenantId, recipeId, {
    name: sourceVersion.name,
    category: sourceVersion.category,
    cuisineType: sourceVersion.cuisine_type,
    description: sourceVersion.description,
    tags: sourceVersion.tags ?? [],
  });

  // Create the new version record + outbox event atomically, then copy data
  await database.$transaction(async (tx) => {
    await tx.recipeVersion.create({
      data: {
        tenantId,
        id: newVersionId,
        recipeId,
        name: sourceVersion.name,
        versionNumber: nextVersionNumber,
        category: sourceVersion.category,
        cuisineType: sourceVersion.cuisine_type,
        description: sourceVersion.description,
        tags: sourceVersion.tags ?? [],
        yieldQuantity: sourceVersion.yield_quantity,
        yieldUnitId: sourceVersion.yield_unit_id,
        yieldDescription: sourceVersion.yield_description,
        prepTimeMinutes: sourceVersion.prep_time_minutes,
        cookTimeMinutes: sourceVersion.cook_time_minutes,
        restTimeMinutes: sourceVersion.rest_time_minutes,
        difficultyLevel: sourceVersion.difficulty_level,
        instructions: sourceVersion.instructions,
        notes: sourceVersion.notes,
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "RecipeVersion",
        aggregateId: newVersionId,
        eventType: "kitchen.recipe.version.restored",
        payload: {
          newVersionId,
          sourceVersionId: body.sourceVersionId,
          recipeId,
          versionNumber: nextVersionNumber,
        } as Prisma.InputJsonValue,
        status: "pending" as const,
      },
    });
  });

  // Copy ingredients and steps from source version (after commit)
  await copyIngredientsFromVersion(
    tenantId,
    body.sourceVersionId,
    newVersionId
  );
  await copyStepsFromVersion(tenantId, body.sourceVersionId, newVersionId);

  return buildRestoreResponse({
    versionId: newVersionId,
    recipeId,
    sourceVersionId: body.sourceVersionId,
    versionNumber: nextVersionNumber,
    name: sourceVersion.name,
  });
}
