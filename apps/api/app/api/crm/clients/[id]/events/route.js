/**
 * Client Event History API Endpoints
 *
 * GET /api/crm/clients/[id]/events - Get client's event history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/crm/clients/[id]/events
 * Get event history for a client
 */
async function GET(request, { params }) {
  try {
    const { id } = await params;
    (0, invariant_1.invariant)(id, "params.id must exist");
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { searchParams } = new URL(request.url);
    // Pagination
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    // Verify client exists
    const client = await database_1.database.client.findFirst({
      where: {
        AND: [{ tenantId }, { id }, { deletedAt: null }],
      },
    });
    if (!client) {
      return server_2.NextResponse.json(
        { message: "Client not found" },
        { status: 404 }
      );
    }
    // Get events for this client (Event model has clientId field)
    const events = await database_1.database.event.findMany({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        status: true,
        guestCount: true,
        eventType: true,
        venueName: true,
        createdAt: true,
      },
      orderBy: [{ eventDate: "desc" }],
      take: limit,
      skip: offset,
    });
    // Get total count
    const totalCount = await database_1.database.event.count({
      where: {
        AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
      },
    });
    return server_2.NextResponse.json({
      data: events,
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
    console.error("Error listing client events:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
