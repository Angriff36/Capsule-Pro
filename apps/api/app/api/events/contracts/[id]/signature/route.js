/**
 * Event Contract Signature API Endpoints
 *
 * POST   /api/events/contracts/[id]/signature - Capture new signature
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
// Email regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * Validate create signature request body
 */
function validateCreateSignatureRequest(data) {
  (0, invariant_1.invariant)(data, "Request body is required");
  const body = data;
  (0, invariant_1.invariant)(body.signatureData, "signatureData is required");
  (0, invariant_1.invariant)(body.signerName, "signerName is required");
  // Validate signatureData is not empty
  (0, invariant_1.invariant)(
    body.signatureData.trim().length > 0,
    "signatureData cannot be empty"
  );
  // Validate signerName is not empty
  (0, invariant_1.invariant)(
    body.signerName.trim().length > 0,
    "signerName cannot be empty"
  );
  // Validate email format if provided
  if (body.signerEmail) {
    (0, invariant_1.invariant)(
      EMAIL_REGEX.test(body.signerEmail),
      "signerEmail must be a valid email address"
    );
  }
}
/**
 * POST /api/events/contracts/[id]/signature
 * Capture new signature for a contract
 */
async function POST(request, { params }) {
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
    const body = await request.json();
    // Validate request body
    validateCreateSignatureRequest(body);
    const signatureData = body;
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
    // Check if contract is already signed
    if (contract.status === "signed") {
      return server_2.NextResponse.json(
        { message: "Contract is already signed" },
        { status: 400 }
      );
    }
    // Create the signature
    const signature = await database_1.database.contractSignature.create({
      data: {
        tenantId,
        contractId,
        signatureData: signatureData.signatureData,
        signerName: signatureData.signerName.trim(),
        signerEmail: signatureData.signerEmail?.trim() || null,
        ipAddress: signatureData.ipAddress || null,
      },
    });
    // Auto-update contract status to 'signed' after signature
    await database_1.database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      data: {
        status: "signed",
        updatedAt: new Date(),
      },
    });
    // Fetch contract details for the response
    const updatedContract = await database_1.database.eventContract.findFirst({
      where: {
        tenantId,
        id: contractId,
      },
      select: {
        id: true,
        title: true,
        status: true,
      },
    });
    return server_2.NextResponse.json(
      {
        data: {
          ...signature,
          contractId,
          contractTitle: updatedContract?.title || "Contract",
        },
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
    console.error("Error creating signature:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
