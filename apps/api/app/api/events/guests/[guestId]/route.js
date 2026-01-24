Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/events/guests/[guestId]
 * Get a single guest by ID
 */
async function GET(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { guestId } = await params;
  const guest = await database_1.database.eventGuest.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });
  if (!guest) {
    return server_2.NextResponse.json(
      { message: "Guest not found" },
      { status: 404 }
    );
  }
  return server_2.NextResponse.json({ guest });
}
/**
 * PUT /api/events/guests/[guestId]
 * Update a guest
 */
async function PUT(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { guestId } = await params;
  const body = await request.json();
  // Validate guest exists and belongs to tenant
  const existingGuest = await database_1.database.eventGuest.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });
  if (!existingGuest) {
    return server_2.NextResponse.json(
      { message: "Guest not found" },
      { status: 404 }
    );
  }
  // Build update data with validation
  const updateData = {};
  if (body.guestName !== undefined) {
    if (
      !body.guestName ||
      typeof body.guestName !== "string" ||
      body.guestName.trim() === ""
    ) {
      return server_2.NextResponse.json(
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
        return server_2.NextResponse.json(
          { message: "Email must be a valid string or null" },
          { status: 400 }
        );
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.guestEmail.trim())) {
        return server_2.NextResponse.json(
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
        return server_2.NextResponse.json(
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
      return server_2.NextResponse.json(
        { message: "Dietary restrictions must be an array" },
        { status: 400 }
      );
    }
    updateData.dietaryRestrictions = body.dietaryRestrictions
      .filter(
        (restriction) =>
          restriction !== null &&
          restriction !== undefined &&
          restriction.toString().trim() !== ""
      )
      .map((restriction) => restriction.toString().trim());
  }
  if (body.allergenRestrictions !== undefined) {
    if (!Array.isArray(body.allergenRestrictions)) {
      return server_2.NextResponse.json(
        { message: "Allergen restrictions must be an array" },
        { status: 400 }
      );
    }
    updateData.allergenRestrictions = body.allergenRestrictions
      .filter(
        (restriction) =>
          restriction !== null &&
          restriction !== undefined &&
          restriction.toString().trim() !== ""
      )
      .map((restriction) => restriction.toString().trim());
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
  const updatedGuest = await database_1.database.eventGuest.update({
    where: {
      tenantId_id: {
        tenantId,
        id: guestId,
      },
    },
    data: updateData,
  });
  return server_2.NextResponse.json({ guest: updatedGuest });
}
/**
 * DELETE /api/events/guests/[guestId]
 * Soft delete a guest
 */
async function DELETE(request, { params }) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { guestId } = await params;
  // Validate guest exists and belongs to tenant
  const existingGuest = await database_1.database.eventGuest.findFirst({
    where: {
      AND: [{ tenantId }, { id: guestId }, { deletedAt: null }],
    },
  });
  if (!existingGuest) {
    return server_2.NextResponse.json(
      { message: "Guest not found" },
      { status: 404 }
    );
  }
  // Soft delete
  await database_1.database.eventGuest.update({
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
  return new server_2.NextResponse(null, { status: 204 });
}
