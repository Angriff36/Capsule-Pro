/**
 * Event Contract Signatures API Endpoints
 *
 * GET  /api/events/contracts/[id]/signatures - List all signatures for a contract
 * POST /api/events/contracts/[id]/signatures - Create a new signature for a contract
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
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
 * Parse signature filters from URL search params
 */
function parseSignatureFilters(searchParams) {
  const filters = {};
  // Parse signer email filter
  const signerEmail = searchParams.get("signerEmail");
  if (signerEmail) {
    filters.signerEmail = signerEmail;
  }
  // Parse date from filter
  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom) {
    const date = new Date(dateFrom);
    if (!isNaN(date.getTime())) {
      filters.dateFrom = dateFrom;
    }
  }
  // Parse date to filter
  const dateTo = searchParams.get("dateTo");
  if (dateTo) {
    const date = new Date(dateTo);
    if (!isNaN(date.getTime())) {
      filters.dateTo = dateTo;
    }
  }
  return filters;
}
/**
 * Build where clause for signature queries
 */
function buildSignatureWhereClause(tenantId, contractId, filters) {
  const whereClause = {
    AND: [{ tenantId }, { contractId }, { deletedAt: null }],
  };
  // Add signer email filter
  if (filters.signerEmail) {
    whereClause.AND.push({
      signerEmail: {
        contains: filters.signerEmail,
        mode: "insensitive",
      },
    });
  }
  // Add date range filters
  if (filters.dateFrom || filters.dateTo) {
    const dateConditions = [];
    if (filters.dateFrom) {
      dateConditions.push({
        signedAt: { gte: new Date(filters.dateFrom) },
      });
    }
    if (filters.dateTo) {
      dateConditions.push({
        signedAt: { lte: new Date(filters.dateTo) },
      });
    }
    if (dateConditions.length > 0) {
      whereClause.AND.push({
        AND: dateConditions,
      });
    }
  }
  return whereClause;
}
/**
 * GET /api/events/contracts/[id]/signatures
 * List all signatures for a contract
 */
async function GET(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id: contractId } = await params;
    const { searchParams } = new URL(request.url);
    // Parse filters and pagination
    const filters = parseSignatureFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;
    // Verify contract exists and belongs to the tenant
    const contract = await database_1.database.eventContract.findFirst({
      where: {
        tenantId,
        id: contractId,
        deletedAt: null,
      },
    });
    if (!contract) {
      return server_2.NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      );
    }
    // Build where clause for signatures
    const whereClause = buildSignatureWhereClause(
      tenantId,
      contractId,
      filters
    );
    // Fetch signatures with pagination
    const signatures = await database_1.database.contractSignature.findMany({
      where: whereClause,
      orderBy: [{ signedAt: "desc" }],
      take: limit,
      skip: offset,
    });
    // Fetch contract title for response
    const contractDetails = await database_1.database.eventContract.findFirst({
      where: {
        tenantId,
        id: contractId,
      },
      select: {
        title: true,
      },
    });
    // Format response data
    const responseData = signatures.map((signature) => ({
      id: signature.id,
      contractId: signature.contractId,
      signedAt: signature.signedAt,
      signatureData: signature.signatureData,
      signerName: signature.signerName,
      signerEmail: signature.signerEmail,
      ipAddress: signature.ipAddress,
      contractTitle: contractDetails?.title || "Contract",
    }));
    // Get total count for pagination
    const totalCount = await database_1.database.contractSignature.count({
      where: whereClause,
    });
    const totalPages = Math.ceil(totalCount / limit);
    const response = {
      data: responseData,
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
    console.error("Error listing signatures:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
/**
 * POST /api/events/contracts/[id]/signatures
 * Create a new signature for a contract
 */
async function POST(request, { params }) {
  const { id: contractId } = await params;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  try {
    const body = await request.json();
    const { signatureData, signerName, signerEmail } = body;
    // Validate required fields
    if (!(signatureData && signerName)) {
      return server_2.NextResponse.json(
        { error: "Signature data and signer name are required" },
        { status: 400 }
      );
    }
    // Check if contract exists and belongs to tenant
    const contract = await database_1.database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
    });
    if (!contract) {
      return server_2.NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    // Get client IP address
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    // Create signature record
    const signature = await database_1.database.contractSignature.create({
      data: {
        tenantId,
        contractId,
        signatureData,
        signerName,
        signerEmail: signerEmail || null,
        ipAddress,
      },
    });
    return server_2.NextResponse.json({
      success: true,
      signature,
    });
  } catch (error) {
    console.error("Error creating signature:", error);
    return server_2.NextResponse.json(
      { error: "Failed to create signature" },
      { status: 500 }
    );
  }
}
