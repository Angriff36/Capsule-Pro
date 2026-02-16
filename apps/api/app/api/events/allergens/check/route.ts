import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "../../../../lib/tenant";

// Define types
interface CheckAllergensRequest {
  eventId: string;
  dishIds?: string[];
}

interface AllergenConflict {
  guestId: string;
  guestName: string;
  dishId: string;
  dishName: string;
  allergens: string[];
  severity: "critical" | "warning";
  type: "allergen_conflict" | "dietary_conflict";
}

interface CheckAllergensResponse {
  conflicts: AllergenConflict[];
  summary: {
    total: number;
    critical: number;
    warning: number;
  };
}

interface GuestDietaryInfo {
  id: string;
  guestName: string;
  dietaryRestrictions: string[] | null;
  allergenRestrictions: string[] | null;
}

interface DishDietaryInfo {
  id: string;
  name: string;
  allergens: string[];
  dietaryTags: string[];
}

interface ConflictCheckResult {
  conflictingAllergens: string[];
  conflictingDietaryTags: string[];
}

// ============ Helper Functions ============

/**
 * Extracts and normalizes guest dietary information
 */
function extractGuestDietaryInfo(guest: GuestDietaryInfo): {
  allergenRestrictions: string[];
  dietaryRestrictions: string[];
} {
  return {
    allergenRestrictions: guest.allergenRestrictions ?? [],
    dietaryRestrictions: guest.dietaryRestrictions ?? [],
  };
}

/**
 * Extracts and normalizes dish allergen and dietary information
 */
function extractDishDietaryInfo(dish: DishDietaryInfo): {
  allergens: string[];
  dietaryTags: string[];
} {
  return {
    allergens: dish.allergens ?? [],
    dietaryTags: dish.dietaryTags ?? [],
  };
}

/**
 * Checks if two strings match (case-insensitive, substring match)
 */
function stringsMatch(str1: string, str2: string): boolean {
  const lower1 = str1.toLowerCase();
  const lower2 = str2.toLowerCase();
  return lower1.includes(lower2) || lower2.includes(lower1);
}

/**
 * Finds matching allergens between guest restrictions and dish allergens
 */
function findMatchingAllergens(
  guestAllergens: readonly string[],
  dishAllergens: readonly string[]
): string[] {
  const matches: string[] = [];

  for (const guestAllergen of guestAllergens) {
    const hasMatch = dishAllergens.some((dishAllergen) =>
      stringsMatch(guestAllergen, dishAllergen)
    );

    if (hasMatch) {
      matches.push(guestAllergen);
    }
  }

  return matches;
}

/**
 * Finds conflicting dietary restrictions between guest and dish
 */
function findConflictingDietaryTags(
  guestRestrictions: readonly string[],
  dishDietaryTags: readonly string[]
): string[] {
  const conflicts: string[] = [];

  for (const restriction of guestRestrictions) {
    const hasConflict = dishDietaryTags.some((dietaryTag) =>
      stringsMatch(restriction, dietaryTag)
    );

    if (hasConflict) {
      conflicts.push(restriction);
    }
  }

  return conflicts;
}

/**
 * Detects conflicts between a guest's restrictions and a dish's attributes
 */
function detectConflicts(
  guest: GuestDietaryInfo,
  dish: DishDietaryInfo
): ConflictCheckResult {
  const guestInfo = extractGuestDietaryInfo(guest);
  const dishInfo = extractDishDietaryInfo(dish);

  const conflictingAllergens = findMatchingAllergens(
    guestInfo.allergenRestrictions,
    dishInfo.allergens
  );

  const conflictingDietaryTags = findConflictingDietaryTags(
    guestInfo.dietaryRestrictions,
    dishInfo.dietaryTags
  );

  return { conflictingAllergens, conflictingDietaryTags };
}

/**
 * Generates conflict objects for allergen conflicts
 */
function generateAllergenConflicts(
  guest: GuestDietaryInfo,
  dish: DishDietaryInfo,
  conflictingAllergens: readonly string[]
): AllergenConflict[] {
  if (conflictingAllergens.length === 0) {
    return [];
  }

  return [
    {
      guestId: guest.id,
      guestName: guest.guestName,
      dishId: dish.id,
      dishName: dish.name,
      allergens: [...conflictingAllergens],
      severity: "critical",
      type: "allergen_conflict",
    },
  ];
}

/**
 * Generates conflict objects for dietary restriction conflicts
 */
function generateDietaryConflicts(
  guest: GuestDietaryInfo,
  dish: DishDietaryInfo,
  conflictingDietaryTags: readonly string[]
): AllergenConflict[] {
  if (conflictingDietaryTags.length === 0) {
    return [];
  }

  return [
    {
      guestId: guest.id,
      guestName: guest.guestName,
      dishId: dish.id,
      dishName: dish.name,
      allergens: [...conflictingDietaryTags],
      severity: "warning",
      type: "dietary_conflict",
    },
  ];
}

/**
 * Generates all conflict warnings for a guest-dish pair
 */
function generateWarnings(
  guest: GuestDietaryInfo,
  dish: DishDietaryInfo,
  conflictResult: ConflictCheckResult
): AllergenConflict[] {
  const allergenConflicts = generateAllergenConflicts(
    guest,
    dish,
    conflictResult.conflictingAllergens
  );

  const dietaryConflicts = generateDietaryConflicts(
    guest,
    dish,
    conflictResult.conflictingDietaryTags
  );

  return [...allergenConflicts, ...dietaryConflicts];
}

/**
 * Calculates summary statistics from conflicts
 */
function calculateSeveritySummary(conflicts: readonly AllergenConflict[]): {
  total: number;
  critical: number;
  warning: number;
} {
  return {
    total: conflicts.length,
    critical: conflicts.filter((c) => c.severity === "critical").length,
    warning: conflicts.filter((c) => c.severity === "warning").length,
  };
}

// ============ Database Query Functions ============

/**
 * Retrieves all dishes for a specific event
 */
async function getEventDishes(
  tenantId: string,
  eventId: string
): Promise<DishDietaryInfo[]> {
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
    allergens: d.allergens ?? [],
    dietaryTags: d.dietary_tags ?? [],
  }));
}

/**
 * Retrieves specific dishes by their IDs
 */
async function getSpecificDishes(
  tenantId: string,
  dishIds: readonly string[]
): Promise<{ dishes: DishDietaryInfo[]; missingIds: string[] }> {
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
        AND d.id IN (SELECT UNNEST(ARRAY[${Prisma.raw(dishIds.map((id) => `'${id}'`).join(","))}]::uuid[]))
        AND d.deleted_at IS NULL
    `
  );

  const dishes = linkedDishes.map((d) => ({
    id: d.dish_id,
    name: d.dish_name,
    allergens: d.allergens ?? [],
    dietaryTags: d.dietary_tags ?? [],
  }));

  const foundDishIds = dishes.map((d) => d.id);
  const missingIds = dishIds.filter((id) => !foundDishIds.includes(id));

  return { dishes, missingIds };
}

/**
 * Checks all guests against all dishes and returns conflicts
 */
function checkAllGuestsAgainstDishes(
  guests: readonly GuestDietaryInfo[],
  dishes: readonly DishDietaryInfo[]
): AllergenConflict[] {
  const conflicts: AllergenConflict[] = [];

  for (const guest of guests) {
    for (const dish of dishes) {
      const conflictResult = detectConflicts(guest, dish);
      const warnings = generateWarnings(guest, dish, conflictResult);
      conflicts.push(...warnings);
    }
  }

  return conflicts;
}

// ============ Main POST Handler ============

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
    const event = await database.event.findFirst({
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
    const guests = await database.eventGuest.findMany({
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
    let dishes: DishDietaryInfo[];
    if (body.dishIds && body.dishIds.length > 0) {
      const { dishes: foundDishes, missingIds } = await getSpecificDishes(
        tenantId,
        body.dishIds
      );

      if (missingIds.length > 0) {
        return NextResponse.json(
          {
            message: `The following dishes not found: ${missingIds.join(", ")}`,
          },
          { status: 404 }
        );
      }

      dishes = foundDishes;
    } else {
      dishes = await getEventDishes(tenantId, body.eventId);
    }

    // Check for conflicts
    const conflicts = checkAllGuestsAgainstDishes(guests, dishes);

    // Create summary
    const summary = calculateSeveritySummary(conflicts);

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
