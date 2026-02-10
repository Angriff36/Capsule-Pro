import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  createRecipeRuntime,
  type KitchenOpsContext,
  updateRecipe,
} from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ recipeId: string }>;
}

/**
 * Update recipe metadata using Manifest runtime
 *
 * PATCH /api/kitchen/manifest/recipes/:recipeId/metadata
 *
 * This endpoint uses the Manifest runtime for:
 * - Constraint checking (valid name, tag count)
 * - Event emission (RecipeUpdated)
 * - Audit logging
 */
export async function PATCH(request: Request, context: RouteContext) {
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

  // Create the Manifest runtime context
  const { createPrismaStoreProvider } = await import(
    "@repo/manifest-adapters/prisma-store"
  );

  const runtimeContext: KitchenOpsContext = {
    tenantId,
    userId: currentUser.id,
    userRole: currentUser.role,
    storeProvider: createPrismaStoreProvider(database, tenantId),
  };

  try {
    // Create the runtime with Prisma backing
    const runtime = await createRecipeRuntime(runtimeContext);

    // Load the recipe entity into Manifest
    await runtime.createInstance("Recipe", {
      id: recipe.id,
      tenantId: recipe.tenantId,
      name: recipe.name,
      category: recipe.category ?? "",
      cuisineType: recipe.cuisineType ?? "",
      description: recipe.description ?? "",
      tags: Array.isArray(recipe.tags) ? recipe.tags.join(",") : "",
      isActive: recipe.isActive,
      hasVersion: true,
      tagCount: Array.isArray(recipe.tags) ? recipe.tags.length : 0,
      createdAt: recipe.createdAt.getTime(),
      updatedAt: recipe.updatedAt.getTime(),
    });

    // Prepare update parameters
    const newName = body.name ?? recipe.name;
    const newCategory = body.category ?? recipe.category ?? "";
    const newCuisineType = body.cuisineType ?? recipe.cuisineType ?? "";
    const newDescription = body.description ?? recipe.description ?? "";
    const newTags = Array.isArray(body.tags)
      ? body.tags.join(",")
      : recipe.tags.join(",");

    // Execute the update command via Manifest
    const result = await updateRecipe(
      runtime,
      recipeId,
      newName,
      newCategory,
      newCuisineType,
      newDescription,
      newTags
    );

    // Check for blocking constraints
    const blockingConstraints = result.constraintOutcomes?.filter(
      (o) => !o.passed && o.severity === "block"
    );

    if (blockingConstraints && blockingConstraints.length > 0) {
      return NextResponse.json(
        {
          message: "Cannot update recipe due to constraint violations",
          constraintOutcomes: blockingConstraints,
        },
        { status: 400 }
      );
    }

    // Sync the updated state back to Prisma
    const instance = await runtime.getInstance("Recipe", recipeId);
    if (instance) {
      await database.recipe.update({
        where: { tenantId_id: { tenantId, id: recipeId } },
        data: {
          name: instance.name as string,
          category: (instance.category as string) || null,
          cuisineType: (instance.cuisineType as string) || null,
          description: (instance.description as string) || null,
          tags: (instance.tags as string).split(",").filter(Boolean),
          isActive: instance.isActive as boolean,
        },
      });

      // Create outbox event for downstream consumers
      await database.outboxEvent.create({
        data: {
          tenantId,
          aggregateType: "Recipe",
          aggregateId: recipeId,
          eventType: "kitchen.recipe.updated",
          payload: {
            recipeId,
            name: instance.name as string,
            category: instance.category as string | null,
            cuisineType: instance.cuisineType as string | null,
            tags: (instance.tags as string).split(",").filter(Boolean),
            constraintOutcomes: result.constraintOutcomes,
          } as Prisma.InputJsonValue,
          status: "pending" as const,
        },
      });

      return NextResponse.json(
        {
          recipeId,
          name: instance.name,
          category: instance.category,
          cuisineType: instance.cuisineType,
          description: instance.description,
          tags: (instance.tags as string).split(",").filter(Boolean),
          constraintOutcomes: result.constraintOutcomes,
          emittedEvents: result.emittedEvents,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Failed to update recipe" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error updating recipe via Manifest:", error);
    return NextResponse.json(
      {
        message: "Failed to update recipe",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
