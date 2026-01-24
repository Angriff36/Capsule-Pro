/**
 * Send Proposal API Endpoint
 *
 * POST /api/crm/proposals/[id]/send  - Send proposal to client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const email_1 = require("@repo/email");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
const validation_1 = require("../../validation");
/**
 * POST /api/crm/proposals/[id]/send
 * Send a proposal to the client
 * Updates proposal status to 'sent' and records sentAt timestamp
 */
async function POST(request, { params }) {
  try {
    const { orgId, userId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const { id } = await params;
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    // Verify proposal exists and belongs to tenant
    const existingProposal = await database_1.database.proposal.findFirst({
      where: {
        AND: [{ id }, { tenantId }, { deletedAt: null }],
      },
    });
    if (!existingProposal) {
      return server_2.NextResponse.json(
        { message: "Proposal not found" },
        { status: 404 }
      );
    }
    // Fetch client and lead separately for email
    let clientEmail = null;
    let leadEmail = null;
    if (existingProposal.clientId) {
      const client = await database_1.database.client.findFirst({
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
      const lead = await database_1.database.lead.findFirst({
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
    (0, validation_1.validateSendProposalRequest)(rawBody);
    const body = rawBody;
    // Determine recipient email
    const recipientEmail =
      body.recipientEmail?.trim() || clientEmail || leadEmail;
    if (!recipientEmail) {
      return server_2.NextResponse.json(
        {
          message:
            "No recipient email available. Please provide a recipient email.",
        },
        { status: 400 }
      );
    }
    // Update proposal status and record sent timestamp
    await database_1.database.proposal.updateMany({
      where: {
        AND: [{ tenantId }, { id }],
      },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });
    // Fetch updated proposal
    const proposal = await database_1.database.proposal.findFirst({
      where: {
        AND: [{ tenantId }, { id }],
      },
    });
    if (!proposal) {
      return server_2.NextResponse.json(
        { message: "Proposal not found after update" },
        { status: 404 }
      );
    }
    // Fetch client and lead separately for response
    let client = null;
    let lead = null;
    if (proposal.clientId) {
      client = await database_1.database.client.findFirst({
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
      lead = await database_1.database.lead.findFirst({
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
    const lineItems = await database_1.database.proposal_line_items.findMany({
      where: { proposal_id: proposal.id },
      orderBy: [{ sort_order: "asc" }],
    });
    const proposalWithLineItems = {
      ...proposal,
      client,
      lead,
      lineItems,
    };
    // Send email with proposal link
    const proposalUrl = `${process.env.APP_URL || "https://app.convoy.com"}/proposals/${id}`;
    const clientFirstName = client?.first_name;
    const clientCompanyName = client?.company_name;
    const leadContactName = lead?.contactName;
    const leadCompanyName = lead?.companyName;
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
                sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
              0
            )
          )
        : undefined;
    try {
      await email_1.resend.emails.send({
        from: process.env.RESEND_FROM || "noreply@convoy.com",
        to: recipientEmail,
        subject: `Proposal: ${proposal.title}`,
        react: (0, email_1.ProposalTemplate)({
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
    return server_2.NextResponse.json({
      data: proposalWithLineItems,
      message: "Proposal sent successfully",
      sentTo: recipientEmail,
    });
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Error sending proposal:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
