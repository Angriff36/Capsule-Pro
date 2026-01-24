/**
 * @module EventsAPI
 * @intent List events with pagination and filtering
 * @responsibility Provide paginated list of events for the current tenant
 * @domain Events
 * @tags events, api, list
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
/**
 * Parse and validate event list filters from URL search params
 */
function parseEventFilters(searchParams) {
  const filters = {};
  const status = searchParams.get("status");
  if (status) filters.status = status;
  const eventType = searchParams.get("eventType");
  if (eventType) filters.eventType = eventType;
  const clientId = searchParams.get("clientId");
  if (clientId) filters.clientId = clientId;
  const venueId = searchParams.get("venueId");
  if (venueId) filters.venueId = venueId;
  const search = searchParams.get("search");
  if (search) filters.search = search;
  return filters;
}
/**
 * Parse pagination parameters from URL search params
 */
function parsePaginationParams(searchParams) {
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
async function GET(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { searchParams } = new URL(request.url);
    // Parse filters and pagination
    const filters = parseEventFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;
    // Build where clause
    const whereClause = {
      AND: [{ tenantId }, { deletedAt: null }],
    };
    // Add status filter
    if (filters.status) {
      whereClause.AND = [...whereClause.AND, { status: filters.status }];
    }
    // Add event type filter
    if (filters.eventType) {
      whereClause.AND = [...whereClause.AND, { eventType: filters.eventType }];
    }
    // Add client filter
    if (filters.clientId) {
      whereClause.AND = [...whereClause.AND, { clientId: filters.clientId }];
    }
    // Add venue filter
    if (filters.venueId) {
      whereClause.AND = [...whereClause.AND, { venueId: filters.venueId }];
    }
    // Add search filter (searches in title and venue name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...whereClause.AND,
        {
          OR: [
            { title: { contains: searchLower, mode: "insensitive" } },
            { venueName: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }
    // Fetch events
    const events = await database_1.database.event.findMany({
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
    const totalCount = await database_1.database.event.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalCount / limit);
    return server_2.NextResponse.json({
      data: events,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error listing events:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
