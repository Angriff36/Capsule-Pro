import { randomUUID } from "node:crypto";
import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { createRecipeRuntime } from "@repo/manifest-adapters";
import { NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  createDishCreatedOutboxEvent,
  createDishInDatabase,
  createRuntimeContext,
  fetchRecipeById,
  getCurrentUser,
  normalizeDishTags,
  validateDishCreateRequest,
} from "./helpers";

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

  const createRequest = validateDishCreateRequest(body);
  if (!createRequest) {
    return NextResponse.json(
      {
        message: "Invalid request data. Both name and recipeId are required.",
      },
      { status: 400 }
    );
  }

  const authUser = await auth();
  const currentUser = await getCurrentUser(tenantId, authUser.userId ?? "");

  if (!currentUser) {
    return NextResponse.json(
      { message: "User not found in database" },
      { status: 400 }
    );
  }

  const recipe = await fetchRecipeById(tenantId, createRequest.recipeId);
  if (!recipe) {
    return NextResponse.json({ message: "Recipe not found" }, { status: 404 });
  }

  try {
    const runtimeContext = await createRuntimeContext(
      tenantId,
      currentUser.id,
      currentUser.role
    );
    const runtime = await createRecipeRuntime(runtimeContext);

    const dishId = randomUUID();
    const { dietaryTags, allergens } = normalizeDishTags(createRequest);

    const description = createRequest.description?.trim() ?? "";
    const category = createRequest.category?.trim() ?? "";
    const serviceStyle = createRequest.serviceStyle?.trim() ?? "";
    const pricePerPerson = createRequest.pricePerPerson ?? 0;
    const costPerPerson = createRequest.costPerPerson ?? 0;
    const minPrepLeadDays = createRequest.minPrepLeadDays ?? 0;
    const maxPrepLeadDays = createRequest.maxPrepLeadDays ?? 7;
    const portionSizeDescription =
      createRequest.portionSizeDescription?.trim() ?? "";

    await runtime.createInstance("Dish", {
      id: dishId,
      tenantId,
      name: createRequest.name,
      recipeId: createRequest.recipeId,
      description,
      category,
      serviceStyle,
      presentationImageUrl: createRequest.presentationImageUrl ?? "",
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

    const dish = await createDishInDatabase(tenantId, dishId, createRequest);

    await createDishCreatedOutboxEvent(
      tenantId,
      dishId,
      createRequest.recipeId,
      createRequest.name,
      pricePerPerson,
      costPerPerson
    );

    // Type assertion for the created dish
    const createdDish = dish as {
      id: string;
      recipeId: string;
      name: string;
      description: string | null;
      category: string | null;
      serviceStyle: string | null;
      presentationImageUrl: string | null;
      dietaryTags: string[];
      allergens: string[];
      pricePerPerson: Prisma.Decimal;
      costPerPerson: Prisma.Decimal;
      minPrepLeadDays: number;
      maxPrepLeadDays: number;
      portionSizeDescription: string | null;
      isActive: boolean;
    };

    return NextResponse.json(
      {
        dishId: createdDish.id,
        recipeId: createdDish.recipeId,
        name: createdDish.name,
        description: createdDish.description,
        category: createdDish.category,
        serviceStyle: createdDish.serviceStyle,
        presentationImageUrl: createdDish.presentationImageUrl,
        dietaryTags: createdDish.dietaryTags,
        allergens: createdDish.allergens,
        pricePerPerson: Number(createdDish.pricePerPerson),
        costPerPerson: Number(createdDish.costPerPerson),
        minPrepLeadDays: createdDish.minPrepLeadDays,
        maxPrepLeadDays: createdDish.maxPrepLeadDays,
        portionSizeDescription: createdDish.portionSizeDescription,
        isActive: createdDish.isActive,
      },
      { status: 201 }
    );
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      {
        message: "Failed to create dish",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

