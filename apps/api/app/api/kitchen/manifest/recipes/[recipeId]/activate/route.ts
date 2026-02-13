import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  activateRecipe,
  createRecipeRuntime,
  type KitchenOpsContext,
} from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ recipeId: string }>;
}

/**
 * Activate a recipe using Manifest runtime
 *
 * POST /api/kitchen/manifest/recipes/:recipeId/activate
 *
 * This endpoint uses the Manifest runtime for:
 * - Guard checking (recipe must be inactive)
 * - Event emission (RecipeActivated)
 * - Audit logging
 */
export async function POST(_request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { recipeId } = await context.params;

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

  // Check if already active
  if (recipe.isActive) {
    return NextResponse.json(
      { message: "Recipe is already active" },
      { status: 409 }
    );
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

    // Execute the activate command via Manifest
    const result = await activateRecipe(runtime, recipeId);

    // Check for blocking constraints
    const blockingConstraints = result.constraintOutcomes?.filter(
      (o) => !o.passed && o.severity === "block"
    );

    if (blockingConstraints && blockingConstraints.length > 0) {
      return NextResponse.json(
        {
          message: "Cannot activate recipe due to constraint violations",
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
          eventType: "kitchen.recipe.activated",
          payload: {
            recipeId,
            name: instance.name as string,
            isActive: instance.isActive as boolean,
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
          constraintOutcomes: result.constraintOutcomes,
          emittedEvents: result.emittedEvents,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Failed to activate recipe" },
      { status: 500 }
    );
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      {
        message: "Failed to activate recipe",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
