/**
 * @module EventsAPI
 * @intent List events with pagination and filtering
 * @responsibility Provide paginated list of events for the current tenant
 * @domain Events
 * @tags events, api, list
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type EventListFilters = {
  status?: string;
  eventType?: string;
  clientId?: string;
  venueId?: string;
  search?: string;
};

type PaginationParams = {
  page: number;
  limit: number;
};

/**
 * Parse and validate event list filters from URL search params
 */
function parseEventFilters(searchParams: URLSearchParams): EventListFilters {
  const filters: EventListFilters = {};

  const status = searchParams.get("status");
  if (status) {
    filters.status = status;
  }

  const eventType = searchParams.get("eventType");
  if (eventType) {
    filters.eventType = eventType;
  }

  const clientId = searchParams.get("clientId");
  if (clientId) {
    filters.clientId = clientId;
  }

  const venueId = searchParams.get("venueId");
  if (venueId) {
    filters.venueId = venueId;
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  return filters;
}

/**
 * Parse pagination parameters from URL search params
 */
function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

/**
 * GET /api/events
 * List events with pagination and filters
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    // Parse filters and pagination
    const filters = parseEventFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    // Add status filter
    if (filters.status) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { status: filters.status },
      ];
    }

    // Add event type filter
    if (filters.eventType) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { eventType: filters.eventType },
      ];
    }

    // Add client filter
    if (filters.clientId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { clientId: filters.clientId },
      ];
    }

    // Add venue filter
    if (filters.venueId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { venueId: filters.venueId },
      ];
    }

    // Add search filter (searches in title and venue name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        {
          OR: [
            { title: { contains: searchLower, mode: "insensitive" } },
            { venueName: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }

    // Fetch events
    const events = await database.event.findMany({
      where: whereClause,
      select: {
        id: true,
        eventNumber: true,
        title: true,
        eventType: true,
        eventDate: true,
        guestCount: true,
        status: true,
        venueName: true,
        venueAddress: true,
        locationId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.event.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: events,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error listing events:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
