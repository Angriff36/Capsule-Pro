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
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type DetectConflictsRequest = {
  eventId: string;
};

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
    const { orgId } = await auth();
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

    // Check for conflicts and create warnings
    for (const guest of guests) {
      for (const dish of dishes) {
        const conflictingAllergens: string[] = [];
        const conflictingDietaryTags: string[] = [];

        // Check allergen conflicts (critical)
        if (
          guest.allergenRestrictions &&
          guest.allergenRestrictions.length > 0 &&
          dish.allergens &&
          dish.allergens.length > 0
        ) {
          for (const allergen of guest.allergenRestrictions) {
            if (
              dish.allergens.some(
                (dishAllergen) =>
                  dishAllergen.toLowerCase().includes(allergen.toLowerCase()) ||
                  allergen.toLowerCase().includes(dishAllergen.toLowerCase())
              )
            ) {
              conflictingAllergens.push(allergen);
            }
          }
        }

        // Check dietary restriction conflicts (warning)
        if (
          guest.dietaryRestrictions &&
          guest.dietaryRestrictions.length > 0 &&
          dish.dietaryTags &&
          dish.dietaryTags.length > 0
        ) {
          for (const restriction of guest.dietaryRestrictions) {
            if (
              dish.dietaryTags.some(
                (dietaryTag) =>
                  dietaryTag
                    .toLowerCase()
                    .includes(restriction.toLowerCase()) ||
                  restriction.toLowerCase().includes(dietaryTag.toLowerCase())
              )
            ) {
              conflictingDietaryTags.push(restriction);
            }
          }
        }

        // Create warning for allergen conflicts (critical severity)
        if (conflictingAllergens.length > 0) {
          await database.allergenWarning.create({
            data: {
              tenantId,
              eventId: body.eventId,
              dishId: dish.id,
              warningType: "allergen_conflict",
              allergens: conflictingAllergens,
              affectedGuests: [guest.id],
              severity: "critical",
              notes: `Guest "${guest.guestName}" has allergen restrictions: ${conflictingAllergens.join(", ")}. Dish "${dish.name}" contains these allergens.`,
            },
          });
          warningsCreated++;
        }

        // Create warning for dietary conflicts (warning severity)
        if (conflictingDietaryTags.length > 0) {
          await database.allergenWarning.create({
            data: {
              tenantId,
              eventId: body.eventId,
              dishId: dish.id,
              warningType: "dietary_conflict",
              allergens: conflictingDietaryTags,
              affectedGuests: [guest.id],
              severity: "warning",
              notes: `Guest "${guest.guestName}" has dietary restrictions: ${conflictingDietaryTags.join(", ")}. Dish "${dish.name}" conflicts with these restrictions.`,
            },
          });
          warningsCreated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Conflict detection complete. ${warningsCreated} warning(s) created.`,
      warningsCreated,
      guestsProcessed: guests.length,
      dishesProcessed: dishes.length,
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error detecting allergen conflicts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
