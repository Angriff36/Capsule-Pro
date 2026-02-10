import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createRecipeRuntime, type KitchenOpsContext } from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Create a new dish using Manifest runtime
 *
 * POST /api/kitchen/manifest/dishes
 *
 * This endpoint creates a new dish using the Manifest runtime for:
 * - Constraint checking (valid name, pricing, lead times)
 * - Warning constraints (tight margin, long lead time)
 * - Event emission (DishCreated)
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
      { message: "Dish name is required" },
      { status: 400 }
    );
  }

  const recipeId = body.recipeId?.trim();
  if (!recipeId) {
    return NextResponse.json(
      { message: "Recipe ID is required" },
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
    const runtime = await createRecipeRuntime(runtimeContext);

    // Extract dish properties
    const description = body.description?.trim() ?? "";
    const category = body.category?.trim() ?? "";
    const serviceStyle = body.serviceStyle?.trim() ?? "";
    const dietaryTags = Array.isArray(body.dietaryTags)
      ? body.dietaryTags.join(",")
      : "";
    const allergens = Array.isArray(body.allergens)
      ? body.allergens.join(",")
      : "";
    const pricePerPerson = body.pricePerPerson ?? 0;
    const costPerPerson = body.costPerPerson ?? 0;
    const minPrepLeadDays = body.minPrepLeadDays ?? 0;
    const maxPrepLeadDays = body.maxPrepLeadDays ?? 7;
    const portionSizeDescription = body.portionSizeDescription?.trim() ?? "";

    // Create the Dish entity
    const dishId = randomUUID();
    await runtime.createInstance("Dish", {
      id: dishId,
      tenantId,
      name,
      recipeId,
      description,
      category,
      serviceStyle,
      presentationImageUrl: body.presentationImageUrl ?? "",
      dietaryTags,
      allergens,
      pricePerPerson,
      costPerPerson,
      minPrepLeadDays,
      maxPrepLeadDays,
      portionSizeDescription,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Sync to Prisma
    const dish = await database.dish.create({
      data: {
        tenantId,
        id: dishId,
        recipeId,
        name,
        description: description || null,
        category: category || null,
        serviceStyle: serviceStyle || null,
        presentationImageUrl: body.presentationImageUrl || null,
        dietaryTags: dietaryTags.split(",").filter(Boolean),
        allergens: allergens.split(",").filter(Boolean),
        pricePerPerson,
        costPerPerson,
        minPrepLeadDays,
        maxPrepLeadDays,
        portionSizeDescription: portionSizeDescription || null,
        isActive: true,
      },
    });

    // Create outbox event for downstream consumers
    await database.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "Dish",
        aggregateId: dishId,
        eventType: "kitchen.dish.created",
        payload: {
          dishId,
          recipeId,
          name,
          pricePerPerson,
          costPerPerson,
        },
        status: "pending" as const,
      },
    });

    return NextResponse.json(
      {
        dishId: dish.id,
        recipeId: dish.recipeId,
        name: dish.name,
        description: dish.description,
        category: dish.category,
        serviceStyle: dish.serviceStyle,
        presentationImageUrl: dish.presentationImageUrl,
        dietaryTags: dish.dietaryTags,
        allergens: dish.allergens,
        pricePerPerson: dish.pricePerPerson,
        costPerPerson: dish.costPerPerson,
        minPrepLeadDays: dish.minPrepLeadDays,
        maxPrepLeadDays: dish.maxPrepLeadDays,
        portionSizeDescription: dish.portionSizeDescription,
        isActive: dish.isActive,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating dish via Manifest:", error);
    return NextResponse.json(
      {
        message: "Failed to create dish",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

