import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createRecipeRuntime, type KitchenOpsContext } from "@repo/kitchen-ops";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ recipeId: string }>;
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
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { recipeId } = await context.params;
  const body = await request.json();
  const sourceVersionId = body.sourceVersionId;

  if (!sourceVersionId) {
    return NextResponse.json(
      { message: "sourceVersionId is required" },
      { status: 400 }
    );
  }

  // Get current user
  const currentUser = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId: (await auth()).userId ?? "" }],
    },
  });

  if (!currentUser) {
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  // Check if recipe exists
  const recipe = await database.recipe.findFirst({
    where: {
      AND: [{ tenantId }, { id: recipeId }, { deletedAt: null }],
    },
  });

  if (!recipe) {
    return NextResponse.json({ message: "Recipe not found" }, { status: 404 });
  }

  // Get the source version
  const [sourceVersion] = await database.$queryRaw<
    {
      id: string;
      name: string;
      category: string | null;
      cuisine_type: string | null;
      description: string | null;
      tags: string[] | null;
      yield_quantity: number;
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
    SELECT
      id,
      name,
      category,
      cuisine_type,
      description,
      tags,
      yield_quantity,
      yield_unit_id,
      yield_description,
      prep_time_minutes,
      cook_time_minutes,
      rest_time_minutes,
      difficulty_level,
      instructions,
      notes
    FROM tenant_kitchen.recipe_versions
    WHERE tenant_id = ${tenantId}
      AND recipe_id = ${recipeId}
      AND id = ${sourceVersionId}
      AND deleted_at IS NULL
    LIMIT 1
  `;

  if (!sourceVersion) {
    return NextResponse.json(
      { message: "Source version not found" },
      { status: 404 }
    );
  }

  // Get the next version number
  const [maxVersionRow] = await database.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(version_number)::int AS max
    FROM tenant_kitchen.recipe_versions
    WHERE tenant_id = ${tenantId}
      AND recipe_id = ${recipeId}
  `;
  const nextVersionNumber = (maxVersionRow?.max ?? 0) + 1;

  // Create the Manifest runtime context
  const { createPrismaStoreProvider } = await import(
    "@repo/kitchen-ops/prisma-store"
  );

  const runtimeContext: KitchenOpsContext = {
    tenantId,
    userId: currentUser.id,
    userRole: currentUser.role,
    storeProvider: createPrismaStoreProvider(database, tenantId),
  };

  try {
    const runtime = await createRecipeRuntime(runtimeContext);

    // Create the new RecipeVersion entity with restored data
    const newVersionId = randomUUID();

    await runtime.createInstance("RecipeVersion", {
      id: newVersionId,
      recipeId,
      tenantId,
      name: sourceVersion.name,
      versionNumber: nextVersionNumber,
      category: sourceVersion.category ?? "",
      cuisineType: sourceVersion.cuisine_type ?? "",
      description: sourceVersion.description ?? "",
      tags: Array.isArray(sourceVersion.tags)
        ? sourceVersion.tags.join(",")
        : "",
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
      createdAt: Date.now(),
    });

    // Update recipe metadata to match the restored version
    await database.recipe.update({
      where: { tenantId_id: { tenantId, id: recipeId } },
      data: {
        name: sourceVersion.name,
        category: sourceVersion.category,
        cuisineType: sourceVersion.cuisine_type,
        description: sourceVersion.description,
        tags: sourceVersion.tags ?? [],
      },
    });

    // Create the new version record in Prisma
    await database.recipeVersion.create({
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

    // Copy ingredients from source version
    const ingredients = await database.$queryRaw<
      {
        ingredient_id: string;
        quantity: number;
        unit_id: number;
        preparation_notes: string | null;
        is_optional: boolean;
        sort_order: number;
      }[]
    >`
      SELECT
        ingredient_id,
        quantity,
        unit_id,
        preparation_notes,
        is_optional,
        sort_order
      FROM tenant_kitchen.recipe_ingredients
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${sourceVersionId}
        AND deleted_at IS NULL
      ORDER BY sort_order ASC
    `;

    for (const ingredient of ingredients) {
      await database.recipeIngredient.create({
        data: {
          tenantId,
          id: randomUUID(),
          recipeVersionId: newVersionId,
          ingredientId: ingredient.ingredient_id,
          quantity: ingredient.quantity,
          unitId: ingredient.unit_id,
          preparationNotes: ingredient.preparation_notes,
          isOptional: ingredient.is_optional,
          sortOrder: ingredient.sort_order,
        },
      });
    }

    // Copy steps from source version
    const steps = await database.$queryRaw<
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
      SELECT
        step_number,
        instruction,
        duration_minutes,
        temperature_value,
        temperature_unit,
        equipment_needed,
        tips,
        video_url,
        image_url
      FROM tenant_kitchen.recipe_steps
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${sourceVersionId}
        AND deleted_at IS NULL
      ORDER BY step_number ASC
    `;

    for (const step of steps) {
      await database.recipe_steps.create({
        data: {
          tenant_id: tenantId,
          id: randomUUID(),
          recipe_version_id: newVersionId,
          step_number: step.step_number,
          instruction: step.instruction,
          duration_minutes: step.duration_minutes,
          temperature_value: step.temperature_value,
          temperature_unit: step.temperature_unit,
          equipment_needed: step.equipment_needed ?? [],
          tips: step.tips,
          video_url: step.video_url,
          image_url: step.image_url,
        },
      });
    }

    // Create outbox event for downstream consumers
    await database.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "RecipeVersion",
        aggregateId: newVersionId,
        eventType: "kitchen.recipe.version.restored",
        payload: {
          newVersionId,
          sourceVersionId,
          recipeId,
          versionNumber: nextVersionNumber,
        },
        status: "pending" as const,
      },
    });

    return NextResponse.json(
      {
        versionId: newVersionId,
        recipeId,
        sourceVersionId,
        versionNumber: nextVersionNumber,
        name: sourceVersion.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error restoring recipe version via Manifest:", error);
    return NextResponse.json(
      {
        message: "Failed to restore recipe version",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
