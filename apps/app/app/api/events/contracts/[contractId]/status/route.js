/**
 * @module ContractStatusAPI
 * @intent Handle contract status updates
 * @responsibility Process status change requests with validation
 * @domain Events
 * @tags contracts, api, status
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * PATCH /api/events/contracts/[contractId]/status
 * Update contract status
 */
async function PATCH(request, context) {
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
    const { status } = body;
    // Validate status
    const validStatuses = [
      "draft",
      "pending",
      "signed",
      "expired",
      "cancelled",
    ];
    if (!(status && validStatuses.includes(status))) {
      return server_2.NextResponse.json(
        { error: "Invalid status value" },
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
    // Update contract status
    const updatedContract = await database_1.database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      data: {
        status,
      },
    });
    return server_2.NextResponse.json({
      success: true,
      contract: updatedContract,
    });
  } catch (error) {
    console.error("Error updating contract status:", error);
    return server_2.NextResponse.json(
      { error: "Failed to update contract status" },
      { status: 500 }
    );
  }
}
