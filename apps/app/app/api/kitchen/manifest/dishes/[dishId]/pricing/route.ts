import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import {
  createRecipeRuntime,
  type KitchenOpsContext,
  updateDishPricing,
} from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ dishId: string }>;
}

/**
 * Update dish pricing using Manifest runtime
 *
 * PATCH /api/kitchen/manifest/dishes/:dishId/pricing
 *
 * This endpoint uses the Manifest runtime for:
 * - Constraint checking (valid price/cost, margin warnings)
 * - Event emission (DishPricingUpdated)
 * - Audit logging
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { dishId } = await context.params;
  const body = await request.json();

  // Validate request body
  const pricePerPerson = body.pricePerPerson;
  const costPerPerson = body.costPerPerson;

  if (pricePerPerson === null || pricePerPerson === undefined) {
    return NextResponse.json(
      { message: "pricePerPerson is required" },
      { status: 400 }
    );
  }

  if (costPerPerson === null || costPerPerson === undefined) {
    return NextResponse.json(
      { message: "costPerPerson is required" },
      { status: 400 }
    );
  }

  if (pricePerPerson < 0 || costPerPerson < 0) {
    return NextResponse.json(
      { message: "Price and cost must be non-negative" },
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

  // Check if dish exists
  const dish = await database.dish.findFirst({
    where: {
      AND: [{ tenantId }, { id: dishId }, { deletedAt: null }],
    },
  });

  if (!dish) {
    return NextResponse.json({ message: "Dish not found" }, { status: 404 });
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

    // Load the dish entity into Manifest
    await runtime.createInstance("Dish", {
      id: dish.id,
      tenantId: dish.tenantId,
      name: dish.name,
      recipeId: dish.recipeId ?? "",
      description: dish.description ?? "",
      category: dish.category ?? "",
      serviceStyle: dish.serviceStyle ?? "",
      presentationImageUrl: dish.presentationImageUrl ?? "",
      dietaryTags: Array.isArray(dish.dietaryTags)
        ? dish.dietaryTags.join(",")
        : "",
      allergens: Array.isArray(dish.allergens) ? dish.allergens.join(",") : "",
      pricePerPerson: Number(dish.pricePerPerson ?? 0),
      costPerPerson: Number(dish.costPerPerson ?? 0),
      minPrepLeadDays: dish.minPrepLeadDays,
      maxPrepLeadDays: dish.maxPrepLeadDays ?? dish.minPrepLeadDays,
      portionSizeDescription: dish.portionSizeDescription ?? "",
      isActive: dish.isActive,
      createdAt: dish.createdAt.getTime(),
      updatedAt: dish.updatedAt.getTime(),
    });

    // Execute the updatePricing command via Manifest
    const result = await updateDishPricing(
      runtime,
      dishId,
      pricePerPerson,
      costPerPerson
    );

    // Check for blocking constraints
    const blockingConstraints = result.constraintOutcomes?.filter(
      (o) => !o.passed && o.severity === "block"
    );

    if (blockingConstraints && blockingConstraints.length > 0) {
      return NextResponse.json(
        {
          message: "Cannot update dish pricing due to constraint violations",
          constraintOutcomes: blockingConstraints,
        },
        { status: 400 }
      );
    }

    // Sync the updated state back to Prisma
    const instance = await runtime.getInstance("Dish", dishId);
    if (instance) {
      await database.dish.update({
        where: { tenantId_id: { tenantId, id: dishId } },
        data: {
          pricePerPerson: instance.pricePerPerson as number,
          costPerPerson: instance.costPerPerson as number,
        },
      });

      // Create outbox event for downstream consumers
      await database.outboxEvent.create({
        data: {
          tenantId,
          aggregateType: "Dish",
          aggregateId: dishId,
          eventType: "kitchen.dish.pricing.updated",
          payload: {
            dishId,
            name: instance.name as string,
            pricePerPerson: instance.pricePerPerson as number,
            costPerPerson: instance.costPerPerson as number,
            constraintOutcomes: result.constraintOutcomes,
          } as Prisma.InputJsonValue,
          status: "pending" as const,
        },
      });

      return NextResponse.json(
        {
          dishId,
          name: instance.name,
          pricePerPerson: instance.pricePerPerson,
          costPerPerson: instance.costPerPerson,
          constraintOutcomes: result.constraintOutcomes,
          emittedEvents: result.emittedEvents,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: "Failed to update dish pricing" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error updating dish pricing via Manifest:", error);
    return NextResponse.json(
      {
        message: "Failed to update dish pricing",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
