/**
 * POST /api/kitchen/prep-lists/commands/create
 *
 * Custom orchestration route (allowlisted): creates a prep list from the prep
 * list builder. This is more than a single Manifest command — it runs the
 * governed PrepList.create for constraint checking (with optional override
 * requests), then atomically persists the prep list, its flat item rows, and
 * an outbox event.
 *
 * Migrated from apps/app/(authenticated)/kitchen/prep-lists/actions-manifest.ts
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
  createPrepList,
  createPrepListRuntime,
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

interface PrepListItemInput {
  allergens: string[];
  baseQuantity: number;
  baseUnit: string;
  category: string | null;
  dietarySubstitutions: string[];
  dishId: string | null;
  dishName: string | null;
  ingredientId: string;
  ingredientName: string;
  isOptional: boolean;
  preparationNotes: string | null;
  recipeVersionId: string | null;
  scaledQuantity: number;
  scaledUnit: string;
  stationId: string;
  stationName: string;
}

interface CreatePrepListInput {
  batchMultiplier: number;
  dietaryRestrictions: string[];
  eventId: string;
  items: PrepListItemInput[];
  name: string;
  notes: string | null;
  totalEstimatedTime: number;
  totalItems: number;
}

interface CreatePrepListRequestBody {
  input: CreatePrepListInput;
  overrideRequests?: OverrideRequest[];
}

interface PrepListCreateResponseBody {
  constraintOutcomes?: ConstraintOutcome[];
  error?: string;
  prepListId?: string;
  redirectUrl?: string;
  success: boolean;
}

function json(body: PrepListCreateResponseBody, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const currentUser = await requireCurrentUser();
    const tenantId = currentUser.tenantId;

    const { input, overrideRequests } =
      (await request.json()) as CreatePrepListRequestBody;

    if (!input?.eventId) {
      return json({ success: false, error: "Event ID is required." }, 400);
    }

    const name = input.name?.trim();
    if (!name) {
      return json(
        { success: false, error: "Prep list name is required." },
        400
      );
    }

    // Verify event exists (read path, constitution §10)
    const [event] = await database.$queryRaw<
      Array<{ id: string; title: string; event_date: Date }>
    >(
      Prisma.sql`
        SELECT id, title, event_date
        FROM tenant_events.events
        WHERE tenant_id = ${tenantId}
          AND id = ${input.eventId}
          AND deleted_at IS NULL
        LIMIT 1
      `
    );

    if (!event) {
      return json({ success: false, error: "Event not found." }, 404);
    }

    const prepListId = randomUUID();
    const dietaryRestrictions = input.dietaryRestrictions?.join(",") ?? "";
    const totalEstimatedTimeMinutes = Math.round(input.totalEstimatedTime * 60);

    // Governed write: PrepList.create via Manifest runtime (constraint check)
    const runtimeContext: KitchenOpsContext = {
      tenantId,
      userId: currentUser.id,
      userRole: currentUser.role,
      storeProvider: createPrismaStoreProvider(database, tenantId),
    };
    const manifestRuntime = await createPrepListRuntime(runtimeContext);

    const createResult = await createPrepList(
      manifestRuntime,
      prepListId,
      input.eventId,
      name,
      input.batchMultiplier ?? 1,
      dietaryRestrictions,
      input.totalItems ?? 0,
      totalEstimatedTimeMinutes,
      input.notes ?? "",
      overrideRequests
    );

    const blockingConstraints = createResult.constraintOutcomes?.filter(
      (o) => !o.passed && o.severity === "block" && !o.overridden
    );

    if (blockingConstraints && blockingConstraints.length > 0) {
      return json(
        {
          success: false,
          constraintOutcomes: createResult.constraintOutcomes,
        },
        422
      );
    }

    const warningConstraints = createResult.constraintOutcomes?.filter(
      (o) => !o.passed && o.severity === "warn"
    );
    if (warningConstraints && warningConstraints.length > 0) {
      const { logger } = Sentry;
      logger.warn(
        logger.fmt`[Manifest] PrepList creation warnings: ${warningConstraints.map((c) => `${c.code}: ${c.formatted}`).join(", ")}`
      );
    }

    // Persist to Prisma database + outbox atomically
    await database.$transaction(async (tx) => {
      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO tenant_kitchen.prep_lists (
            tenant_id,
            event_id,
            id,
            name,
            batch_multiplier,
            dietary_restrictions,
            status,
            total_items,
            total_estimated_time,
            notes,
            generated_at
          )
          VALUES (
            ${tenantId},
            ${input.eventId},
            ${prepListId},
            ${name},
            ${input.batchMultiplier ?? 1},
            ${input.dietaryRestrictions?.length > 0 ? input.dietaryRestrictions : null},
            'draft',
            ${input.totalItems ?? 0},
            ${totalEstimatedTimeMinutes},
            ${input.notes ?? null},
            NOW()
          )
        `
      );

      if (input.items && Array.isArray(input.items)) {
        for (let i = 0; i < input.items.length; i++) {
          const item = input.items[i];
          if (!item) {
            continue;
          }
          const itemId = randomUUID();

          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO tenant_kitchen.prep_list_items (
                tenant_id,
                prep_list_id,
                id,
                station_id,
                station_name,
                ingredient_id,
                ingredient_name,
                category,
                base_quantity,
                base_unit,
                scaled_quantity,
                scaled_unit,
                is_optional,
                preparation_notes,
                allergens,
                dietary_substitutions,
                dish_id,
                dish_name,
                recipe_version_id,
                sort_order
              )
              VALUES (
                ${tenantId},
                ${prepListId},
                ${itemId},
                ${item.stationId},
                ${item.stationName},
                ${item.ingredientId},
                ${item.ingredientName},
                ${item.category ?? null},
                ${item.baseQuantity},
                ${item.baseUnit},
                ${item.scaledQuantity},
                ${item.scaledUnit},
                ${item.isOptional},
                ${item.preparationNotes ?? null},
                ${item.allergens ?? []},
                ${item.dietarySubstitutions ?? []},
                ${item.dishId ?? null},
                ${item.dishName ?? null},
                ${item.recipeVersionId ?? null},
                ${i}
              )
            `
          );
        }
      }

      await tx.outboxEvent.create({
        data: {
          tenantId,
          aggregateType: "PrepList",
          aggregateId: prepListId,
          eventType: "kitchen.preplist.created",
          payload: {
            prepListId,
            eventId: input.eventId,
            name,
            totalItems: input.totalItems ?? 0,
            batchMultiplier: input.batchMultiplier ?? 1,
          },
          status: "pending" as const,
        },
      });
    });

    return json({
      success: true,
      constraintOutcomes: createResult.constraintOutcomes,
      redirectUrl: `/kitchen/prep-lists/${prepListId}`,
      prepListId,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvariantError") {
      return json({ success: false, error: error.message }, 401);
    }
    captureException(error);
    return json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create prep list",
      },
      500
    );
  }
}
