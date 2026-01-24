/**
 * Event Contracts Expiring API Endpoint
 *
 * GET /api/events/contracts/expiring - Get contracts expiring soon
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("../../../../lib/invariant");
const tenant_1 = require("../../../../lib/tenant");
/**
 * Parse and validate expiring contracts parameters from URL search params
 */
function parseExpiringContractsParams(searchParams) {
  const days = Math.min(
    Math.max(Number.parseInt(searchParams.get("days") || "30", 10), 1),
    90
  );
  const page = Math.max(
    Number.parseInt(searchParams.get("page") || "1", 10),
    1
  );
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );
  const offset = (page - 1) * limit;
  return { days, page, limit, offset };
}
/**
 * Calculate date range for expiring contracts
 */
function getExpiringDateRange(days) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + days);
  return {
    from: now,
    to: futureDate,
  };
}
/**
 * Build Prisma where clause for expiring contracts
 */
function buildExpiringContractsWhereClause(tenantId, dateRange) {
  return {
    tenantId,
    deletedAt: null,
    status: { in: ["draft", "sent", "viewed"] },
    expiresAt: {
      not: null,
      gte: dateRange.from,
      lte: dateRange.to,
    },
  };
}
/**
 * GET /api/events/contracts/expiring
 * Get contracts expiring soon with pagination
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
    // Parse parameters with validation
    const { days, page, limit, offset } =
      parseExpiringContractsParams(searchParams);
    const dateRange = getExpiringDateRange(days);
    // Build where clause for expiring contracts
    const whereClause = buildExpiringContractsWhereClause(tenantId, dateRange);
    // Fetch contracts
    const contracts = await database_1.database.eventContract.findMany({
      where: whereClause,
      orderBy: [{ expiresAt: "asc" }],
      take: limit,
      skip: offset,
    });
    // Get signature counts for each contract
    const contractIds = contracts.map((c) => c.id);
    const signatureCounts = await database_1.database.contractSignature.groupBy(
      {
        by: ["contractId"],
        where: {
          contractId: { in: contractIds },
          deletedAt: null,
        },
        _count: {
          id: true,
        },
      }
    );
    const signatureCountMap = new Map(
      signatureCounts.map((sc) => [sc.contractId, sc._count.id])
    );
    // Collect all event and client IDs for batch query
    const eventIds = contracts
      .map((c) => c.eventId)
      .filter((id) => id !== null);
    const clientIds = contracts
      .map((c) => c.clientId)
      .filter((id) => id !== null);
    // Batch fetch events and clients
    const events = await database_1.database.event.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: eventIds } }, { deletedAt: null }],
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
      },
    });
    const clients = await database_1.database.client.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: clientIds } }, { deletedAt: null }],
      },
      select: {
        id: true,
        company_name: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
      },
    });
    // Create lookup maps
    const eventMap = new Map(events.map((e) => [e.id, e]));
    const clientMap = new Map(clients.map((c) => [c.id, c]));
    // Build contract list items with event and client details
    const contractListItems = contracts.map((contract) => {
      const event = contract.eventId ? eventMap.get(contract.eventId) : null;
      const client = contract.clientId
        ? clientMap.get(contract.clientId)
        : null;
      return {
        id: contract.id,
        contractNumber: contract.contractNumber,
        title: contract.title,
        status: contract.status,
        clientId: contract.clientId,
        clientName: client
          ? client.company_name ||
            `${client.first_name} ${client.last_name}`.trim()
          : "Unknown Client",
        eventName: event?.title || null,
        eventDate: event?.eventDate ?? null,
        documentType: contract.documentType,
        expiresAt: contract.expiresAt,
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        signatureCount: signatureCountMap.get(contract.id) || 0,
      };
    });
    // Get total count for pagination
    const totalCount = await database_1.database.eventContract.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalCount / limit);
    // Response with business logic information
    const response = {
      data: contractListItems,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    };
    return server_2.NextResponse.json(response);
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error fetching expiring contracts:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
