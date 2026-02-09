import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  createRecipeRuntime,
  deactivateRecipe,
  type KitchenOpsContext,
} from "@repo/kitchen-ops";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ recipeId: string }>;
}

/**
 * Deactivate a recipe using Manifest runtime
 *
 * POST /api/kitchen/manifest/recipes/:recipeId/deactivate
 *
 * This endpoint uses the Manifest runtime for:
 * - Guard checking (recipe must be active)
 * - Event emission (RecipeDeactivated)
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
  const reason = body.reason ?? "No reason provided";

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

  // Check if already inactive
  if (!recipe.isActive) {
    return NextResponse.json(
      { message: "Recipe is already inactive" },
      { status: 409 }
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

    // Execute the deactivate command via Manifest
    const result = await deactivateRecipe(runtime, recipeId, reason);

    // Check for blocking constraints
    const blockingConstraints = result.constraintOutcomes?.filter(
      (o) => !o.passed && o.severity === "block"
    );

    if (blockingConstraints && blockingConstraints.length > 0) {
      return NextResponse.json(
        {
          message: "Cannot deactivate recipe due to constraint violations",
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
          isActive: instance.isActive as boolean,
        },
      });

      // Create outbox event for downstream consumers
      await database.outboxEvent.create({
        data: {
          tenantId,
          aggregateType: "Recipe",
          aggregateId: recipeId,
          eventType: "kitchen.recipe.deactivated",
          payload: {
            recipeId,
            name: instance.name as string,
            isActive: instance.isActive as boolean,
            reason,
            constraintOutcomes: result.constraintOutcomes,
          } as Prisma.InputJsonValue,
          status: "pending" as const,
        },
      });

      return NextResponse.json(
        {
          recipeId,
          name: instance.name,
          isActive: instance.isActive,
          reason,
          constraintOutcomes: result.constraintOutcomes,
          emittedEvents: result.emittedEvents,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Failed to deactivate recipe" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error deactivating recipe via Manifest:", error);
    return NextResponse.json(
      {
        message: "Failed to deactivate recipe",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
