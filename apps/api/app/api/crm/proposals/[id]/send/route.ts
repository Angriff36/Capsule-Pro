/**
 * Send Proposal API Endpoint
 *
 * POST /api/crm/proposals/[id]/send  - Send proposal to client
 */

import { auth } from "@repo/auth/server";
import { database, type PrismaClient } from "@repo/database";
import { ProposalTemplate, resend } from "@repo/email";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { SendProposalRequest } from "../../types";
import { validateSendProposalRequest } from "../../validation";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type ClientSelect = {
  email: true;
};

type LeadSelect = {
  contactEmail: true;
};

/**
 * Fetch client email
 */
async function fetchClientEmail(
  database: PrismaClient,
  tenantId: string,
  clientId: string | null
): Promise<string | null> {
  if (!clientId) {
    return null;
  }
  const client = await database.client.findFirst({
    where: {
      AND: [{ tenantId }, { id: clientId }, { deletedAt: null }],
    },
    select: { email: true } as ClientSelect,
  });
  return client?.email ?? null;
}

/**
 * Fetch lead email
 */
async function fetchLeadEmail(
  database: PrismaClient,
  tenantId: string,
  leadId: string | null
): Promise<string | null> {
  if (!leadId) {
    return null;
  }
  const lead = await database.lead.findFirst({
    where: {
      AND: [{ tenantId }, { id: leadId }, { deletedAt: null }],
    },
    select: { contactEmail: true } as LeadSelect,
  });
  return lead?.contactEmail ?? null;
}

/**
 * Fetch proposal with relations
 */
async function fetchProposalWithRelations(
  database: PrismaClient,
  tenantId: string,
  id: string
) {
  const proposal = await database.proposal.findFirst({
    where: {
      AND: [{ id }, { tenantId }, { deletedAt: null }],
    },
  });

  if (!proposal) {
    return null;
  }

  const [client, lead, lineItems] = await Promise.all([
    proposal.clientId
      ? database.client.findFirst({
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
        })
      : null,
    proposal.leadId
      ? database.lead.findFirst({
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
        })
      : null,
    database.proposalLineItem.findMany({
      where: { proposalId: proposal.id },
      orderBy: [{ sortOrder: "asc" }],
    }),
  ]);

  return { ...proposal, client, lead, lineItems };
}

/**
 * Calculate total amount from line items
 */
function calculateTotalAmount(
  lineItems: Array<{ quantity: unknown; unitPrice: unknown }>
): string | undefined {
  if (lineItems.length === 0) {
    return undefined;
  }

  const total = lineItems.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(total);
}

/**
 * Determine recipient name from client/lead data
 */
function determineRecipientName(
  client: { first_name?: string | null; company_name?: string | null } | null,
  lead: { contactName?: string | null; companyName?: string | null } | null
): string {
  const clientFirstName = client?.first_name || undefined;
  const clientCompanyName = client?.company_name || undefined;
  const leadContactName = lead?.contactName || undefined;
  const leadCompanyName = lead?.companyName || undefined;

  return (
    clientFirstName ||
    leadContactName ||
    clientCompanyName ||
    leadCompanyName ||
    "Valued Client"
  );
}

/**
 * Update proposal status to sent
 */
async function markProposalSent(
  database: PrismaClient,
  tenantId: string,
  id: string
) {
  await database.proposal.updateMany({
    where: {
      AND: [{ tenantId }, { id }],
    },
    data: {
      status: "sent",
      sentAt: new Date(),
    },
  });
}

/**
 * Send proposal email
 */
async function sendProposalEmail(
  recipientEmail: string,
  recipientName: string,
  proposalTitle: string,
  proposalUrl: string,
  message: string | undefined,
  totalAmount: string | undefined
) {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || "noreply@convoy.com",
      to: recipientEmail,
      subject: `Proposal: ${proposalTitle}`,
      react: ProposalTemplate({
        recipientName,
        proposalTitle,
        proposalUrl,
        message,
        totalAmount,
      }),
    });
  } catch (emailError) {
    console.error("Failed to send proposal email:", emailError);
  }
}

/**
 * POST /api/crm/proposals/[id]/send
 * Send a proposal to the client
 * Updates proposal status to 'sent' and records sentAt timestamp
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = await getTenantIdForOrg(orgId);

    const proposal = await fetchProposalWithRelations(database, tenantId, id);

    if (!proposal) {
      return NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }

    const [clientEmail, leadEmail] = await Promise.all([
      fetchClientEmail(database, tenantId, proposal.clientId),
      fetchLeadEmail(database, tenantId, proposal.leadId),
    ]);

    const rawBody = await request.json().catch(() => ({}));
    validateSendProposalRequest(rawBody);
    const body = rawBody as SendProposalRequest;

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

    await markProposalSent(database, tenantId, id);

    const recipientName = determineRecipientName(
      proposal.client,
      proposal.lead
    );
    const totalAmount = calculateTotalAmount(proposal.lineItems);
    const proposalUrl = `${process.env.APP_URL || "https://app.convoy.com"}/proposals/${id}`;

    await sendProposalEmail(
      recipientEmail,
      recipientName,
      proposal.title,
      proposalUrl,
      body.message,
      totalAmount
    );

    const { client, lead, lineItems } = proposal;

    return NextResponse.json({
      data: { ...proposal, client, lead, lineItems },
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
