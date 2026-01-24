Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("../../../../lib/tenant");
async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    // Validate required fields
    if (!body.eventId) {
      return server_2.NextResponse.json(
        { message: "eventId is required" },
        { status: 400 }
      );
    }
    // Get authentication and tenant context
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Get event details to verify it exists and belongs to the tenant
    const event = await database_1.database.event.findFirst({
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
      return server_2.NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }
    // Get all guests for the event with their dietary and allergen restrictions
    const guests = await database_1.database.eventGuest.findMany({
      where: {
        tenantId,
        eventId: body.eventId,
        deletedAt: null,
      },
      select: {
        id: true,
        guestName: true,
        dietaryRestrictions: true,
        allergenRestrictions: true,
      },
    });
    // Get dishes for the event
    let dishes;
    if (body.dishIds && body.dishIds.length > 0) {
      // Check specific dish IDs through event_dishes junction table
      const linkedDishes = await database_1.database.$queryRaw(database_1.Prisma
        .sql`
          SELECT
            d.id AS dish_id,
            d.name AS dish_name,
            d.allergens,
            d.dietary_tags
          FROM tenant_kitchen.dishes d
          WHERE d.tenant_id = ${tenantId}
            AND d.id IN (SELECT UNNEST(ARRAY[${database_1.Prisma.raw(body.dishIds.map((id) => `'${id}'`).join(","))}]::uuid[]))
            AND d.deleted_at IS NULL
        `);
      // Convert to expected format and verify all requested dishes exist
      dishes = linkedDishes.map((d) => ({
        id: d.dish_id,
        name: d.dish_name,
        allergens: d.allergens || [],
        dietaryTags: d.dietary_tags || [],
      }));
      // Verify all requested dishes exist
      const foundDishIds = dishes.map((d) => d.id);
      const missingDishIds = body.dishIds?.filter((id) => !foundDishIds);
      if (missingDishIds && missingDishIds.length > 0) {
        return server_2.NextResponse.json(
          {
            message: `The following dishes not found: ${missingDishIds.join(", ")}`,
          },
          { status: 404 }
        );
      }
    } else {
      // Get all dishes associated with the event through event_dishes junction table
      const linkedDishes = await database_1.database.$queryRaw(database_1.Prisma
        .sql`
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
        `);
      dishes = linkedDishes.map((d) => ({
        id: d.dish_id,
        name: d.dish_name,
        allergens: d.allergens || [],
        dietaryTags: d.dietary_tags || [],
      }));
    }
    // Check for conflicts
    const conflicts = [];
    for (const guest of guests) {
      for (const dish of dishes) {
        const conflictingAllergens = [];
        const conflictingDietaryTags = [];
        // Check allergen conflicts (critical)
        if (guest.allergenRestrictions && dish.allergens) {
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
        if (guest.dietaryRestrictions && dish.dietaryTags) {
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
        // Add conflicts to results
        if (conflictingAllergens.length > 0) {
          conflicts.push({
            guestId: guest.id,
            guestName: guest.guestName,
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
            guestName: guest.guestName,
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
    const response = {
      conflicts,
      summary,
    };
    return server_2.NextResponse.json(response);
  } catch (error) {
    console.error("Error checking allergens:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
