/**
 * POST /api/kitchen/dishes/commands/create
 *
 * Custom orchestration route (allowlisted): creates a dish. This is more than
 * a single Manifest command — it runs the governed Dish.create constraint
 * check (pricing, margins, lead times) with optional override requests, then
 * atomically persists the dish row and an outbox event.
 *
 * Image upload happens in the caller (apps/app server action) before this
 * route is invoked; the request carries the resulting imageUrl.
 *
 * Migrated from apps/app/(authenticated)/kitchen/recipes/actions-manifest-v2.ts
 * per docs/manifest-architecture-contract.md (apps/app must not execute
 * Manifest runtime).
 */

import { randomUUID } from "node:crypto";
import type {
  ConstraintOutcome,
  OverrideRequest,
} from "@angriff36/manifest/ir";
import { database, Prisma } from "@repo/database";
import {
  createDish as createDishManifest,
  createRecipeRuntime,
  type KitchenOpsContext,
} from "@repo/manifest-runtime";
import { createPrismaStoreProvider } from "@repo/manifest-runtime/prisma-store";
// biome-ignore lint/performance/noNamespaceImport: Sentry.logger requires namespace import
import * as Sentry from "@sentry/nextjs";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";

export const runtime = "nodejs";

interface CreateDishRequestBody {
  allergens: string[];
  category: string | null;
  costPerPerson: number | null;
  description: string | null;
  dietaryTags: string[];
  imageUrl: string | null;
  maxPrepLeadDays: number | null;
  minPrepLeadDays: number | null;
  name: string;
  overrideRequests?: OverrideRequest[];
  portionSizeDescription: string | null;
  pricePerPerson: number | null;
  recipeId: string;
  serviceStyle: string | null;
}

interface DishCreateResponseBody {
  constraintOutcomes?: ConstraintOutcome[];
  dishId?: string;
  error?: string;
  redirectUrl?: string;
  success: boolean;
}

function json(body: DishCreateResponseBody, status = 200) {
  return NextResponse.json(body, { status });
}

interface NormalizedDishInput {
  allergens: string[];
  category: string | null;
  costPerPerson: number | null;
  description: string | null;
  dietaryTags: string[];
  imageUrl: string | null;
  maxLead: number | null;
  minLead: number | null;
  name: string;
  overrideRequests?: OverrideRequest[];
  portionSize: string | null;
  pricePerPerson: number | null;
  recipeId: string;
  serviceStyle: string | null;
}

/** Governed write: Dish.create constraint check via Manifest runtime. */
async function runGovernedDishCreate(
  currentUser: { id: string; tenantId: string; role: string },
  dishId: string,
  input: NormalizedDishInput
) {
  const runtimeContext: KitchenOpsContext = {
    tenantId: currentUser.tenantId,
    userId: currentUser.id,
    userRole: currentUser.role,
    storeProvider: createPrismaStoreProvider(database, currentUser.tenantId),
  };
  const manifestRuntime = await createRecipeRuntime(runtimeContext);

  return await createDishManifest(
    manifestRuntime,
    dishId,
    input.name,
    input.recipeId,
    input.description ?? "",
    input.category ?? "",
    input.serviceStyle ?? "",
    input.dietaryTags.join(","),
    input.allergens.join(","),
    input.pricePerPerson ?? 0,
    input.costPerPerson ?? 0,
    input.minLead ?? 0,
    input.maxLead ?? 7,
    input.portionSize ?? "",
    input.overrideRequests
  );
}

function logConstraintWarnings(constraintOutcomes?: ConstraintOutcome[]) {
  const warningConstraints = constraintOutcomes?.filter(
    (o) => !o.passed && o.severity === "warn"
  );
  if (warningConstraints && warningConstraints.length > 0) {
    const { logger } = Sentry;
    logger.warn(
      logger.fmt`[Manifest] Dish creation warnings: ${warningConstraints.map((c) => `${c.code}: ${c.formatted}`).join(", ")}`
    );
  }
}

/** Persist dish row + outbox event atomically. */
async function persistDish(
  tenantId: string,
  dishId: string,
  input: NormalizedDishInput,
  constraintOutcomes?: ConstraintOutcome[]
) {
  const {
    name,
    recipeId,
    description,
    category,
    serviceStyle,
    imageUrl,
    dietaryTags,
    allergens,
    pricePerPerson,
    costPerPerson,
    minLead,
    maxLead,
    portionSize,
  } = input;

  await database.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`
          INSERT INTO tenant_kitchen.dishes (
            tenant_id,
            id,
            recipe_id,
            name,
            description,
            category,
            service_style,
            presentation_image_url,
            dietary_tags,
            allergens,
            price_per_person,
            cost_per_person,
            min_prep_lead_days,
            max_prep_lead_days,
            portion_size_description,
            is_active
          )
          VALUES (
            ${tenantId},
            ${dishId},
            ${recipeId},
            ${name},
            ${description},
            ${category},
            ${serviceStyle},
            ${imageUrl},
            ${dietaryTags.length > 0 ? dietaryTags : null},
            ${allergens.length > 0 ? allergens : null},
            ${pricePerPerson},
            ${costPerPerson},
            ${minLead ?? 0},
            ${maxLead},
            ${portionSize},
            true
          )
        `
    );

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "dish",
        aggregateId: dishId,
        eventType: "dish.created",
        payload: {
          dishId,
          recipeId,
          name,
          pricePerPerson,
          costPerPerson,
          constraintOutcomes:
            constraintOutcomes as unknown as Prisma.InputJsonValue,
        },
        status: "pending" as const,
      },
    });
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const currentUser = await requireCurrentUser();
    const tenantId = currentUser.tenantId;

    const body = (await request.json()) as CreateDishRequestBody;
    const name = body.name?.trim();
    const recipeId = body.recipeId?.trim();
    if (!(name && recipeId)) {
      return json(
        { success: false, error: "Dish name and recipe are required." },
        400
      );
    }

    const input: NormalizedDishInput = {
      name,
      recipeId,
      category: body.category,
      serviceStyle: body.serviceStyle,
      description: body.description,
      imageUrl: body.imageUrl,
      dietaryTags: Array.isArray(body.dietaryTags) ? body.dietaryTags : [],
      allergens: Array.isArray(body.allergens) ? body.allergens : [],
      pricePerPerson: body.pricePerPerson,
      costPerPerson: body.costPerPerson,
      minLead: body.minPrepLeadDays,
      maxLead: body.maxPrepLeadDays,
      portionSize: body.portionSizeDescription,
      overrideRequests: body.overrideRequests,
    };

    // Verify recipe exists (read path, constitution §10)
    const [recipe] = await database.$queryRaw<{ id: string; name: string }[]>(
      Prisma.sql`
        SELECT id, name
        FROM tenant_kitchen.recipes
        WHERE tenant_id = ${tenantId}
          AND id = ${recipeId}
          AND deleted_at IS NULL
        LIMIT 1
      `
    );

    if (!recipe) {
      return json({ success: false, error: "Recipe not found." }, 404);
    }

    const dishId = randomUUID();

    const result = await runGovernedDishCreate(currentUser, dishId, input);

    const blockingConstraints = result.constraintOutcomes?.filter(
      (o) => !o.passed && o.severity === "block" && !o.overridden
    );

    if (blockingConstraints && blockingConstraints.length > 0) {
      return json(
        { success: false, constraintOutcomes: result.constraintOutcomes },
        422
      );
    }

    logConstraintWarnings(result.constraintOutcomes);

    await persistDish(tenantId, dishId, input, result.constraintOutcomes);

    return json({
      success: true,
      constraintOutcomes: result.constraintOutcomes,
      redirectUrl: "/kitchen/recipes?tab=dishes",
      dishId,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvariantError") {
      return json({ success: false, error: error.message }, 401);
    }
    captureException(error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create dish",
      },
      500
    );
  }
}
