import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createRecipeRuntime, type KitchenOpsContext } from "@repo/kitchen-ops";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Create a new recipe using Manifest runtime
 *
 * POST /api/kitchen/manifest/recipes
 *
 * This endpoint creates a new recipe with its first version using the Manifest runtime for:
 * - Constraint checking (valid name, tag count, yield, difficulty)
 * - Event emission (RecipeCreated, RecipeVersionCreated)
 * - Audit logging
 */
export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const body = await request.json();

  // Validate required fields
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { message: "Recipe name is required" },
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

    // Extract recipe properties
    const category = body.category?.trim() ?? "";
    const cuisineType = body.cuisineType?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const tags = Array.isArray(body.tags) ? body.tags.join(",") : "";
    const tagCount = Array.isArray(body.tags) ? body.tags.length : 0;

    // Create the Recipe entity
    const recipeId = randomUUID();
    await runtime.createInstance("Recipe", {
      id: recipeId,
      tenantId,
      name,
      category,
      cuisineType,
      description,
      tags,
      isActive: true,
      hasVersion: true,
      tagCount,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Extract version properties
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

    // Create the RecipeVersion entity
    const recipeVersionId = randomUUID();
    await runtime.createInstance("RecipeVersion", {
      id: recipeVersionId,
      recipeId,
      tenantId,
      name,
      versionNumber: 1,
      category,
      cuisineType,
      description,
      tags,
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

    // Sync to Prisma
    await database.recipe.create({
      data: {
        tenantId,
        id: recipeId,
        name,
        category: category || null,
        cuisineType: cuisineType || null,
        description: description || null,
        tags: tags.split(",").filter(Boolean),
        isActive: true,
      },
    });

    await database.recipeVersion.create({
      data: {
        tenantId,
        id: recipeVersionId,
        recipeId,
        name,
        versionNumber: 1,
        category: category || null,
        cuisineType: cuisineType || null,
        description: description || null,
        tags: tags.split(",").filter(Boolean),
        yieldQuantity,
        yieldUnitId,
        yieldDescription: body.yieldDescription || null,
        prepTimeMinutes,
        cookTimeMinutes,
        restTimeMinutes,
        difficultyLevel,
        instructions: instructions || null,
        notes: notes || null,
      },
    });

    // Create outbox events for downstream consumers
    await database.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "Recipe",
        aggregateId: recipeId,
        eventType: "kitchen.recipe.created",
        payload: {
          recipeId,
          name,
          category,
          cuisineType,
          tags: tags.split(",").filter(Boolean),
          versionId: recipeVersionId,
          versionNumber: 1,
        },
        status: "pending" as const,
      },
    });

    await database.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "RecipeVersion",
        aggregateId: recipeVersionId,
        eventType: "kitchen.recipe.version.created",
        payload: {
          versionId: recipeVersionId,
          recipeId,
          versionNumber: 1,
          yieldQuantity,
        },
        status: "pending" as const,
      },
    });

    return NextResponse.json(
      {
        recipeId,
        versionId: recipeVersionId,
        name,
        category,
        cuisineType,
        tags: tags.split(",").filter(Boolean),
        isActive: true,
        versionNumber: 1,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating recipe via Manifest:", error);
    return NextResponse.json(
      {
        message: "Failed to create recipe",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
