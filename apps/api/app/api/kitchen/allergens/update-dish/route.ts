/**
 * @module UpdateDishAllergens
 * @intent Handle API requests to update allergen and dietary tag information for dishes
 * @responsibility Validate request, update dish allergens via manifest runtime, return success/error response
 * @domain Kitchen
 * @tags allergens, api, dishes, dietary-restrictions
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createManifestRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";
import {
  getBlockingConstraints,
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-adapters/route-helpers";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createSentryTelemetry } from "@/lib/manifest/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UpdateDishAllergensRequest {
  id: string;
  tenantId: string;
  allergens: string[];
  dietaryTags: string[];
}

/**
 * Convert array to comma-separated string for manifest.
 * Manifest properties use string format, but API accepts arrays for convenience.
 */
function arrayToManifestString(arr: string[]): string {
  return arr.join(",");
}

/**
 * Convert comma-separated string from manifest to array for API response.
 */
function manifestStringToArray(str: string): string[] {
  if (!str || str === "") return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();

    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const body: UpdateDishAllergensRequest = await request.json();
    const { id, allergens, dietaryTags } = body;

    // Validate required fields
    if (!id) {
      return manifestErrorResponse("Missing required field: id", 400);
    }

    // Validate allergens array
    if (!Array.isArray(allergens)) {
      return manifestErrorResponse("allergens must be an array", 400);
    }

    // Validate dietaryTags array
    if (!Array.isArray(dietaryTags)) {
      return manifestErrorResponse("dietaryTags must be an array", 400);
    }

    // Fetch current dish to get all required fields for update command
    const currentDish = await database.dish.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        serviceStyle: true,
        defaultContainerId: true,
        presentationImageUrl: true,
        portionSizeDescription: true,
      },
    });

    if (!currentDish) {
      return manifestErrorResponse("Dish not found", 404);
    }

    // Execute update via manifest runtime
    const sentryTelemetry = createSentryTelemetry();

    const result = await database.$transaction(async (tx) => {
      const runtime = await createManifestRuntime(
        {
          prisma: database,
          prismaOverride: tx,
          log,
          captureException,
          telemetry: sentryTelemetry,
        },
        {
          user: { id: userId, tenantId },
        }
      );

      const updateResult = await runtime.runCommand(
        "update",
        {
          id,
          name: currentDish.name,
          description: currentDish.description ?? "",
          category: currentDish.category ?? "",
          serviceStyle: currentDish.serviceStyle ?? "",
          defaultContainerId: currentDish.defaultContainerId ?? "",
          presentationImageUrl: currentDish.presentationImageUrl ?? "",
          portionSizeDescription: currentDish.portionSizeDescription ?? "",
          dietaryTags: arrayToManifestString(dietaryTags),
          allergens: arrayToManifestString(allergens),
        },
        { entityName: "Dish" }
      );

      // Check for blocking constraints
      const blocking = getBlockingConstraints(updateResult);
      if (blocking) {
        throw Object.assign(new Error("CONSTRAINT_BLOCKED"), {
          constraintOutcomes: updateResult.constraintOutcomes || [],
        });
      }

      if (!updateResult.success) {
        throw new Error(
          updateResult.guardFailure?.formatted ||
            updateResult.policyDenial?.policyName ||
            updateResult.error ||
            "Failed to update dish"
        );
      }

      return updateResult;
    });

    return manifestSuccessResponse({
      dish: {
        id,
        name: currentDish.name,
        allergens,
        dietaryTags,
      },
      events: result.emittedEvents || [],
      constraintOutcomes: result.constraintOutcomes || [],
    });
  } catch (error) {
    // Check if this is a constraint-blocked error
    if (
      error instanceof Error &&
      error.message === "CONSTRAINT_BLOCKED" &&
      "constraintOutcomes" in error
    ) {
      return manifestErrorResponse("Dish update blocked by constraints", 400, {
        constraintOutcomes: (error as { constraintOutcomes: unknown[] })
          .constraintOutcomes,
      });
    }

    console.error("[allergens/update-dish] Error:", error);
    captureException(error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update dish allergens";
    return manifestErrorResponse(message, 500);
  }
}
