import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = Promise<{ guestId: string }>;

// Top-level regex for performance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationResult =
  | { success: true; data: UpdateGuestData }
  | { success: false; error: string };

interface UpdateGuestData {
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
}

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
    if (!EMAIL_REGEX.test(guestEmail.trim())) {
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
 * Helper to validate and set optional string fields
 */
function setOptionalStringField(
  updateData: UpdateGuestData,
  key: keyof UpdateGuestData,
  value: string | null | undefined
): void {
  if (value === undefined) {
    return;
  }
  // Use Object.assign to handle the assignment of union types in a type-safe way
  Object.assign(updateData, {
    [key]: value === null ? null : value.toString().trim(),
  });
}

/**
 * Helper to validate and set fields with validation
 */
function setValidatedField<T>(
  updateData: UpdateGuestData,
  key: keyof UpdateGuestData,
  value: T | undefined,
  validator: (v: T) => string | null,
  transformer?: (v: T) => UpdateGuestData[keyof UpdateGuestData]
): ValidationResult | null {
  if (value === undefined) {
    return null;
  }
  const error = validator(value);
  if (error) {
    return { success: false, error };
  }
  // Use Object.assign to handle the assignment of union types in a type-safe way
  const result = transformer
    ? transformer(value)
    : (value as UpdateGuestData[keyof UpdateGuestData]);
  Object.assign(updateData, { [key]: result });
  return null;
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

function buildUpdateData(body: UpdateGuestData): ValidationResult {
  const updateData: UpdateGuestData = {};

  // Validate and set required fields
  let error = setValidatedField(
    updateData,
    "guestName",
    body.guestName,
    validateGuestName,
    (v) => v.trim()
  );
  if (error) {
    return error;
  }

  error = setValidatedField(
    updateData,
    "guestEmail",
    body.guestEmail,
    validateGuestEmail,
    (v) => (v === null ? null : (v.trim() as UpdateGuestData["guestEmail"]))
  );
  if (error) {
    return error;
  }

  error = setValidatedField(
    updateData,
    "guestPhone",
    body.guestPhone,
    validateGuestPhone,
    (v) => (v === null ? null : (v.trim() as UpdateGuestData["guestPhone"]))
  );
  if (error) {
    return error;
  }

  error = setValidatedField(
    updateData,
    "dietaryRestrictions",
    body.dietaryRestrictions,
    validateDietaryRestrictions,
    sanitizeStringArray as (
      v: unknown
    ) => UpdateGuestData["dietaryRestrictions"]
  );
  if (error) {
    return error;
  }

  error = setValidatedField(
    updateData,
    "allergenRestrictions",
    body.allergenRestrictions,
    validateAllergenRestrictions,
    sanitizeStringArray as (
      v: unknown
    ) => UpdateGuestData["allergenRestrictions"]
  );
  if (error) {
    return error;
  }

  // Set optional boolean fields
  if (body.isPrimaryContact !== undefined) {
    updateData.isPrimaryContact = Boolean(body.isPrimaryContact);
  }
  if (body.specialMealRequired !== undefined) {
    updateData.specialMealRequired = Boolean(body.specialMealRequired);
  }

  // Set optional string fields (no validation)
  setOptionalStringField(updateData, "notes", body.notes);
  setOptionalStringField(updateData, "specialMealNotes", body.specialMealNotes);
  setOptionalStringField(updateData, "tableAssignment", body.tableAssignment);
  setOptionalStringField(updateData, "mealPreference", body.mealPreference);

  return { success: true, data: updateData };
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

  const validationResult = buildUpdateData(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { message: validationResult.error },
      { status: 400 }
    );
  }

  const updatedGuest = await database.eventGuest.update({
    where: {
      tenantId_id: {
        tenantId,
        id: guestId,
      },
    },
    data: validationResult.data,
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
