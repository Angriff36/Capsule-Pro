/**
 * @module ContractStatusAPI
 * @intent Handle contract status updates
 * @responsibility Process status change requests with validation
 * @domain Events
 * @tags contracts, api, status
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ContractStatusAPIContext {
  params: Promise<{
    contractId: string;
  }>;
}

interface StatusUpdateBody {
  status: "draft" | "pending" | "signed" | "expired" | "cancelled";
}

/**
 * PATCH /api/events/contracts/[contractId]/status
 * Update contract status
 */
export async function PATCH(
  request: NextRequest,
  context: ContractStatusAPIContext
) {
  const { contractId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = (await request.json()) as StatusUpdateBody;
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
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Check if contract exists and belongs to tenant
    const contract = await database.eventContract.findFirst({
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

    // Update contract status
    const updatedContract = await database.eventContract.update({
      where: {
        tenantId_id: { tenantId, id: contractId },
      },
      data: {
        status,
      },
    });

    return NextResponse.json({
      success: true,
      contract: updatedContract,
    });
  } catch (error) {
    console.error("Error updating contract status:", error);
    return NextResponse.json(
      { error: "Failed to update contract status" },
      { status: 500 }
    );
  }
}
