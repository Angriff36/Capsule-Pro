import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "../../../../lib/tenant";

// Define types
type CheckAllergensRequest = {
  eventId: string;
  dishIds?: string[];
};

type AllergenConflict = {
  guestId: string;
  guestName: string;
  dishId: string;
  dishName: string;
  allergens: string[];
  severity: "critical" | "warning";
  type: "allergen_conflict" | "dietary_conflict";
};

type CheckAllergensResponse = {
  conflicts: AllergenConflict[];
  summary: {
    total: number;
    critical: number;
    warning: number;
  };
};

export async function POST(request: Request) {
  try {
    // Parse request body
    const body: CheckAllergensRequest = await request.json();

    // Validate required fields
    if (!body.eventId) {
      return NextResponse.json(
        { message: "eventId is required" },
        { status: 400 }
      );
    }

    // Get authentication and tenant context
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Get event details to verify it exists and belongs to the tenant
    const event = await database.events.findFirst({
      where: {
        tenantId,
        id: body.eventId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Get all guests for the event with their dietary and allergen restrictions
    const guests = await database.event_guests.findMany({
      where: {
        tenantId,
        eventId: body.eventId,
        deletedAt: null,
      },
      select: {
        id: true,
        guest_name: true,
        dietary_restrictions: true,
        allergen_restrictions: true,
      },
    });

    // Get dishes for the event
    let dishes: Array<{
      id: string;
      name: string;
      allergens: string[];
      dietaryTags: string[];
    }>;
    if (body.dishIds && body.dishIds.length > 0) {
      // Check specific dish IDs through event_dishes junction table
      const linkedDishes = await database.$queryRaw<
        Array<{
          dish_id: string;
          dish_name: string;
          allergens: string[] | null;
          dietary_tags: string[] | null;
        }>
      >(
        Prisma.sql`
          SELECT
            d.id AS dish_id,
            d.name AS dish_name,
            d.allergens,
            d.dietary_tags
          FROM tenant_kitchen.dishes d
          WHERE d.tenant_id = ${tenantId}
            AND d.id IN (SELECT UNNEST(ARRAY[${Prisma.raw(body.dishIds.map((id) => `'${id}'`).join(","))}]::uuid[]))
            AND d.deleted_at IS NULL
        `
      );

      // Convert to expected format and verify all requested dishes exist
      dishes = linkedDishes.map((d) => ({
        id: d.dish_id,
        name: d.dish_name,
        allergens: d.allergens || [],
        dietaryTags: d.dietary_tags || [],
      }));

      // Verify all requested dishes exist
      const foundDishIds = dishes.map((d) => d.id);
      const missingDishIds = body.dishIds?.filter((_id) => !foundDishIds);
      if (missingDishIds && missingDishIds.length > 0) {
        return NextResponse.json(
          {
            message: `The following dishes not found: ${missingDishIds.join(", ")}`,
          },
          { status: 404 }
        );
      }
    } else {
      // Get all dishes associated with the event through event_dishes junction table
      const linkedDishes = await database.$queryRaw<
        Array<{
          dish_id: string;
          dish_name: string;
          allergens: string[] | null;
          dietary_tags: string[] | null;
        }>
      >(
        Prisma.sql`
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
          WHERE ed.tenant_id = ${tenantId}
            AND ed.event_id = ${body.eventId}
            AND d.deleted_at IS NULL
        `
      );

      dishes = linkedDishes.map((d) => ({
        id: d.dish_id,
        name: d.dish_name,
        allergens: d.allergens || [],
        dietaryTags: d.dietary_tags || [],
      }));
    }

    // Check for conflicts
    const conflicts: AllergenConflict[] = [];

    for (const guest of guests) {
      for (const dish of dishes) {
        const conflictingAllergens: string[] = [];
        const conflictingDietaryTags: string[] = [];

        // Check allergen conflicts (critical)
        if (guest.allergen_restrictions && dish.allergens) {
          for (const allergen of guest.allergen_restrictions) {
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
        if (guest.dietary_restrictions && dish.dietaryTags) {
          for (const restriction of guest.dietary_restrictions) {
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

        // Add conflicts to results
        if (conflictingAllergens.length > 0) {
          conflicts.push({
            guestId: guest.id,
            guestName: guest.guest_name,
            dishId: dish.id,
            dishName: dish.name,
            allergens: conflictingAllergens,
            severity: "critical",
            type: "allergen_conflict",
          });
        }

        if (conflictingDietaryTags.length > 0) {
          conflicts.push({
            guestId: guest.id,
            guestName: guest.guest_name,
            dishId: dish.id,
            dishName: dish.name,
            allergens: conflictingDietaryTags,
            severity: "warning",
            type: "dietary_conflict",
          });
        }
      }
    }

    // Create summary
    const summary = {
      total: conflicts.length,
      critical: conflicts.filter((c) => c.severity === "critical").length,
      warning: conflicts.filter((c) => c.severity === "warning").length,
    };

    // Return response
    const response: CheckAllergensResponse = {
      conflicts,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error checking allergens:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
