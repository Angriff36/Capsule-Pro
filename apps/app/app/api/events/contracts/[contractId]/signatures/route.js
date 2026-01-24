/**
 * @module ContractSignaturesAPI
 * @intent Handle contract signature creation
 * @responsibility Process signature captures with validation and storage
 * @domain Events
 * @tags contracts, api, signatures
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * POST /api/events/contracts/[contractId]/signatures
 * Create a new signature for a contract
 */
async function POST(request, context) {
  const { contractId } = await context.params;
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
/**
 * GET /api/events/contracts/[contractId]/signatures
 * Get all signatures for a contract
 */
async function GET(request, context) {
  const { contractId } = await context.params;
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  try {
    const signatures = await database_1.database.contractSignature.findMany({
      where: {
        tenantId,
        contractId,
        deletedAt: null,
      },
      orderBy: {
        signedAt: "desc",
      },
    });
    return server_2.NextResponse.json({
      success: true,
      signatures,
    });
  } catch (error) {
    console.error("Error fetching signatures:", error);
    return server_2.NextResponse.json(
      { error: "Failed to fetch signatures" },
      { status: 500 }
    );
  }
}
