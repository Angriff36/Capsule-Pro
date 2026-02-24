/**
 * @module AllergenConflictDetectionService
 * @intent Automatically detect allergen conflicts and generate warnings
 * @responsibility Check for conflicts between event guests and dish allergens, create warnings
 * @domain Kitchen
 * @tags allergens, conflicts, warnings, service
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createManifestRuntime } from "@repo/manifest-adapters/manifest-runtime-factory";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

// Required for manifest runtime - must use Node.js runtime (not Edge)
export const runtime = "nodejs";

interface DetectConflictsRequest {
  eventId: string;
}

interface GuestData {
  id: string;
  guestName: string | null;
  allergenRestrictions: string[] | null;
  dietaryRestrictions: string[] | null;
}

interface DishData {
  id: string;
  name: string;
  allergens: string[];
  dietaryTags: string[];
}

/**
 * Check for allergen conflicts between a guest and dish
 */
function findAllergenConflicts(guest: GuestData, dish: DishData): string[] {
  if (
    !guest.allergenRestrictions ||
    guest.allergenRestrictions.length === 0 ||
    !dish.allergens ||
    dish.allergens.length === 0
  ) {
    return [];
  }

  const conflicts: string[] = [];
  for (const allergen of guest.allergenRestrictions) {
    if (
      dish.allergens.some(
        (dishAllergen) =>
          dishAllergen.toLowerCase().includes(allergen.toLowerCase()) ||
          allergen.toLowerCase().includes(dishAllergen.toLowerCase())
      )
    ) {
      conflicts.push(allergen);
    }
  }
  return conflicts;
}

/**
 * Check for dietary conflicts between a guest and dish
 */
function findDietaryConflicts(guest: GuestData, dish: DishData): string[] {
  if (
    !guest.dietaryRestrictions ||
    guest.dietaryRestrictions.length === 0 ||
    !dish.dietaryTags ||
    dish.dietaryTags.length === 0
  ) {
    return [];
  }

  const conflicts: string[] = [];
  for (const restriction of guest.dietaryRestrictions) {
    if (
      dish.dietaryTags.some(
        (dietaryTag) =>
          dietaryTag.toLowerCase().includes(restriction.toLowerCase()) ||
          restriction.toLowerCase().includes(dietaryTag.toLowerCase())
      )
    ) {
      conflicts.push(restriction);
    }
  }
  return conflicts;
}

/**
 * Create an allergen warning via manifest runtime
 * Note: allergens and affectedGuests are passed as arrays; AllergenWarningPrismaStore.stringToArray() handles the conversion
 */
async function createWarningViaManifest(
  runtime: Awaited<ReturnType<typeof createManifestRuntime>>,
  eventId: string,
  guest: GuestData,
  dish: DishData,
  warningType: "allergen_conflict" | "dietary_conflict",
  conflictingItems: string[],
  severity: "critical" | "warning"
): Promise<{ success: boolean; error?: string }> {
  const notes =
    warningType === "allergen_conflict"
      ? `Guest "${guest.guestName}" has allergen restrictions: ${conflictingItems.join(", ")}. Dish "${dish.name}" contains these allergens.`
      : `Guest "${guest.guestName}" has dietary restrictions: ${conflictingItems.join(", ")}. Dish "${dish.name}" conflicts with these restrictions.`;

  const result = await runtime.runCommand(
    "create",
    {
      eventId,
      dishId: dish.id,
      warningType,
      // Pass arrays directly - AllergenWarningPrismaStore.stringToArray() handles both strings and arrays
      allergens: conflictingItems as unknown as string,
      affectedGuests: [guest.id] as unknown as string,
      severity,
      notes,
    },
    { entityName: "AllergenWarning" }
  );

  if (!result.success) {
    return {
      success: false,
      error:
        result.guardFailure?.formatted ||
        result.policyDenial?.policyName ||
        result.error ||
        "Unknown error",
    };
  }
  return { success: true };
}

/**
 * POST /api/kitchen/allergens/detect-conflicts
 *
 * Automatically detects allergen conflicts between event guests and assigned dishes,
 * and creates warnings for any conflicts found.
 *
 * This endpoint should be called:
 * - When guests are added/updated for an event
 * - When dishes are added/removed from an event menu
 * - When dish allergen information is updated
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    invariant(tenantId, `tenantId not found for orgId=${orgId}`);

    const body: DetectConflictsRequest = await request.json();
    invariant(body.eventId, "eventId is required");

    // Verify event exists and belongs to the tenant
    const event = await database.event.findFirst({
      where: {
        id: body.eventId,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get all guests for the event
    const guests = await database.eventGuest.findMany({
      where: {
        tenantId,
        eventId: body.eventId,
        deletedAt: null,
      },
      select: {
        id: true,
        guestName: true,
        allergenRestrictions: true,
        dietaryRestrictions: true,
      },
    });

    // Get all dishes associated with the event
    const linkedDishes = await database.$queryRaw<
      Array<{
        dish_id: string;
        dish_name: string;
        allergens: string[] | null;
        dietary_tags: string[] | null;
      }>
    >`
      SELECT
        d.id AS dish_id,
        d.name AS dish_name,
        d.allergens,
        d.dietary_tags
      FROM tenant_kitchen.dishes d
      JOIN tenant_events.event_dishes ed
        ON ed.tenant_id = d.tenant_id
        AND ed.dish_id = d.id
        AND ed.deleted_at IS NULL
      WHERE ed.tenant_id = ${tenantId}::uuid
        AND ed.event_id = ${body.eventId}::uuid
        AND d.deleted_at IS NULL
    `;

    const dishes = linkedDishes.map((d) => ({
      id: d.dish_id,
      name: d.dish_name,
      allergens: d.allergens || [],
      dietaryTags: d.dietary_tags || [],
    }));

    // Delete existing unresolved warnings for this event
    await database.allergenWarning.deleteMany({
      where: {
        tenantId,
        eventId: body.eventId,
        resolved: false,
        isAcknowledged: false,
      },
    });

    let warningsCreated = 0;
    const creationErrors: string[] = [];

    // Create warnings via manifest runtime with transaction for constraint validation and event emission
    await database.$transaction(async (tx) => {
      const runtime = await createManifestRuntime(
        {
          prisma: database,
          prismaOverride: tx,
          log,
          captureException,
        },
        {
          user: { id: userId, tenantId },
        }
      );

      // Check for conflicts and create warnings
      for (const guest of guests) {
        for (const dish of dishes) {
          const conflictingAllergens = findAllergenConflicts(guest, dish);
          const conflictingDietaryTags = findDietaryConflicts(guest, dish);

          // Create warning for allergen conflicts (critical severity)
          if (conflictingAllergens.length > 0) {
            const result = await createWarningViaManifest(
              runtime,
              body.eventId,
              guest,
              dish,
              "allergen_conflict",
              conflictingAllergens,
              "critical"
            );
            if (result.success) {
              warningsCreated++;
            } else {
              creationErrors.push(
                `Allergen warning for ${guest.guestName}/${dish.name}: ${result.error}`
              );
            }
          }

          // Create warning for dietary conflicts (warning severity)
          if (conflictingDietaryTags.length > 0) {
            const result = await createWarningViaManifest(
              runtime,
              body.eventId,
              guest,
              dish,
              "dietary_conflict",
              conflictingDietaryTags,
              "warning"
            );
            if (result.success) {
              warningsCreated++;
            } else {
              creationErrors.push(
                `Dietary warning for ${guest.guestName}/${dish.name}: ${result.error}`
              );
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Conflict detection complete. ${warningsCreated} warning(s) created.`,
      warningsCreated,
      guestsProcessed: guests.length,
      dishesProcessed: dishes.length,
      errors: creationErrors.length > 0 ? creationErrors : undefined,
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    captureException(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
