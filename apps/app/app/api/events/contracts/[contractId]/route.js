/**
 * @module ContractAPI
 * @intent Handle contract CRUD operations - DELETE endpoint
 * @responsibility Process contract deletion with proper validation and soft delete
 * @domain Events
 * @tags contracts, api, delete
 * @canonical true
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * DELETE /api/events/contracts/[contractId]
 * Delete a contract (soft delete)
 */
async function DELETE(request, context) {
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
    // Soft delete the contract
    await database_1.database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return server_2.NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return server_2.NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
