/**
 * GET /api/crm/deals
 * List all proposals as deals for the CRM pipeline view.
 * Maps proposal statuses to pipeline stages.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextResponse } from "next/server";
import { NextResponse as NextResponseAlias } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Maps a proposal status to a pipeline stage.
 * - draft      → lead
 * - sent       → qualified
 * - viewed     → proposal
 * - accepted   → negotiation
 * - rejected   → lost
 */
function proposalStatusToStage(
  status: string,
  eventId: string | null
): string {
  switch (status) {
    case "draft":
      return "lead";
    case "sent":
      return "qualified";
    case "viewed":
      return "proposal";
    case "accepted":
      // If accepted and has an event, it's won; otherwise negotiation
      return eventId ? "won" : "negotiation";
    case "rejected":
      return "lost";
    default:
      return "lead";
  }
}

export async function GET() {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponseAlias.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponseAlias.json({ message: "Tenant not found" }, { status: 400 });
    }

    const proposals = await database.proposal.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
          },
        },
        lead: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Map proposals to deal shape with pipeline stage
    const deals = proposals.map((proposal) => ({
      id: proposal.id,
      proposalNumber: proposal.proposalNumber,
      title: proposal.title,
      // Pipeline stage derived from proposal status
      stage: proposalStatusToStage(proposal.status, proposal.eventId),
      // Keep original proposal status for reference
      proposalStatus: proposal.status,
      total: proposal.total,
      eventDate: proposal.eventDate,
      guestCount: proposal.guestCount,
      clientId: proposal.clientId,
      leadId: proposal.leadId,
      client: proposal.client
        ? {
            id: proposal.client.id,
            companyName: proposal.client.company_name,
            firstName: proposal.client.first_name,
            lastName: proposal.client.last_name,
          }
        : null,
      lead: proposal.lead
        ? {
            id: proposal.lead.id,
            companyName: proposal.lead.companyName,
            contactName: proposal.lead.contactName,
          }
        : null,
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    }));

    return NextResponseAlias.json({ data: deals });
  } catch (error) {
    console.error("Error listing deals:", error);
    return NextResponseAlias.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
