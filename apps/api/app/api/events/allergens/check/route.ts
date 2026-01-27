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

// Helper function to validate request body
function validateRequest(body: CheckAllergensRequest): NextResponse | null {
  if (!body.eventId) {
    return NextResponse.json(
      { message: "eventId is required" },
      { status: 400 }
    );
  }
  return null;
}

// Helper function to get authentication and tenant context
async function getAuthContext(): Promise<{ tenantId: string } | NextResponse> {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  return { tenantId };
}

// Helper function to get event details
async function getEventDetails(
  tenantId: string,
  eventId: string
): Promise<{ id: string; title: string } | NextResponse> {
  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
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

  return event;
}

// Helper function to get guests with their restrictions
function getGuests(tenantId: string, eventId: string) {
  return database.eventGuest.findMany({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
    select: {
      id: true,
      guestName: true,
      dietaryRestrictions: true,
      allergenRestrictions: true,
    },
  });
}

// Helper function to check if allergens match
function doAllergensMatch(allergen: string, dishAllergen: string): boolean {
  const lowerAllergen = allergen.toLowerCase();
  const lowerDishAllergen = dishAllergen.toLowerCase();

  return (
    lowerDishAllergen.includes(lowerAllergen) ||
    lowerAllergen.includes(lowerDishAllergen)
  );
}

// Helper function to check if dietary restrictions match
function doDietaryRestrictionsMatch(
  restriction: string,
  dietaryTag: string
): boolean {
  const lowerRestriction = restriction.toLowerCase();
  const lowerDietaryTag = dietaryTag.toLowerCase();

  return (
    lowerDietaryTag.includes(lowerRestriction) ||
    lowerRestriction.includes(lowerDietaryTag)
  );
}

// Helper function to find conflicting allergens for a guest and dish
function findConflictingAllergens(
  guest: {
    id: string;
    guestName: string;
    dietaryRestrictions: string[] | null;
    allergenRestrictions: string[] | null;
  },
  dish: {
    id: string;
    name: string;
    allergens: string[];
    dietaryTags: string[];
  }
): { conflictingAllergens: string[]; conflictingDietaryTags: string[] } {
  const conflictingAllergens: string[] = [];
  const conflictingDietaryTags: string[] = [];

  // Check allergen conflicts (critical)
  if (guest.allergenRestrictions && dish.allergens) {
    for (const allergen of guest.allergenRestrictions) {
      if (
        dish.allergens.some((dishAllergen) =>
          doAllergensMatch(allergen, dishAllergen)
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
        dish.dietaryTags.some((dietaryTag) =>
          doDietaryRestrictionsMatch(restriction, dietaryTag)
        )
      ) {
        conflictingDietaryTags.push(restriction);
      }
    }
  }

  return { conflictingAllergens, conflictingDietaryTags };
}

// Helper function to check for allergen conflicts between guests and dishes
function checkAllergenConflicts(
  guests: Array<{
    id: string;
    guestName: string;
    dietaryRestrictions: string[] | null;
    allergenRestrictions: string[] | null;
  }>,
  dishes: Array<{
    id: string;
    name: string;
    allergens: string[];
    dietaryTags: string[];
  }>
): AllergenConflict[] {
  const conflicts: AllergenConflict[] = [];

  for (const guest of guests) {
    for (const dish of dishes) {
      const { conflictingAllergens, conflictingDietaryTags } =
        findConflictingAllergens(guest, dish);

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

  return conflicts;
}

// Helper function to create summary
function createSummary(conflicts: AllergenConflict[]) {
  return {
    total: conflicts.length,
    critical: conflicts.filter((c) => c.severity === "critical").length,
    warning: conflicts.filter((c) => c.severity === "warning").length,
  };
}

export async function POST(request: Request) {
  try {
    // Parse request body
    const body: CheckAllergensRequest = await request.json();

    // Validate required fields
    const validationError = validateRequest(body);
    if (validationError) {
      return validationError;
    }

    // Get authentication and tenant context
    const authResult = await getAuthContext();
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { tenantId } = authResult;

    // Get event details to verify it exists and belongs to the tenant
    const eventResult = await getEventDetails(tenantId, body.eventId);
    if (eventResult instanceof NextResponse) {
      return eventResult;
    }

    // Get all guests for the event with their dietary and allergen restrictions
    const guests = await getGuests(tenantId, body.eventId);

    // Get dishes for the event
    const dishesResult = await getDishes(tenantId, body.eventId, body.dishIds);
    if (dishesResult instanceof NextResponse) {
      return dishesResult;
    }
    const dishes = dishesResult;

    // Check for conflicts
    const conflicts = checkAllergenConflicts(guests, dishes);

    // Create summary
    const summary = createSummary(conflicts);

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

// Helper function to get dishes for the event
function getDishes(
  tenantId: string,
  eventId: string,
  dishIds?: string[]
): Promise<
  | Array<{
      id: string;
      name: string;
      allergens: string[];
      dietaryTags: string[];
    }>
  | NextResponse
> {
  if (dishIds && dishIds.length > 0) {
    return getSpecificDishes(tenantId, dishIds);
  }
  return getEventDishes(tenantId, eventId);
}

// Helper function to get specific dishes by IDs
async function getSpecificDishes(
  tenantId: string,
  dishIds: string[]
): Promise<
  | Array<{
      id: string;
      name: string;
      allergens: string[];
      dietaryTags: string[];
    }>
  | NextResponse
> {
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
        AND d.id IN (SELECT UNNEST(ARRAY[${Prisma.raw(
          dishIds.map((_id) => `'${_id}'`).join(",")
        )}]::uuid[]))
        AND d.deleted_at IS NULL
    `
  );

  const dishes = linkedDishes.map((d) => ({
    id: d.dish_id,
    name: d.dish_name,
    allergens: d.allergens || [],
    dietaryTags: d.dietary_tags || [],
  }));

  // Verify all requested dishes exist
  const foundDishIds = dishes.map((d) => d.id);
  const missingDishIds = dishIds.filter((_id) => !foundDishIds.includes(_id));
  if (missingDishIds.length > 0) {
    return NextResponse.json(
      {
        message: `The following dishes not found: ${missingDishIds.join(", ")}`,
      },
      { status: 404 }
    );
  }

  return dishes;
}

// Helper function to get dishes associated with an event
async function getEventDishes(
  tenantId: string,
  eventId: string
): Promise<
  Array<{
    id: string;
    name: string;
    allergens: string[];
    dietaryTags: string[];
  }>
> {
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
        AND ed.event_id = ${eventId}
        AND d.deleted_at IS NULL
    `
  );

  return linkedDishes.map((d) => ({
    id: d.dish_id,
    name: d.dish_name,
    allergens: d.allergens || [],
    dietaryTags: d.dietary_tags || [],
  }));
}
