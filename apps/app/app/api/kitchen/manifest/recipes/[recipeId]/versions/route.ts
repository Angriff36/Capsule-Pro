import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  createRecipeRuntime,
  createRecipeVersion,
  type KitchenOpsContext,
} from "@repo/kitchen-ops";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ recipeId: string }>;
}

/**
 * Create a new recipe version using Manifest runtime
 *
 * POST /api/kitchen/manifest/recipes/:recipeId/versions
 *
 * This endpoint creates a new version of an existing recipe using the Manifest runtime for:
 * - Constraint checking (positive yield, valid difficulty, valid times)
 * - Warning constraints (long recipe time, high difficulty)
 * - Event emission (RecipeVersionCreated)
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

    // Create the RecipeVersion entity
    const recipeVersionId = randomUUID();
    const yieldQuantity = body.yieldQuantity ?? 1;
    const yieldUnitId = body.yieldUnitId ?? 1;
    const prepTimeMinutes = body.prepTimeMinutes ?? 0;
    const cookTimeMinutes = body.cookTimeMinutes ?? 0;
    const restTimeMinutes = body.restTimeMinutes ?? 0;
    const difficultyLevel = body.difficultyLevel ?? 1;
    const instructions = body.instructions?.trim() ?? "";
    const notes = body.notes?.trim() ?? "";
    const ingredientCount = body.ingredientCount ?? 0;
    const stepCount = body.stepCount ?? 0;

    await runtime.createInstance("RecipeVersion", {
      id: recipeVersionId,
      recipeId,
      tenantId,
      name: body.name ?? recipe.name,
      versionNumber: nextVersionNumber,
      category: body.category ?? recipe.category ?? "",
      cuisineType: body.cuisineType ?? recipe.cuisineType ?? "",
      description: body.description ?? recipe.description ?? "",
      tags: Array.isArray(body.tags)
        ? body.tags.join(",")
        : Array.isArray(recipe.tags)
          ? recipe.tags.join(",")
          : "",
      yieldQuantity,
      yieldUnitId,
      yieldDescription: body.yieldDescription ?? "",
      prepTimeMinutes,
      cookTimeMinutes,
      restTimeMinutes,
      difficultyLevel,
      instructions,
      notes,
      ingredientCount,
      stepCount,
      createdAt: Date.now(),
    });

    // Execute the create command via Manifest to trigger constraint checking
    const result = await createRecipeVersion(
      runtime,
      recipeVersionId,
      yieldQuantity,
      yieldUnitId,
      prepTimeMinutes,
      cookTimeMinutes,
      restTimeMinutes,
      difficultyLevel,
      instructions,
      notes
    );

    // Check for blocking constraints
    const blockingConstraints = result.constraintOutcomes?.filter(
      (o) => !o.passed && o.severity === "block"
    );

    if (blockingConstraints && blockingConstraints.length > 0) {
      return NextResponse.json(
        {
          message: "Cannot create recipe version due to constraint violations",
          constraintOutcomes: blockingConstraints,
        },
        { status: 400 }
      );
    }

    // Sync to Prisma - create the version record
    await database.recipeVersion.create({
      data: {
        tenantId,
        id: recipeVersionId,
        recipeId,
        name: body.name ?? recipe.name,
        versionNumber: nextVersionNumber,
        category: body.category ?? recipe.category,
        cuisineType: body.cuisineType ?? recipe.cuisineType,
        description: body.description ?? recipe.description,
        tags: Array.isArray(body.tags)
          ? body.tags
          : Array.isArray(recipe.tags)
            ? recipe.tags
            : [],
        yieldQuantity,
        yieldUnitId,
        yieldDescription: body.yieldDescription,
        prepTimeMinutes,
        cookTimeMinutes,
        restTimeMinutes,
        difficultyLevel,
        instructions: instructions || null,
        notes: notes || null,
      },
    });

    // Create outbox event for downstream consumers
    await database.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "RecipeVersion",
        aggregateId: recipeVersionId,
        eventType: "kitchen.recipe.version.created",
        payload: {
          versionId: recipeVersionId,
          recipeId,
          versionNumber: nextVersionNumber,
          yieldQuantity: Number(yieldQuantity),
          constraintOutcomes: result.constraintOutcomes,
        } as Prisma.InputJsonValue,
        status: "pending" as const,
      },
    });

    return NextResponse.json(
      {
        versionId: recipeVersionId,
        recipeId,
        versionNumber: nextVersionNumber,
        name: body.name ?? recipe.name,
        yieldQuantity,
        yieldUnitId,
        constraintOutcomes: result.constraintOutcomes,
        emittedEvents: result.emittedEvents,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating recipe version via Manifest:", error);
    return NextResponse.json(
      {
        message: "Failed to create recipe version",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
