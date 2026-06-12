import type { ConstraintOutcome } from "@angriff36/manifest/ir";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import {
  getBlockingConstraints,
  manifestConstraintBlockedResponse,
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@repo/manifest-runtime/route-helpers";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export const runtime = "nodejs";

/**
 * POST /api/kitchen/prep-lists/save-db
 * Save a generated prep list to the database via manifest runtime.
 *
 * Migrated from direct Prisma calls to manifest runtime for:
 * - Guard enforcement (name/eventId required, positive batchMultiplier)
 * - Constraint evaluation (warnings for large batches, long times)
 * - Event emission (PrepListCreated, PrepListItemCreated)
 * - Policy enforcement
 */
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

    const body = await request.json();
    const { eventId, prepList, name, finalize } = body;

    if (!(eventId && prepList)) {
      return manifestErrorResponse("eventId and prepList are required", 400);
    }

    // Convert hours to minutes
    const totalEstimatedTime = Math.round(prepList.totalEstimatedTime * 60);

    // Generate IDs upfront
    const prepListId = crypto.randomUUID();

    // Collect all constraint outcomes
    let allConstraintOutcomes: ConstraintOutcome[] = [];

    try {
      const result = await database.$transaction(async (tx) => {
        // Create manifest runtime with transaction client override
        const runtime = await createManifestRuntime({
          user: { id: userId, tenantId },
          prismaOverride: tx,
        });

        // 1. Create PrepList via manifest runtime
        const prepListResult = await runtime.runCommand(
          "create",
          {
            id: prepListId,
            tenantId,
            eventId,
            name: name || `${prepList.eventTitle} - Prep List`,
            batchMultiplier: prepList.batchMultiplier ?? 1,
            dietaryRestrictions: Array.isArray(prepList.dietaryRestrictions)
              ? prepList.dietaryRestrictions
              : [],
            totalItems: prepList.totalIngredients ?? 0,
            totalEstimatedTime,
            notes: "",
          },
          { entityName: "PrepList" }
        );

        // Collect constraint outcomes
        if (prepListResult.constraintOutcomes) {
          allConstraintOutcomes = [
            ...allConstraintOutcomes,
            ...prepListResult.constraintOutcomes,
          ];
        }

        // Check for blocking constraints
        const blocking = getBlockingConstraints(prepListResult);
        if (blocking) {
          throw Object.assign(new Error("CONSTRAINT_BLOCKED"), {
            constraintOutcomes: allConstraintOutcomes,
          });
        }

        if (!prepListResult.success) {
          const errorMsg =
            prepListResult.guardFailure?.formatted ||
            prepListResult.policyDenial?.policyName ||
            prepListResult.error ||
            "Failed to create prep list";
          throw new Error(errorMsg);
        }

        // 2. Create PrepListItems via manifest runtime
        let sortOrder = 0;
        const createdItemIds: string[] = [];

        for (const station of prepList.stationLists) {
          for (const ingredient of station.ingredients) {
            const itemId = crypto.randomUUID();

            const itemResult = await runtime.runCommand(
              "create",
              {
                id: itemId,
                tenantId,
                prepListId,
                stationId: station.stationId || "",
                stationName: station.stationName || "",
                ingredientId: ingredient.ingredientId || "",
                ingredientName: ingredient.ingredientName || "",
                category: ingredient.category || "",
                baseQuantity: ingredient.baseQuantity ?? 0,
                baseUnit: ingredient.baseUnit || "",
                scaledQuantity: ingredient.scaledQuantity ?? 0,
                scaledUnit: ingredient.scaledUnit || "",
                isOptional: ingredient.isOptional ?? false,
                preparationNotes: ingredient.preparationNotes || "",
                allergens: Array.isArray(ingredient.allergens)
                  ? ingredient.allergens
                  : [],
                dietarySubstitutions: Array.isArray(
                  ingredient.dietarySubstitutions
                )
                  ? ingredient.dietarySubstitutions
                  : [],
                dishId: "",
                dishName: "",
                recipeVersionId: "",
                sortOrder,
              },
              { entityName: "PrepListItem" }
            );

            // Collect constraint outcomes for items
            if (itemResult.constraintOutcomes) {
              allConstraintOutcomes = [
                ...allConstraintOutcomes,
                ...itemResult.constraintOutcomes,
              ];
            }

            // Check for blocking constraints on items
            const itemBlocking = getBlockingConstraints(itemResult);
            if (itemBlocking) {
              throw Object.assign(new Error("CONSTRAINT_BLOCKED"), {
                constraintOutcomes: allConstraintOutcomes,
              });
            }

            if (!itemResult.success) {
              const errorMsg =
                itemResult.guardFailure?.formatted ||
                itemResult.error ||
                `Failed to create item: ${ingredient.ingredientName}`;
              throw new Error(errorMsg);
            }

            createdItemIds.push(itemId);
            sortOrder++;
          }
        }

        if (finalize === true) {
          const finalizeResult = await runtime.runCommand(
            "finalize",
            {},
            { entityName: "PrepList", instanceId: prepListId }
          );

          if (finalizeResult.constraintOutcomes) {
            allConstraintOutcomes = [
              ...allConstraintOutcomes,
              ...finalizeResult.constraintOutcomes,
            ];
          }

          const finalizeBlocking = getBlockingConstraints(finalizeResult);
          if (finalizeBlocking) {
            throw Object.assign(new Error("CONSTRAINT_BLOCKED"), {
              constraintOutcomes: allConstraintOutcomes,
            });
          }

          if (!finalizeResult.success) {
            const errorMsg =
              finalizeResult.guardFailure?.formatted ||
              finalizeResult.error ||
              "Failed to finalize prep list";
            throw new Error(errorMsg);
          }
        }

        return {
          prepListId,
          itemCount: createdItemIds.length,
          finalized: finalize === true,
        };
      });

      return manifestSuccessResponse({
        message: "Prep list saved successfully",
        prepListId: result.prepListId,
        itemCount: result.itemCount,
        finalized: result.finalized,
        constraintOutcomes: allConstraintOutcomes,
      });
    } catch (error) {
      // Handle constraint-blocked error
      if (
        error instanceof Error &&
        error.message === "CONSTRAINT_BLOCKED" &&
        "constraintOutcomes" in error
      ) {
        return manifestConstraintBlockedResponse(
          (error as { constraintOutcomes: ConstraintOutcome[] })
            .constraintOutcomes,
          "Prep list creation blocked by constraints"
        );
      }

      captureException(error);
      return manifestErrorResponse(
        error instanceof Error ? error.message : "Failed to save prep list",
        500
      );
    }
  } catch (error) {
    captureException(error);
    return manifestErrorResponse(
      error instanceof Error ? error.message : "Failed to save prep list",
      500
    );
  }
}
