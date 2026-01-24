/**
 * Client CRUD API Endpoints
 *
 * GET    /api/crm/clients      - List clients with pagination and filters
 * POST   /api/crm/clients      - Create a new client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("./validation");
/**
 * GET /api/crm/clients
 * List clients with pagination, search, and filters
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
    const filters = (0, validation_1.parseClientListFilters)(searchParams);
    const { page, limit } = (0, validation_1.parsePaginationParams)(
      searchParams
    );
    const offset = (page - 1) * limit;
    // Build where clause
    const whereClause = {
      AND: [{ tenantId }, { deletedAt: null }],
    };
    // Add search filter (searches company name, individual names, email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...whereClause.AND,
        {
          OR: [
            { company_name: { contains: searchLower, mode: "insensitive" } },
            { first_name: { contains: searchLower, mode: "insensitive" } },
            { last_name: { contains: searchLower, mode: "insensitive" } },
            { email: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }
    // Add tag filter
    if (filters.tags && filters.tags.length > 0) {
      whereClause.AND = [
        ...whereClause.AND,
        { tags: { hasSome: filters.tags } },
      ];
    }
    // Add assignedTo filter
    if (filters.assignedTo) {
      whereClause.AND = [
        ...whereClause.AND,
        { assignedTo: filters.assignedTo },
      ];
    }
    // Add clientType filter
    if (filters.clientType) {
      whereClause.AND = [
        ...whereClause.AND,
        { clientType: filters.clientType },
      ];
    }
    // Add source filter
    if (filters.source) {
      whereClause.AND = [...whereClause.AND, { source: filters.source }];
    }
    // Fetch clients
    const clients = await database_1.database.client.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });
    // Get total count for pagination
    const totalCount = await database_1.database.client.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalCount / limit);
    return server_2.NextResponse.json({
      data: clients,
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
    console.error("Error listing clients:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/crm/clients
 * Create a new client
 */
async function POST(request) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const body = await request.json();
    // Validate request body
    (0, validation_1.validateCreateClientRequest)(body);
    const data = body;
    // Check for duplicate email (if provided)
    if (data.email && data.email.trim()) {
      const existingClient = await database_1.database.client.findFirst({
        where: {
          AND: [
            { tenantId },
            { email: data.email.trim() },
            { deletedAt: null },
          ],
        },
      });
      if (existingClient) {
        return server_2.NextResponse.json(
          { message: "A client with this email already exists" },
          { status: 409 }
        );
      }
    }
    // Determine client type from data
    const clientType =
      data.clientType || (data.company_name ? "company" : "individual");
    // Create client
    const client = await database_1.database.client.create({
      data: {
        tenantId,
        clientType,
        company_name: data.company_name?.trim() || null,
        first_name: data.first_name?.trim() || null,
        last_name: data.last_name?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        website: data.website?.trim() || null,
        addressLine1: data.addressLine1?.trim() || null,
        addressLine2: data.addressLine2?.trim() || null,
        city: data.city?.trim() || null,
        stateProvince: data.stateProvince?.trim() || null,
        postalCode: data.postalCode?.trim() || null,
        countryCode: data.countryCode?.trim() || null,
        defaultPaymentTerms: data.defaultPaymentTerms ?? 30,
        taxExempt: data.taxExempt ?? false,
        taxId: data.taxId?.trim() || null,
        notes: data.notes?.trim() || null,
        tags: data.tags || [],
        source: data.source?.trim() || null,
        assignedTo: data.assignedTo || null,
      },
    });
    return server_2.NextResponse.json({ data: client }, { status: 201 });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error creating client:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
