import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = Promise<{ guestId: string }>;

// Email validation regex - moved to top level for performance
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Helper function to validate guest exists
 */
async function validateGuestExists(guestId: string, tenantId: string) {
  const guest = await database.event_guests.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });

  if (!guest) {
    throw new Error("Guest not found");
  }

  return guest;
}

/**
 * Helper function to validate and process name
 */
function validateAndProcessName(name: unknown) {
  if (!name || typeof name !== "string" || name.trim() === "") {
    throw new Error("Guest name is required and cannot be empty");
  }
  return name.trim();
}

/**
 * Helper function to validate and process email
 */
function validateAndProcessEmail(email: unknown) {
  if (email === null) {
    return null;
  }

  if (typeof email !== "string" || email.trim() === "") {
    throw new Error("Email must be a valid string or null");
  }

  if (!emailRegex.test(email.trim())) {
    throw new Error("Invalid email format");
  }

  return email.trim();
}

/**
 * Helper function to validate and process phone
 */
function validateAndProcessPhone(phone: unknown) {
  if (phone === null) {
    return null;
  }

  if (typeof phone !== "string" || phone.trim() === "") {
    throw new Error("Phone must be a valid string or null");
  }

  return phone.trim();
}

/**
 * Helper function to validate and process array restrictions
 */
function validateAndProcessRestrictions(restrictions: unknown) {
  if (!Array.isArray(restrictions)) {
    throw new Error("Restrictions must be an array");
  }

  return restrictions
    .filter(
      (restriction: unknown): restriction is string =>
        typeof restriction === "string" && restriction.trim() !== ""
    )
    .map((restriction: string) => restriction.trim());
}

/**
 * Helper function to process text fields that can be null
 */
function processTextField(field: unknown) {
  if (field === null) {
    return null;
  }
  return field?.toString().trim();
}

/**
 * Helper function to validate and build update data
 */
function buildUpdateData(body: {
  guestName?: unknown;
  guestEmail?: unknown;
  guestPhone?: unknown;
  isPrimaryContact?: unknown;
  dietaryRestrictions?: unknown;
  allergenRestrictions?: unknown;
  notes?: unknown;
  specialMealRequired?: unknown;
  specialMealNotes?: unknown;
  tableAssignment?: unknown;
  mealPreference?: unknown;
}) {
  const updateData: {
    guest_name?: string;
    guest_email?: string | null;
    guest_phone?: string | null;
    is_primary_contact?: boolean;
    dietary_restrictions?: string[];
    allergen_restrictions?: string[];
    notes?: string | null;
    special_meal_required?: boolean;
    special_meal_notes?: string | null;
    table_assignment?: string | null;
    meal_preference?: string | null;
  } = {};

  if (body.guestName !== undefined) {
    updateData.guest_name = validateAndProcessName(body.guestName);
  }

  if (body.guestEmail !== undefined) {
    updateData.guest_email = validateAndProcessEmail(body.guestEmail);
  }

  if (body.guestPhone !== undefined) {
    updateData.guest_phone = validateAndProcessPhone(body.guestPhone);
  }

  if (body.isPrimaryContact !== undefined) {
    updateData.is_primary_contact = Boolean(body.isPrimaryContact);
  }

  if (body.dietaryRestrictions !== undefined) {
    updateData.dietary_restrictions = validateAndProcessRestrictions(
      body.dietaryRestrictions
    );
  }

  if (body.allergenRestrictions !== undefined) {
    updateData.allergen_restrictions = validateAndProcessRestrictions(
      body.allergenRestrictions
    );
  }

  if (body.notes !== undefined) {
    updateData.notes = processTextField(body.notes);
  }

  if (body.specialMealRequired !== undefined) {
    updateData.special_meal_required = Boolean(body.specialMealRequired);
  }

  if (body.specialMealNotes !== undefined) {
    updateData.special_meal_notes = processTextField(body.specialMealNotes);
  }

  if (body.tableAssignment !== undefined) {
    updateData.table_assignment = processTextField(body.tableAssignment);
  }

  if (body.mealPreference !== undefined) {
    updateData.meal_preference = processTextField(body.mealPreference);
  }

  return updateData;
}

/**
 * GET /api/events/guests/[guestId]
 * Get a single guest by ID
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { guestId } = await params;

  const guest = await database.event_guests.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });

  if (!guest) {
    return NextResponse.json({ message: "Guest not found" }, { status: 404 });
  }

  return NextResponse.json({ guest });
}

/**
 * PUT /api/events/guests/[guestId]
 * Update a guest
 */
export async function PUT(request: Request, { params }: { params: Params }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { guestId } = await params;
  const body = await request.json();

  // Validate guest exists and belongs to tenant
  await validateGuestExists(guestId, tenantId);

  // Build update data with validation
  let updateData: {
    guest_name?: string;
    guest_email?: string | null;
    guest_phone?: string | null;
    is_primary_contact?: boolean;
    dietary_restrictions?: string[];
    allergen_restrictions?: string[];
    notes?: string | null;
    special_meal_required?: boolean;
    special_meal_notes?: string | null;
    table_assignment?: string | null;
    meal_preference?: string | null;
  };
  try {
    updateData = buildUpdateData(body);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Invalid data" },
      { status: 400 }
    );
  }

  // Update guest
  const updatedGuest = await database.event_guests.updateMany({
    where: {
      AND: [{ tenantId }, { id: guestId }],
    },
    data: updateData,
  });

  return NextResponse.json({ guest: updatedGuest });
}

/**
 * DELETE /api/events/guests/[guestId]
 * Soft delete a guest
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { guestId } = await params;

  // Validate guest exists and belongs to tenant
  await validateGuestExists(guestId, tenantId);

  // Soft delete
  await database.event_guests.updateMany({
    where: {
      AND: [{ tenantId }, { id: guestId }],
    },
    data: {
      deleted_at: new Date(),
    },
  });

  return new NextResponse(null, { status: 204 });
}
