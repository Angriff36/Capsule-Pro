/**
 * Send Proposal API Endpoint
 *
 * POST /api/crm/proposals/[id]/send  - Send proposal to client
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { ProposalTemplate, resend } from "@repo/email";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { SendProposalRequest } from "../../types";
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
    const rawBody = await request.json().catch(() => ({}));
    validateSendProposalRequest(rawBody);
    const body = rawBody as SendProposalRequest;

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
    const lineItems = await database.proposalLineItem.findMany({
      where: { proposalId: proposal.id },
      orderBy: [{ sortOrder: "asc" }],
    });

    const proposalWithLineItems = {
      ...proposal,
      client,
      lead,
      lineItems,
    };

    // Send email with proposal link
    const proposalUrl = `${process.env.APP_URL || "https://app.convoy.com"}/proposals/${id}`;
    const clientFirstName = client?.first_name as string | undefined;
    const clientCompanyName = client?.company_name as string | undefined;
    const leadContactName = lead?.contactName as string | undefined;
    const leadCompanyName = lead?.companyName as string | undefined;

    const recipientName =
      clientFirstName ||
      leadContactName ||
      clientCompanyName ||
      leadCompanyName ||
      "Valued Client";

    // Calculate total amount from line items
    const totalAmount =
      lineItems.length > 0
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(
            lineItems.reduce(
              (sum, item) =>
              sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
              0
            )
          )
        : undefined;

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM || "noreply@convoy.com",
        to: recipientEmail,
        subject: `Proposal: ${proposal.title}`,
        react: ProposalTemplate({
          recipientName,
          proposalTitle: proposal.title,
          proposalUrl,
          message: body.message,
          totalAmount,
        }),
      });
    } catch (emailError) {
      console.error("Failed to send proposal email:", emailError);
      // Continue with the response even if email fails
    }

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
