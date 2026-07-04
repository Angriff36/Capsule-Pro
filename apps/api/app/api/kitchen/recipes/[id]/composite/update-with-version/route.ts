import { auth } from "@repo/auth/server";
import {
  manifestConstraintBlockedResponse,
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-runtime/route-helpers";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  ConstraintBlockedError,
  GuardBlockedError,
  RecipeNotFoundError,
  type UpdateRecipeRequest,
  updateRecipeWithVersion,
} from "./service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id: recipeId } = await params;
    const body: UpdateRecipeRequest = await request.json();

    const result = await updateRecipeWithVersion({
      body,
      recipeId,
      tenantId,
      userId,
    });

    return manifestSuccessResponse({
      version: result.version,
      ingredients: result.ingredients,
      steps: result.steps,
      newVersionNumber: result.newVersionNumber,
      events: result.events,
      constraintOutcomes: result.constraintOutcomes,
    });
  } catch (error) {
    if (error instanceof ConstraintBlockedError) {
      return manifestConstraintBlockedResponse(
        error.constraintOutcomes,
        "Recipe update blocked by constraints"
      );
    }

    if (error instanceof RecipeNotFoundError) {
      return manifestErrorResponse("Recipe not found", 404);
    }

    // Guard rejections are user-fixable validation failures, not system
    // errors: answer 422 with the friendly message (no Sentry noise).
    if (error instanceof GuardBlockedError) {
      return manifestErrorResponse(error.message, 422);
    }

    log.error("[composite/update-with-version] Error:", error);
    captureException(error);

    const message =
      error instanceof Error ? error.message : "Failed to update recipe";
    return manifestErrorResponse(message, 500);
  }
}
