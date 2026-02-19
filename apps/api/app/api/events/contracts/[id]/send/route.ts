/**
 * @module ContractSendAPI
 * @intent Handle sending contracts to clients for signature
 * @responsibility Process send requests, generate signing token, update contract status, send notification
 * @domain Events
 * @tags contracts, api, send
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { ContractTemplate, resend } from "@repo/email";
import { randomUUID } from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ContractSendAPIContext {
  params: Promise<{
    id: string;
  }>;
}

interface SendContractBody {
  clientId: string;
  contractId: string;
  message?: string;
}

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

    // Generate a unique signing token for public access
    const signingToken = randomUUID();

    // Update contract with signing token and set status to pending
    await database.eventContract.update({
      where: {
        tenantId_id: {
          tenantId,
          id: contractId,
        },
      },
      data: {
        status: "pending",
        signingToken,
      },
    });

    // Build the public signing URL
    const appUrl = process.env.APP_URL || "https://app.convoy.com";
    const signingUrl = `${appUrl}/sign/contract/${signingToken}`;
    const clientName =
      client.first_name || client.company_name || "Valued Client";

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
      signingUrl,
    });
  } catch (error) {
    console.error("Error sending contract:", error);
    return NextResponse.json(
      { error: "Failed to send contract" },
      { status: 500 }
    );
  }
}
