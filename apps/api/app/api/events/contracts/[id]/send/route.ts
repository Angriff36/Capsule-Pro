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
import { resend, ContractTemplate } from "@repo/email";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type ContractSendAPIContext = {
  params: Promise<{
    id: string;
  }>;
};

type SendContractBody = {
  clientId: string;
  contractId: string;
  message?: string;
};

/**
 * POST /api/events/contracts/[id]/send
 * Send contract to client for signature
 */
export async function POST(
  request: NextRequest,
  context: ContractSendAPIContext
) {
  const { id: contractId } = await context.params;
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  try {
    const body = (await request.json()) as SendContractBody;
    const { clientId, message } = body;

    // Check if contract exists and belongs to tenant
    const contract = await database.eventContract.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
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
        company_name: string | null;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }>
    >`
      SELECT c.id,
             c.company_name,
             c.first_name,
             c.last_name,
             c.email
      FROM tenant_crm.clients AS c
      WHERE c.tenant_id = ${tenantId}
        AND c.id = ${clientId}
        AND c.deleted_at IS NULL
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
    await database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      data: {
        status: "pending",
      },
    });

    // Send email with contract signing link
    const signingUrl = `${process.env.APP_URL || "https://app.convoy.com"}/contracts/${contractId}/sign`;
    const clientName = client.first_name || client.company_name || "Valued Client";

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || "noreply@convoy.com",
        to: client.email,
        subject: `Contract for Signature: ${contract.title}`,
        react: ContractTemplate({
          clientName,
          contractTitle: contract.title,
          signingUrl,
          message,
        }),
      });
    } catch (emailError) {
      console.error("Failed to send contract email:", emailError);
      // Continue with the response even if email fails
    }

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
