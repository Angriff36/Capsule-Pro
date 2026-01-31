import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = Promise<{ guestId: string }>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type UpdateGuestData = {
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

function validateGuestName(guestName: unknown): string | null {
  if (!guestName || typeof guestName !== "string" || guestName.trim() === "") {
    return "Guest name is required and cannot be empty";
  }
  return null;
}

function validateGuestEmail(guestEmail: unknown): string | null {
  if (guestEmail !== null) {
    if (typeof guestEmail !== "string" || guestEmail.trim() === "") {
      return "Email must be a valid string or null";
    }
    if (!emailRegex.test(guestEmail.trim())) {
      return "Invalid email format";
    }
  }
  return null;
}

function validateGuestPhone(guestPhone: unknown): string | null {
  if (
    guestPhone !== null &&
    (typeof guestPhone !== "string" || guestPhone.trim() === "")
  ) {
    return "Phone must be a valid string or null";
  }
  return null;
}

function validateDietaryRestrictions(
  dietaryRestrictions: unknown
): string | null {
  if (!Array.isArray(dietaryRestrictions)) {
    return "Dietary restrictions must be an array";
  }
  return null;
}

function validateAllergenRestrictions(
  allergenRestrictions: unknown
): string | null {
  if (!Array.isArray(allergenRestrictions)) {
    return "Allergen restrictions must be an array";
  }
  return null;
}

function sanitizeStringArray(restrictions: unknown[]): string[] {
  return restrictions
    .filter(
      (restriction): restriction is string | number | boolean =>
        restriction !== null &&
        restriction !== undefined &&
        String(restriction).trim() !== ""
    )
    .map((restriction) => String(restriction).trim());
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

  const guest = await database.eventGuest.findFirst({
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

function buildUpdateData(
  body: UpdateGuestData
): NextResponse | UpdateGuestData {
  const updateData: UpdateGuestData = {};

  if (body.guestName !== undefined) {
    const error = validateGuestName(body.guestName);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 }) as any;
    }
    updateData.guestName = body.guestName.trim();
  }

  if (body.guestEmail !== undefined) {
    const error = validateGuestEmail(body.guestEmail);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 }) as any;
    }
    updateData.guestEmail =
      body.guestEmail === null ? null : body.guestEmail.trim();
  }

  if (body.guestPhone !== undefined) {
    const error = validateGuestPhone(body.guestPhone);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 }) as any;
    }
    updateData.guestPhone =
      body.guestPhone === null ? null : body.guestPhone.trim();
  }

  if (body.isPrimaryContact !== undefined) {
    updateData.isPrimaryContact = Boolean(body.isPrimaryContact);
  }

  if (body.dietaryRestrictions !== undefined) {
    const error = validateDietaryRestrictions(body.dietaryRestrictions);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 }) as any;
    }
    updateData.dietaryRestrictions = sanitizeStringArray(
      body.dietaryRestrictions
    );
  }

  if (body.allergenRestrictions !== undefined) {
    const error = validateAllergenRestrictions(body.allergenRestrictions);
    if (error) {
      return NextResponse.json({ message: error }, { status: 400 }) as any;
    }
    updateData.allergenRestrictions = sanitizeStringArray(
      body.allergenRestrictions
    );
  }

  if (body.notes !== undefined) {
    updateData.notes =
      body.notes === null ? null : body.notes.toString().trim();
  }

  if (body.specialMealRequired !== undefined) {
    updateData.specialMealRequired = Boolean(body.specialMealRequired);
  }

  if (body.specialMealNotes !== undefined) {
    updateData.specialMealNotes =
      body.specialMealNotes === null
        ? null
        : body.specialMealNotes.toString().trim();
  }

  if (body.tableAssignment !== undefined) {
    updateData.tableAssignment =
      body.tableAssignment === null
        ? null
        : body.tableAssignment.toString().trim();
  }

  if (body.mealPreference !== undefined) {
    updateData.mealPreference =
      body.mealPreference === null
        ? null
        : body.mealPreference.toString().trim();
  }

  return updateData;
}

export async function PUT(request: Request, { params }: { params: Params }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { guestId } = await params;
  const body = await request.json();

  const existingGuest = await database.eventGuest.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });

  if (!existingGuest) {
    return NextResponse.json({ message: "Guest not found" }, { status: 404 });
  }

  const updateDataOrError = buildUpdateData(body);
  if (updateDataOrError instanceof NextResponse) {
    return updateDataOrError;
  }

  const updatedGuest = await database.eventGuest.update({
    where: {
      tenantId_id: {
        tenantId,
        id: guestId,
      },
    },
    data: updateDataOrError,
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
  const existingGuest = await database.eventGuest.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });

  if (!existingGuest) {
    return NextResponse.json({ message: "Guest not found" }, { status: 404 });
  }

  // Soft delete
  await database.eventGuest.update({
    where: {
      tenantId_id: {
        tenantId,
        id: guestId,
      },
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return new NextResponse(null, { status: 204 });
}
