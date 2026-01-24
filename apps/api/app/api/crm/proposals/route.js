/**
 * Proposal CRUD API Endpoints
 *
 * GET    /api/crm/proposals      - List proposals with pagination and filters
 * POST   /api/crm/proposals      - Create a new proposal
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
 * GET /api/crm/proposals
 * List proposals with pagination, search, and filters
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
    const filters = (0, validation_1.parseProposalFilters)(searchParams);
    const { page, limit } = (0, validation_1.parsePaginationParams)(
      searchParams
    );
    const offset = (page - 1) * limit;
    // Build where clause
    const whereClause = {
      AND: [{ tenantId }, { deletedAt: null }],
    };
    // Add search filter (searches title, proposal number, venue)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...whereClause.AND,
        {
          OR: [
            { title: { contains: searchLower, mode: "insensitive" } },
            { proposalNumber: { contains: searchLower, mode: "insensitive" } },
            { venueName: { contains: searchLower, mode: "insensitive" } },
          ],
        },
      ];
    }
    // Add status filter
    if (filters.status) {
      whereClause.AND = [...whereClause.AND, { status: filters.status }];
    }
    // Add client filter
    if (filters.clientId) {
      whereClause.AND = [...whereClause.AND, { clientId: filters.clientId }];
    }
    // Add lead filter
    if (filters.leadId) {
      whereClause.AND = [...whereClause.AND, { leadId: filters.leadId }];
    }
    // Add event filter
    if (filters.eventId) {
      whereClause.AND = [...whereClause.AND, { eventId: filters.eventId }];
    }
    // Add date range filters
    if (filters.dateFrom) {
      whereClause.AND = [
        ...whereClause.AND,
        { eventDate: { gte: new Date(filters.dateFrom) } },
      ];
    }
    if (filters.dateTo) {
      whereClause.AND = [
        ...whereClause.AND,
        { eventDate: { lte: new Date(filters.dateTo) } },
      ];
    }
    // Fetch proposals
    const proposals = await database_1.database.proposal.findMany({
      where: whereClause,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });
    // Collect all client and lead IDs for batch query
    const clientIds = proposals
      .map((p) => p.clientId)
      .filter((id) => id !== null);
    const leadIds = proposals.map((p) => p.leadId).filter((id) => id !== null);
    // Batch fetch clients and leads
    const clients = await database_1.database.client.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: clientIds } }, { deletedAt: null }],
      },
      select: {
        id: true,
        company_name: true,
        first_name: true,
        last_name: true,
      },
    });
    const leads = await database_1.database.lead.findMany({
      where: {
        AND: [{ tenantId }, { id: { in: leadIds } }, { deletedAt: null }],
      },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        contactEmail: true,
      },
    });
    // Create lookup maps
    const clientMap = new Map(clients.map((c) => [c.id, c]));
    const leadMap = new Map(leads.map((l) => [l.id, l]));
    // Fetch line items separately for each proposal
    const proposalsWithLineItems = await Promise.all(
      proposals.map(async (proposal) => {
        const lineItems =
          await database_1.database.proposal_line_items.findMany({
            where: { proposal_id: proposal.id },
            orderBy: [{ sort_order: "asc" }],
          });
        return {
          ...proposal,
          client: proposal.clientId
            ? clientMap.get(proposal.clientId) || null
            : null,
          lead: proposal.leadId ? leadMap.get(proposal.leadId) || null : null,
          lineItems,
        };
      })
    );
    // Get total count for pagination
    const totalCount = await database_1.database.proposal.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalCount / limit);
    return server_2.NextResponse.json({
      data: proposalsWithLineItems,
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
    console.error("Error listing proposals:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/crm/proposals
 * Create a new proposal
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
    (0, validation_1.validateCreateProposalRequest)(body);
    const data = body;
    // Generate proposal number (PROP-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = await database_1.database.proposal.count({
      where: {
        AND: [
          { tenantId },
          { proposalNumber: { startsWith: `PROP-${year}` } },
          { deletedAt: null },
        ],
      },
    });
    const proposalNumber = `PROP-${year}-${String(count + 1).padStart(4, "0")}`;
    // Calculate totals if line items provided
    let calculatedSubtotal = data.subtotal ?? 0;
    let calculatedTax = data.taxAmount ?? 0;
    let calculatedTotal = data.total ?? 0;
    if (data.lineItems && data.lineItems.length > 0) {
      calculatedSubtotal = data.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const taxRate = data.taxRate ?? 0;
      calculatedTax = calculatedSubtotal * (taxRate / 100);
      const discount = data.discountAmount ?? 0;
      calculatedTotal = calculatedSubtotal + calculatedTax - discount;
    }
    // Create proposal
    const proposal = await database_1.database.proposal.create({
      data: {
        tenantId,
        proposalNumber,
        clientId: data.clientId,
        leadId: data.leadId,
        eventId: data.eventId,
        title: data.title.trim(),
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        eventType: data.eventType?.trim() || null,
        guestCount: data.guestCount ?? null,
        venueName: data.venueName?.trim() || null,
        venueAddress: data.venueAddress?.trim() || null,
        subtotal: new database_1.Prisma.Decimal(calculatedSubtotal),
        taxRate: new database_1.Prisma.Decimal(data.taxRate ?? 0),
        taxAmount: new database_1.Prisma.Decimal(calculatedTax),
        discountAmount: new database_1.Prisma.Decimal(data.discountAmount ?? 0),
        total: new database_1.Prisma.Decimal(calculatedTotal),
        status: data.status ?? "draft",
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes?.trim() || null,
        termsAndConditions: data.termsAndConditions?.trim() || null,
      },
    });
    // Fetch client and lead separately
    let client = null;
    let lead = null;
    if (proposal.clientId) {
      client = await database_1.database.client.findFirst({
        where: {
          AND: [{ tenantId }, { id: proposal.clientId }, { deletedAt: null }],
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
    }
    if (proposal.leadId) {
      lead = await database_1.database.lead.findFirst({
        where: {
          AND: [{ tenantId }, { id: proposal.leadId }, { deletedAt: null }],
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
        },
      });
    }
    // Create line items in a transaction
    if (data.lineItems && data.lineItems.length > 0) {
      await database_1.database.$transaction(async (tx) => {
        await tx.proposal_line_items.createMany({
          data: data.lineItems.map((item, index) => ({
            proposal_id: proposal.id,
            tenant_id: tenantId,
            sort_order: item.sortOrder ?? index,
            item_type: item.itemType.trim(),
            description: item.description.trim(),
            quantity: new database_1.Prisma.Decimal(item.quantity),
            unit_price: new database_1.Prisma.Decimal(item.unitPrice),
            total: new database_1.Prisma.Decimal(
              item.total ?? item.quantity * item.unitPrice
            ),
            notes: item.notes?.trim() || null,
          })),
        });
      });
    }
    return server_2.NextResponse.json(
      {
        data: { ...proposal, client, lead },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error creating proposal:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
