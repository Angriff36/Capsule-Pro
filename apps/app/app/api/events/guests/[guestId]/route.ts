import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = Promise<{ guestId: string }>;

type GuestUpdateData = {
  guestName?: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  isPrimaryContact?: boolean;
  dietaryRestrictions?: string[];
  allergenRestrictions?: string[];
  notes?: string | null;
  specialMealRequired?: boolean;
  specialMealNotes?: string | null;
  tableAssignment?: string | null;
  mealPreference?: string | null;
};

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
      AND: [{ tenantId: tenantId }, { id: guestId }, { deletedAt: null }],
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
  const existingGuest = await database.event_guests.findFirst({
    where: {
      AND: [{ tenantId: tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });

  if (!existingGuest) {
    return NextResponse.json({ message: "Guest not found" }, { status: 404 });
  }

  // Build update data with validation
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
    if (
      !body.guestName ||
      typeof body.guestName !== "string" ||
      body.guestName.trim() === ""
    ) {
      return NextResponse.json(
        { message: "Guest name is required and cannot be empty" },
        { status: 400 }
      );
    }
    updateData.guest_name = body.guestName.trim();
  }

  if (body.guestEmail !== undefined) {
    if (body.guestEmail !== null) {
      if (
        typeof body.guestEmail !== "string" ||
        body.guestEmail.trim() === ""
      ) {
        return NextResponse.json(
          { message: "Email must be a valid string or null" },
          { status: 400 }
        );
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.guestEmail.trim())) {
        return NextResponse.json(
          { message: "Invalid email format" },
          { status: 400 }
        );
      }
      updateData.guest_email = body.guestEmail.trim();
    } else {
      updateData.guest_email = null;
    }
  }

  if (body.guestPhone !== undefined) {
    if (body.guestPhone !== null) {
      if (
        typeof body.guestPhone !== "string" ||
        body.guestPhone.trim() === ""
      ) {
        return NextResponse.json(
          { message: "Phone must be a valid string or null" },
          { status: 400 }
        );
      }
      updateData.guest_phone = body.guestPhone.trim();
    } else {
      updateData.guest_phone = null;
    }
  }

  if (body.isPrimaryContact !== undefined) {
    updateData.is_primary_contact = Boolean(body.isPrimaryContact);
  }

  if (body.dietaryRestrictions !== undefined) {
    if (!Array.isArray(body.dietaryRestrictions)) {
      return NextResponse.json(
        { message: "Dietary restrictions must be an array" },
        { status: 400 }
      );
    }
    updateData.dietary_restrictions = body.dietaryRestrictions
      .filter(
        (restriction: unknown): restriction is string =>
          typeof restriction === "string" && restriction.trim() !== ""
      )
      .map((restriction: string) => restriction.trim());
  }

  if (body.allergenRestrictions !== undefined) {
    if (!Array.isArray(body.allergenRestrictions)) {
      return NextResponse.json(
        { message: "Allergen restrictions must be an array" },
        { status: 400 }
      );
    }
    updateData.allergen_restrictions = body.allergenRestrictions
      .filter(
        (restriction: unknown): restriction is string =>
          typeof restriction === "string" && restriction.trim() !== ""
      )
      .map((restriction: string) => restriction.trim());
  }

  if (body.notes !== undefined) {
    updateData.notes =
      body.notes === null ? null : body.notes.toString().trim();
  }

  if (body.specialMealRequired !== undefined) {
    updateData.special_meal_required = Boolean(body.specialMealRequired);
  }

  if (body.specialMealNotes !== undefined) {
    updateData.special_meal_notes =
      body.specialMealNotes === null
        ? null
        : body.specialMealNotes.toString().trim();
  }

  if (body.tableAssignment !== undefined) {
    updateData.table_assignment =
      body.tableAssignment === null
        ? null
        : body.tableAssignment.toString().trim();
  }

  if (body.mealPreference !== undefined) {
    updateData.meal_preference =
      body.mealPreference === null
        ? null
        : body.mealPreference.toString().trim();
  }

  // Update guest
  const updatedGuest = await database.event_guests.updateMany({
    where: {
      AND: [
        { tenantId: tenantId },
        { id: guestId },
      ],
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
  const existingGuest = await database.event_guests.findFirst({
    where: {
      AND: [{ tenantId: tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });

  if (!existingGuest) {
    return NextResponse.json({ message: "Guest not found" }, { status: 404 });
  }

  // Soft delete
  await database.event_guests.updateMany({
    where: {
      AND: [
        { tenantId: tenantId },
        { id: guestId },
      ],
    },
    data: {
      deleted_at: new Date(),
    },
  });

  return new NextResponse(null, { status: 204 });
}
