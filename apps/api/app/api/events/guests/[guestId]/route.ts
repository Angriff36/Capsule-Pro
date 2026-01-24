import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = Promise<{ guestId: string }>;

/**
 * GET /api/events/guests/[guestId]
 * Get a single guest by ID
 */
export async function GET(request: Request, { params }: { params: Params }) {
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
export async function PUT(request: Request, { params }: { params: Params }) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { guestId } = await params;
  const body = await request.json();

  // Validate guest exists and belongs to tenant
  const existingGuest = await database.eventGuest.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });

  if (!existingGuest) {
    return NextResponse.json({ message: "Guest not found" }, { status: 404 });
  }

  // Build update data with validation
  const updateData: any = {};

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
    updateData.guestName = body.guestName.trim();
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
      updateData.guestEmail = body.guestEmail.trim();
    } else {
      updateData.guestEmail = null;
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
      updateData.guestPhone = body.guestPhone.trim();
    } else {
      updateData.guestPhone = null;
    }
  }

  if (body.isPrimaryContact !== undefined) {
    updateData.isPrimaryContact = Boolean(body.isPrimaryContact);
  }

  if (body.dietaryRestrictions !== undefined) {
    if (!Array.isArray(body.dietaryRestrictions)) {
      return NextResponse.json(
        { message: "Dietary restrictions must be an array" },
        { status: 400 }
      );
    }
    updateData.dietaryRestrictions = body.dietaryRestrictions
      .filter(
        (restriction: any) =>
          restriction !== null &&
          restriction !== undefined &&
          restriction.toString().trim() !== ""
      )
      .map((restriction: any) => restriction.toString().trim());
  }

  if (body.allergenRestrictions !== undefined) {
    if (!Array.isArray(body.allergenRestrictions)) {
      return NextResponse.json(
        { message: "Allergen restrictions must be an array" },
        { status: 400 }
      );
    }
    updateData.allergenRestrictions = body.allergenRestrictions
      .filter(
        (restriction: any) =>
          restriction !== null &&
          restriction !== undefined &&
          restriction.toString().trim() !== ""
      )
      .map((restriction: any) => restriction.toString().trim());
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

  // Update guest
  const updatedGuest = await database.eventGuest.update({
    where: {
      tenantId_id: {
        tenantId,
        id: guestId,
      },
    },
    data: updateData,
  });

  return NextResponse.json({ guest: updatedGuest });
}

/**
 * DELETE /api/events/guests/[guestId]
 * Soft delete a guest
 */
export async function DELETE(request: Request, { params }: { params: Params }) {
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
