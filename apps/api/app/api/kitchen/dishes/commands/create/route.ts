/**
 * POST /api/kitchen/dishes/commands/create
 *
 * Custom orchestration route (allowlisted): creates a dish via the governed
 * Dish.create command (constraint checks: pricing, margins, lead times; with
 * optional override requests carried in the reserved `overrideRequests` body
 * key). Persistence + event emission happen inside the Manifest runtime —
 * the previous raw-SQL insert + hand-written outbox row were removed
 * 2026-07-04 when the legacy kitchen runtime layer was deleted.
 *
 * Image upload happens in the caller (apps/app server action) before this
 * route is invoked; the request carries the resulting imageUrl.
 */

import type {
  ConstraintOutcome,
  OverrideRequest,
} from "@angriff36/manifest/ir";
import { database, Prisma } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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

const deps = {
  createRuntime: ({
    user,
    entityName,
  }: {
    entityName: string;
    user: { id: string; role: string; tenantId: string };
  }) => createManifestRuntime({ user, entityName }),
};

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

    // Verify recipe exists (read path, constitution §10)
    const [recipe] = await database.$queryRaw<{ id: string }[]>(
      Prisma.sql`
        SELECT id
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

    const dispatched = await runManifestCommandCore(deps, {
      entity: "Dish",
      command: "create",
      body: {
        recipeId,
        name,
        description: body.description ?? "",
        category: body.category ?? "",
        serviceStyle: body.serviceStyle ?? "",
        defaultContainerId: "",
        presentationImageUrl: body.imageUrl ?? "",
        minPrepLeadDays: body.minPrepLeadDays ?? 0,
        maxPrepLeadDays: body.maxPrepLeadDays ?? 7,
        portionSizeDescription: body.portionSizeDescription ?? "",
        dietaryTags: Array.isArray(body.dietaryTags) ? body.dietaryTags : [],
        allergens: Array.isArray(body.allergens) ? body.allergens : [],
        pricePerPerson: body.pricePerPerson ?? 0,
        costPerPerson: body.costPerPerson ?? 0,
        ...(body.overrideRequests
          ? { overrideRequests: body.overrideRequests }
          : {}),
      },
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
    });

    if (!dispatched.ok) {
      if (dispatched.kind === "constraint_blocked") {
        return json(
          { success: false, constraintOutcomes: dispatched.constraintOutcomes },
          422
        );
      }
      return json(
        { success: false, error: dispatched.message },
        dispatched.httpStatus
      );
    }

    const dishId = (dispatched.result as { id?: string } | null)?.id;
    return json({
      success: true,
      constraintOutcomes: dispatched.constraintOutcomes,
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
