Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/events/[eventId]/guests
 * List all guests for a specific event with pagination
 */
async function GET(request, { params }) {
  try {
    const { eventId } = await params;
    (0, invariant_1.invariant)(eventId, "params.eventId must exist");
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { searchParams } = new URL(request.url);
    // Validate event exists
    const event = await database_1.database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: eventId }, { deletedAt: null }],
      },
    });
    if (!event) {
      return server_2.NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }
    // Pagination parameters
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    // Filter by guest name if provided
    const guestName = searchParams.get("guestName");
    const guests = await database_1.database.eventGuest.findMany({
      where: {
        AND: [
          { tenantId },
          { eventId },
          { deletedAt: null },
          ...(guestName ? [{ guestName: { contains: guestName } }] : []),
        ],
      },
      orderBy: { guestName: "asc" },
      take: limit,
      skip: offset,
    });
    // Get total count for pagination
    const totalCount = await database_1.database.eventGuest.count({
      where: {
        AND: [
          { tenantId },
          { eventId },
          { deletedAt: null },
          ...(guestName ? [{ guestName: { contains: guestName } }] : []),
        ],
      },
    });
    return server_2.NextResponse.json({
      guests,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error listing guests:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/events/[eventId]/guests
 * Add a new guest to an event
 */
async function POST(request, { params }) {
  try {
    const { eventId } = await params;
    (0, invariant_1.invariant)(eventId, "params.eventId must exist");
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const body = await request.json();
    (0, invariant_1.invariant)(
      body && typeof body.guestName === "string",
      "body.guestName must be a string"
    );
    const trimmedGuestName = body.guestName.trim();
    (0, invariant_1.invariant)(
      trimmedGuestName,
      "body.guestName must be a non-empty string after trimming"
    );
    // Validate that the event exists
    const event = await database_1.database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: eventId }, { deletedAt: null }],
      },
    });
    if (!event) {
      return server_2.NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }
    // Check if guest already exists for this event
    const existingGuest = await database_1.database.eventGuest.findFirst({
      where: {
        AND: [
          { tenantId },
          { eventId },
          { guestName: { equals: trimmedGuestName } },
          { deletedAt: null },
        ],
      },
    });
    if (existingGuest) {
      return server_2.NextResponse.json(
        { message: "Guest with this name already exists for this event" },
        { status: 409 }
      );
    }
    // Create guest record
    const guest = await database_1.database.eventGuest.create({
      data: {
        tenantId,
        eventId,
        guestName: trimmedGuestName,
        guestEmail: body.guestEmail?.trim() || null,
        guestPhone: body.guestPhone?.trim() || null,
        isPrimaryContact: body.isPrimaryContact,
        dietaryRestrictions: body.dietaryRestrictions || [],
        allergenRestrictions: body.allergenRestrictions || [],
        notes: body.notes?.trim() || null,
        specialMealRequired: body.specialMealRequired,
        specialMealNotes: body.specialMealNotes?.trim() || null,
        tableAssignment: body.tableAssignment?.trim() || null,
        mealPreference: body.mealPreference?.trim() || null,
      },
    });
    return server_2.NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error creating guest:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
