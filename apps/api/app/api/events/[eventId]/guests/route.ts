import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/events/[eventId]/guests
 * List all guests for a specific event with pagination
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    invariant(eventId, "params.eventId must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Validate event exists
    const event = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: eventId }, { deletedAt: null }],
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Pagination parameters
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    // Filter by guest name if provided
    const guestName = searchParams.get("guestName");

    const guests = await database.eventGuest.findMany({
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
    const totalCount = await database.eventGuest.count({
      where: {
        AND: [
          { tenantId },
          { eventId },
          { deletedAt: null },
          ...(guestName ? [{ guestName: { contains: guestName } }] : []),
        ],
      },
    });

    return NextResponse.json({
      guests,
      pagination: {
        limit,
        offset,
        total: totalCount,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing guests:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[eventId]/guests
 * Add a new guest to an event
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    invariant(eventId, "params.eventId must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();
    invariant(
      body && typeof body.guestName === "string",
      "body.guestName must be a string"
    );

    const trimmedGuestName = body.guestName.trim();
    invariant(
      trimmedGuestName,
      "body.guestName must be a non-empty string after trimming"
    );

    // Validate that the event exists
    const event = await database.event.findFirst({
      where: {
        AND: [{ tenantId }, { id: eventId }, { deletedAt: null }],
      },
    });

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Check if guest already exists for this event
    const existingGuest = await database.eventGuest.findFirst({
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
      return NextResponse.json(
        { message: "Guest with this name already exists for this event" },
        { status: 409 }
      );
    }

    // Create guest record
    const guest = await database.eventGuest.create({
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

    return NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error creating guest:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
