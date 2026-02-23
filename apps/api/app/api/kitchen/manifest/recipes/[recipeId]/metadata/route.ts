import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  createRecipeRuntime,
  type KitchenOpsContext,
  updateRecipe,
} from "@repo/manifest-adapters";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ recipeId: string }>;
}

interface UpdateMetadataBody {
  name?: string;
  category?: string;
  cuisineType?: string;
  description?: string;
  tags?: string[];
}

/**
 * Fetch the current user for the given tenant
 */
async function getCurrentUser(tenantId: string, authUserId: string) {
  return await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId }],
    },
  });
}

/**
 * Fetch a recipe by ID and tenant, excluding deleted recipes
 */
async function fetchRecipe(tenantId: string, recipeId: string) {
  return await database.recipe.findFirst({
    where: {
      AND: [{ tenantId }, { id: recipeId }, { deletedAt: null }],
    },
  });
}

/**
 * Load a recipe into the Manifest runtime
 */
async function loadRecipeIntoRuntime(
  runtime: Awaited<ReturnType<typeof createRecipeRuntime>>,
  recipe: NonNullable<Awaited<ReturnType<typeof fetchRecipe>>>
) {
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
}

/**
 * Extract and validate metadata from request body with fallbacks to existing recipe data
 */
function extractMetadata(
  body: UpdateMetadataBody,
  recipe: NonNullable<Awaited<ReturnType<typeof fetchRecipe>>>
) {
  return {
    name: body.name ?? recipe.name,
    category: body.category ?? recipe.category ?? "",
    cuisineType: body.cuisineType ?? recipe.cuisineType ?? "",
    description: body.description ?? recipe.description ?? "",
    tags: Array.isArray(body.tags)
      ? body.tags.join(",")
      : recipe.tags.join(","),
  };
}

/**
 * Check for blocking constraint violations
 */
function checkBlockingConstraints(
  constraintOutcomes: Awaited<
    ReturnType<typeof updateRecipe>
  >["constraintOutcomes"]
) {
  const blockingConstraints = constraintOutcomes?.filter(
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

  return null;
}

/**
 * Sync updated recipe state to Prisma database + outbox atomically
 */
async function syncRecipeToDatabaseWithOutbox(
  tenantId: string,
  recipeId: string,
  instance: Record<string, unknown>,
  constraintOutcomes: Awaited<
    ReturnType<typeof updateRecipe>
  >["constraintOutcomes"]
) {
  await database.$transaction(async (tx) => {
    await tx.recipe.update({
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

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "Recipe",
        aggregateId: recipeId,
        eventType: "kitchen.recipe.updated",
        payload: {
          recipeId,
          name: instance.name,
          category: (instance.category as string) || null,
          cuisineType: (instance.cuisineType as string) || null,
          tags: (instance.tags as string).split(",").filter(Boolean),
          constraintOutcomes,
        } as Prisma.InputJsonValue,
        status: "pending" as const,
      },
    });
  });
}

/**
 * Build successful response with updated recipe data
 */
function buildSuccessResponse(
  recipeId: string,
  instance: Record<string, unknown>,
  constraintOutcomes: Awaited<
    ReturnType<typeof updateRecipe>
  >["constraintOutcomes"],
  emittedEvents: Awaited<ReturnType<typeof updateRecipe>>["emittedEvents"]
) {
  return NextResponse.json(
    {
      recipeId,
      name: instance.name,
      category: instance.category,
      cuisineType: instance.cuisineType,
      description: instance.description,
      tags: (instance.tags as string).split(",").filter(Boolean),
      constraintOutcomes,
      emittedEvents,
    },
    { status: 200 }
  );
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
  // Authentication and tenant resolution
  const { orgId, userId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { recipeId } = await context.params;
  const body = (await request.json()) as UpdateMetadataBody;

  // Fetch and validate user
  const currentUser = await getCurrentUser(tenantId, userId ?? "");
  if (!currentUser) {
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  // Fetch and validate recipe
  const recipe = await fetchRecipe(tenantId, recipeId);
  if (!recipe) {
    return NextResponse.json({ message: "Recipe not found" }, { status: 404 });
  }

  // Create Manifest runtime context
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
    // Initialize runtime and load recipe
    const runtime = await createRecipeRuntime(runtimeContext);
    await loadRecipeIntoRuntime(runtime, recipe);

    // Extract metadata and execute update
    const metadata = extractMetadata(body, recipe);
    const result = await updateRecipe(
      runtime,
      recipeId,
      metadata.name,
      metadata.category,
      metadata.cuisineType,
      metadata.description,
      metadata.tags
    );

    // Check for blocking constraints
    const constraintError = checkBlockingConstraints(result.constraintOutcomes);
    if (constraintError) {
      return constraintError;
    }

    // Sync updated state to database + outbox atomically
    const instance = await runtime.getInstance("Recipe", recipeId);
    if (instance) {
      await syncRecipeToDatabaseWithOutbox(
        tenantId,
        recipeId,
        instance,
        result.constraintOutcomes
      );

      return buildSuccessResponse(
        recipeId,
        instance,
        result.constraintOutcomes,
        result.emittedEvents
      );
    }

    return NextResponse.json(
      { message: "Failed to update recipe" },
      { status: 500 }
    );
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      {
        message: "Failed to update recipe",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
