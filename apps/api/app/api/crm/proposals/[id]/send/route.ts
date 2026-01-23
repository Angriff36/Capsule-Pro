/**
 * Send Proposal API Endpoint
 *
 * POST /api/crm/proposals/[id]/send  - Send proposal to client
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { validateSendProposalRequest } from "../../validation";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/crm/proposals/[id]/send
 * Send a proposal to the client
 * Updates proposal status to 'sent' and records sentAt timestamp
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);

    // Verify proposal exists and belongs to tenant
    const existingProposal = await database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });

    if (!existingProposal) {
      return NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }

    // Fetch client and lead separately for email
    let clientEmail: string | null = null;
    let leadEmail: string | null = null;

    if (existingProposal.clientId) {
      const client = await database.client.findFirst({
        where: {
          AND: [
            { tenantId },
            { id: existingProposal.clientId },
            { deletedAt: null },
          ],
        },
        select: { email: true },
      });
      clientEmail = client?.email ?? null;
    }

    if (existingProposal.leadId) {
      const lead = await database.lead.findFirst({
        where: {
          AND: [
            { tenantId },
            { id: existingProposal.leadId },
            { deletedAt: null },
          ],
        },
        select: { contactEmail: true },
      });
      leadEmail = lead?.contactEmail ?? null;
    }

    // Validate request body (optional message, custom recipient)
    const body = await request.json().catch(() => ({}));
    validateSendProposalRequest(body);

    // Determine recipient email
    const recipientEmail =
      body.recipientEmail?.trim() || clientEmail || leadEmail;

    if (!recipientEmail) {
      return NextResponse.json(
        {
          message:
            "No recipient email available. Please provide a recipient email.",
        },
        { status: 400 }
      );
    }

    // Update proposal status and record sent timestamp
    await database.proposal.updateMany({
      where: {
        AND: [{ tenantId }, { id }],
      },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });

    // Fetch updated proposal
    const proposal = await database.proposal.findFirst({
      where: {
        AND: [{ tenantId }, { id }],
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found after update" },
        { status: 404 }
      );
    }

    // Fetch client and lead separately for response
    let client: Record<string, unknown> | null = null;
    let lead: Record<string, unknown> | null = null;

    if (proposal.clientId) {
      client = await database.client.findFirst({
        where: {
          AND: [{ tenantId }, { id: proposal.clientId }, { deletedAt: null }],
        },
        select: {
          id: true,
          company_name: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      });
    }

    if (proposal.leadId) {
      lead = await database.lead.findFirst({
        where: {
          AND: [{ tenantId }, { id: proposal.leadId }, { deletedAt: null }],
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
        },
      });
    }

    // Fetch line items separately
    const lineItems = await database.proposal_line_items.findMany({
      where: { proposal_id: proposal.id },
      orderBy: [{ sort_order: "asc" }],
    });

    const proposalWithLineItems = {
      ...proposal,
      client,
      lead,
      lineItems,
    };

    // TODO: Send email with proposal PDF
    // This would integrate with the email package to:
    // 1. Generate PDF from proposal template
    // 2. Send email with PDF attachment to recipientEmail
    // 3. Include custom message if provided
    //
    // Example:
    // await sendProposalEmail({
    //   to: recipientEmail,
    //   proposal,
    //   message: body.message,
    // });

    // Log the action (for now, until email integration is complete)
    console.log(
      `[Proposal Send] Proposal ${id} sent to ${recipientEmail} by user ${userId}`
    );

    return NextResponse.json({
      data: proposalWithLineItems,
      message: "Proposal sent successfully",
      sentTo: recipientEmail,
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Error sending proposal:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
