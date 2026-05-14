/**
 * GET /api/crm/deals
 * List all proposals as deals for the CRM pipeline view.
 * Maps proposal statuses to pipeline stages.
 *
 * Pagination policy is centralized in `@/lib/pagination`. Without these
 * clamps a hostile or buggy client could request the entire proposals table
 * (joined to clients + leads) in one round-trip and blow up server memory.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { clampLimit, clampOffset } from "@/lib/pagination";

/**
 * Maps a proposal status to a pipeline stage.
 * - draft      → lead
 * - sent       → qualified
 * - viewed     → proposal
 * - accepted   → negotiation
 * - rejected   → lost
 */
export function proposalStatusToStage(
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

/**
 * List deals (proposals mapped to pipeline stages).
 * Used by both GET /api/crm/deals and GET /api/crm/deals/list.
 */
export async function listDeals(
  tenantId: string,
  limit: number,
  offset: number
) {
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
    take: limit,
    skip: offset,
  });

  // Map proposals to deal shape with pipeline stage
  return proposals.map((proposal) => ({
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
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const deals = await listDeals(tenantId, limit, offset);
    return NextResponse.json({ data: deals, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing deals:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
