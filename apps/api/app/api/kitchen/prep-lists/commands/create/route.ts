/**
 * POST /api/kitchen/prep-lists/commands/create
 *
 * Custom orchestration route (allowlisted): creates a prep list from the prep
 * list builder — the governed PrepList.create (with optional override
 * requests) plus one governed PrepListItem.create per builder row, all inside
 * a single transaction-bound Manifest runtime so the writes commit or roll
 * back together (same pattern as runManifestBatch). The previous raw-SQL
 * inserts + hand-written outbox row were removed 2026-07-04 when the legacy
 * kitchen runtime layer was deleted.
 */

import type {
  ConstraintOutcome,
  OverrideRequest,
} from "@angriff36/manifest/ir";
import { database, Prisma } from "@repo/database";
import {
  type RunManifestCommandCoreFailure,
  runManifestCommandCore,
} from "@repo/manifest-runtime/run-manifest-command-core";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { batchTransactionTimeout } from "@/lib/manifest/batch-timeout";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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

/** Thrown inside the transaction to abort it and surface the core failure. */
class GovernedCreateError extends Error {
  readonly failure: RunManifestCommandCoreFailure;
  constructor(failure: RunManifestCommandCoreFailure) {
    super(failure.message);
    this.name = "GovernedCreateError";
    this.failure = failure;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const currentUser = await requireCurrentUser();
    const tenantId = currentUser.tenantId;
    const user = {
      id: currentUser.id,
      tenantId,
      role: currentUser.role,
    };

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
    const [event] = await database.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`
        SELECT id
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

    const items = Array.isArray(input.items) ? input.items : [];
    const totalEstimatedTimeMinutes = Math.round(input.totalEstimatedTime * 60);

    const { prepListId, constraintOutcomes } = await database.$transaction(
      async (tx) => {
        const txRuntime = await createManifestRuntime({
          user,
          prismaOverride: tx,
        });
        const deps = { createRuntime: () => Promise.resolve(txRuntime) };

        const created = await runManifestCommandCore(deps, {
          entity: "PrepList",
          command: "create",
          body: {
            eventId: input.eventId,
            name,
            batchMultiplier: input.batchMultiplier ?? 1,
            dietaryRestrictions: input.dietaryRestrictions ?? [],
            totalItems: input.totalItems ?? items.length,
            totalEstimatedTime: totalEstimatedTimeMinutes,
            notes: input.notes ?? "",
            ...(overrideRequests ? { overrideRequests } : {}),
          },
          user,
        });
        if (!created.ok) {
          throw new GovernedCreateError(created);
        }
        const listId = (created.result as { id?: string } | null)?.id;
        if (!listId) {
          throw new Error("PrepList.create returned no instance id");
        }

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item) {
            continue;
          }
          const itemResult = await runManifestCommandCore(deps, {
            entity: "PrepListItem",
            command: "create",
            body: {
              prepListId: listId,
              stationId: item.stationId,
              stationName: item.stationName,
              ingredientId: item.ingredientId,
              ingredientName: item.ingredientName,
              category: item.category ?? "",
              baseQuantity: item.baseQuantity,
              baseUnit: item.baseUnit,
              scaledQuantity: item.scaledQuantity,
              scaledUnit: item.scaledUnit,
              isOptional: item.isOptional,
              preparationNotes: item.preparationNotes ?? "",
              allergens: item.allergens ?? [],
              dietarySubstitutions: item.dietarySubstitutions ?? [],
              dishId: item.dishId ?? "",
              dishName: item.dishName ?? "",
              recipeVersionId: item.recipeVersionId ?? "",
              sortOrder: i,
            },
            user,
          });
          if (!itemResult.ok) {
            throw new GovernedCreateError(itemResult);
          }
        }

        return {
          prepListId: listId,
          constraintOutcomes: created.constraintOutcomes,
        };
      },
      // Bound at the app-wide tx ceiling (30s) so one create can't pin a pool
      // connection — see batch-timeout.ts (db-perf #29 / #18).
      {
        timeout: batchTransactionTimeout(items.length),
        maxWait: 10_000,
      }
    );

    return json({
      success: true,
      constraintOutcomes,
      redirectUrl: `/kitchen/prep-lists/${prepListId}`,
      prepListId,
    });
  } catch (error) {
    if (error instanceof GovernedCreateError) {
      if (error.failure.kind === "constraint_blocked") {
        return json(
          {
            success: false,
            constraintOutcomes: error.failure.constraintOutcomes,
          },
          422
        );
      }
      return json(
        { success: false, error: error.failure.message },
        error.failure.httpStatus
      );
    }
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
