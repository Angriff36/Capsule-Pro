/**
 * Venue Event History API Endpoints
 *
 * GET /api/crm/venues/[id]/events - Get all events for a venue
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * GET /api/crm/venues/[id]/events
 * Get event history for a venue
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    invariant(id, "params.id must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse status filter
    const status = searchParams.get("status");
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    // Check if venue exists
    const venue = await database.venue.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });

    if (!venue) {
      return NextResponse.json({ message: "Venue not found" }, { status: 404 });
    }

    // Build where clause for events
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { venueId: id }, { deletedAt: null }],
    };

    // Add status filter if provided
    if (status) {
      (whereClause.AND as Array<Record<string, unknown>>).push({ status });
    }

    // Get events
    const events = await database.event.findMany({
      where: whereClause,
      orderBy: [{ eventDate: "desc" }],
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        eventDate: true,
        eventType: true,
        guestCount: true,
        status: true,
      },
    });

    // Get total count
    const totalCount = await database.event.count({
      where: whereClause,
    });

    return NextResponse.json({
      data: events,
      pagination: {
        total: totalCount,
        limit,
        offset,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error getting venue events:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
