/**
 * @module ContractAPI
 * @intent Handle contract CRUD operations - DELETE endpoint
 * @responsibility Process contract deletion with proper validation and soft delete
 * @domain Events
 * @tags contracts, api, delete
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type ContractAPIContext = {
  params: Promise<{
    contractId: string;
  }>;
};

/**
 * DELETE /api/events/contracts/[contractId]
 * Delete a contract (soft delete)
 */
export async function DELETE(
  _request: NextRequest,
  context: ContractAPIContext
) {
  const { contractId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    // Check if contract exists and belongs to tenant
    const contract = await database.event_contracts.findFirst({
      where: {
        tenantId,
        id: contractId,
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Soft delete the contract
    await database.event_contracts.updateMany({
      where: {
        AND: [{ tenantId }, { id: contractId }],
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
