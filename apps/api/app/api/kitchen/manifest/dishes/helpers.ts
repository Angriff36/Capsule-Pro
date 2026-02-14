import type { Prisma } from "@repo/database";
import { database } from "@repo/database";
import type {
  createRecipeRuntime,
  KitchenOpsContext,
} from "@repo/manifest-adapters";

/**
 * Dish pricing update request validation
 */
export interface PricingUpdateRequest {
  pricePerPerson: number;
  costPerPerson: number;
}

/**
 * Dish creation request data
 */
export interface DishCreateRequest {
  name: string;
  recipeId: string;
  description?: string;
  category?: string;
  serviceStyle?: string;
  presentationImageUrl?: string;
  dietaryTags?: string[];
  allergens?: string[];
  pricePerPerson?: number;
  costPerPerson?: number;
  minPrepLeadDays?: number;
  maxPrepLeadDays?: number;
  portionSizeDescription?: string;
}

/**
 * Result type for constraint validation
 */
export interface ConstraintValidationResult {
  passed: boolean;
  blockingConstraints: unknown[];
  constraintOutcomes?: unknown[];
}

/**
 * Validate pricing update request
 */
export function validatePricingUpdate(
  body: unknown
): PricingUpdateRequest | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const { pricePerPerson, costPerPerson } = body as {
    pricePerPerson?: unknown;
    costPerPerson?: unknown;
  };

  if (
    pricePerPerson === null ||
    pricePerPerson === undefined ||
    typeof pricePerPerson !== "number"
  ) {
    return null;
  }

  if (
    costPerPerson === null ||
    costPerPerson === undefined ||
    typeof costPerPerson !== "number"
  ) {
    return null;
  }

  if (pricePerPerson < 0 || costPerPerson < 0) {
    return null;
  }

  return { pricePerPerson, costPerPerson };
}

/**
 * Validate dish creation request
 */
export function validateDishCreateRequest(
  body: unknown
): DishCreateRequest | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const data = body as Record<string, unknown>;

  const name = typeof data.name === "string" ? data.name.trim() : data.name;
  if (!name || typeof name !== "string") {
    return null;
  }

  const recipeId =
    typeof data.recipeId === "string" ? data.recipeId.trim() : data.recipeId;
  if (!recipeId || typeof recipeId !== "string") {
    return null;
  }

  return {
    name,
    recipeId,
    description:
      typeof data.description === "string"
        ? data.description.trim()
        : (data.description as string | undefined),
    category:
      typeof data.category === "string"
        ? data.category.trim()
        : (data.category as string | undefined),
    serviceStyle:
      typeof data.serviceStyle === "string"
        ? data.serviceStyle.trim()
        : (data.serviceStyle as string | undefined),
    presentationImageUrl: data.presentationImageUrl as string | undefined,
    dietaryTags: Array.isArray(data.dietaryTags)
      ? (data.dietaryTags as string[])
      : undefined,
    allergens: Array.isArray(data.allergens)
      ? (data.allergens as string[])
      : undefined,
    pricePerPerson:
      typeof data.pricePerPerson === "number" ? data.pricePerPerson : undefined,
    costPerPerson:
      typeof data.costPerPerson === "number" ? data.costPerPerson : undefined,
    minPrepLeadDays:
      typeof data.minPrepLeadDays === "number"
        ? data.minPrepLeadDays
        : undefined,
    maxPrepLeadDays:
      typeof data.maxPrepLeadDays === "number"
        ? data.maxPrepLeadDays
        : undefined,
    portionSizeDescription:
      typeof data.portionSizeDescription === "string"
        ? data.portionSizeDescription.trim()
        : (data.portionSizeDescription as string | undefined),
  };
}

/**
 * Fetch a dish by ID with tenant and deletion checks
 */
export function fetchDishById(
  tenantId: string,
  dishId: string
): Promise<Awaited<ReturnType<typeof database.dish.findFirst>>> {
  return database.dish.findFirst({
    where: {
      AND: [{ tenantId }, { id: dishId }, { deletedAt: null }],
    },
  });
}

/**
 * Fetch a recipe by ID with tenant and deletion checks
 */
export function fetchRecipeById(
  tenantId: string,
  recipeId: string
): Promise<Awaited<ReturnType<typeof database.recipe.findFirst>>> {
  return database.recipe.findFirst({
    where: {
      AND: [{ tenantId }, { id: recipeId }, { deletedAt: null }],
    },
  });
}

/**
 * Create a Manifest runtime context
 */
export async function createRuntimeContext(
  tenantId: string,
  userId: string,
  userRole: string
): Promise<KitchenOpsContext> {
  const { createPrismaStoreProvider } = await import(
    "@repo/manifest-adapters/prisma-store"
  );

  return {
    tenantId,
    userId,
    userRole,
    storeProvider: createPrismaStoreProvider(database, tenantId),
  };
}

/**
 * Load a dish instance into the Manifest runtime
 */
export async function loadDishInstance(
  runtime: Awaited<ReturnType<typeof createRecipeRuntime>>,
  dish: {
    id: string;
    tenantId: string;
    name: string;
    recipeId: string | null;
    description: string | null;
    category: string | null;
    serviceStyle: string | null;
    presentationImageUrl: string | null;
    dietaryTags: string[];
    allergens: string[];
    pricePerPerson: Prisma.Decimal | null;
    costPerPerson: Prisma.Decimal | null;
    minPrepLeadDays: number;
    maxPrepLeadDays: number | null;
    portionSizeDescription: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
): Promise<void> {
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
}

/**
 * Check constraint results for blocking violations
 */
export function checkBlockingConstraints(
  constraintOutcomes: unknown[] | undefined
): ConstraintValidationResult {
  const blockingConstraints = constraintOutcomes?.filter(
    (o) =>
      typeof o === "object" &&
      o !== null &&
      !("passed" in o && o.passed) &&
      "severity" in o &&
      o.severity === "block"
  );

  return {
    passed: !blockingConstraints || blockingConstraints.length === 0,
    blockingConstraints: blockingConstraints ?? [],
    constraintOutcomes,
  };
}

/**
 * Sync updated dish pricing to database
 */
export async function syncDishPricingToDatabase(
  tenantId: string,
  dishId: string,
  pricePerPerson: number,
  costPerPerson: number
): Promise<void> {
  await database.dish.update({
    where: { tenantId_id: { tenantId, id: dishId } },
    data: {
      pricePerPerson,
      costPerPerson,
    },
  });
}

/**
 * Create a dish in the database
 */
export function createDishInDatabase(
  tenantId: string,
  dishId: string,
  data: DishCreateRequest
): Promise<Awaited<ReturnType<typeof database.dish.create>>> {
  const dietaryTagsString = data.dietaryTags?.join(",") ?? "";
  const allergensString = data.allergens?.join(",") ?? "";

  return database.dish.create({
    data: {
      tenantId,
      id: dishId,
      recipeId: data.recipeId,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      serviceStyle: data.serviceStyle || null,
      presentationImageUrl: data.presentationImageUrl || null,
      dietaryTags: dietaryTagsString.split(",").filter(Boolean),
      allergens: allergensString.split(",").filter(Boolean),
      pricePerPerson: data.pricePerPerson ?? 0,
      costPerPerson: data.costPerPerson ?? 0,
      minPrepLeadDays: data.minPrepLeadDays ?? 0,
      maxPrepLeadDays: data.maxPrepLeadDays ?? 7,
      portionSizeDescription: data.portionSizeDescription || null,
      isActive: true,
    },
  });
}

/**
 * Create an outbox event for dish pricing update
 */
export async function createDishPricingOutboxEvent(
  tenantId: string,
  dishId: string,
  name: string,
  pricePerPerson: number,
  costPerPerson: number,
  constraintOutcomes: unknown[] | undefined,
  emittedEvents: unknown[] | undefined
): Promise<void> {
  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: "Dish",
      aggregateId: dishId,
      eventType: "kitchen.dish.pricing.updated",
      payload: {
        dishId,
        name,
        pricePerPerson,
        costPerPerson,
        constraintOutcomes,
        emittedEvents,
      } as Prisma.InputJsonValue,
      status: "pending" as const,
    },
  });
}

/**
 * Create an outbox event for dish creation
 */
export async function createDishCreatedOutboxEvent(
  tenantId: string,
  dishId: string,
  recipeId: string,
  name: string,
  pricePerPerson: number,
  costPerPerson: number
): Promise<void> {
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
}

/**
 * Convert dietary tags and allergens to comma-separated strings
 */
export function normalizeDishTags(data: DishCreateRequest): {
  dietaryTags: string;
  allergens: string;
} {
  return {
    dietaryTags: Array.isArray(data.dietaryTags)
      ? data.dietaryTags.join(",")
      : "",
    allergens: Array.isArray(data.allergens) ? data.allergens.join(",") : "",
  };
}

/**
 * Get current user from database
 */
export async function getCurrentUser(
  tenantId: string,
  authUserId: string
): Promise<{ id: string; role: string } | null> {
  const user = await database.user.findFirst({
    where: {
      AND: [{ tenantId }, { authUserId }],
    },
    select: {
      id: true,
      role: true,
    },
  });

  return user;
}
