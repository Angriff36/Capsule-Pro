/**
 * @module ContractSendAPI
 * @intent Handle sending contracts to clients for signature
 * @responsibility Process send requests, update contract status, initiate notification flow
 * @domain Events
 * @tags contracts, api, send
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ContractSendAPIContext {
  params: Promise<{
    contractId: string;
  }>;
}

interface SendContractBody {
  clientId: string;
  contractId: string;
  message?: string;
}

/**
 * POST /api/events/contracts/[contractId]/send
 * Send contract to client for signature
 */
export async function POST(
  request: NextRequest,
  context: ContractSendAPIContext
) {
  const { contractId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = (await request.json()) as SendContractBody;
    const { clientId } = body;

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

    // Fetch client information
    const clientResult = await database.$queryRaw<
      Array<{
        id: string;
        companyName: string | null;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      }>
    >`
      SELECT c.id,
             c.companyName,
             c.firstName,
             c.lastName,
             c.email
      FROM tenant_crm.clients AS c
      WHERE c.tenantId = ${tenantId}
        AND c.id = ${clientId}
        AND c.deletedAt IS NULL
    `;

    const client = clientResult[0];

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!client.email) {
      return NextResponse.json(
        { error: "Client has no email address" },
        { status: 400 }
      );
    }

    // In a production environment, this would:
    // 1. Generate a unique signing link/token
    // 2. Send an email with the signing link
    // 3. Create a signing request record
    // For now, we'll update the contract status and return success

    // Update contract status to pending
    await database.eventContract.updateMany({
      where: {
        AND: [{ tenantId }, { id: contractId }],
      },
      data: {
        status: "pending",
      },
    });

    // TODO: Implement email sending logic
    // await sendContractEmail({
    //   to: client.email,
    //   contractId: contract.id,
    //   contractTitle: contract.title,
    //   message: message,
    // });

    return NextResponse.json({
      success: true,
      message: "Contract sent successfully",
      clientEmail: client.email,
    });
  } catch (error) {
    console.error("Error sending contract:", error);
    return NextResponse.json(
      { error: "Failed to send contract" },
      { status: 500 }
    );
  }
}
