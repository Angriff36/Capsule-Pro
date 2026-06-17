import { listEventPlanningDrafts, listProposalDrafts } from "@/app/lib/manifest-client.generated";
/**
 * @module ProposalDetailPage
 * @intent Server component for proposal detail page
 * @responsibility Fetch and display proposal with magic link management
 * @domain Call Planner
 */

import { auth } from "@repo/auth/server";
import { redirect, notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { ProposalDetailClient } from "./proposal-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: Props) {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const { id } = await params;
  if (!(await getTenantIdForOrg(orgId))) redirect("/");

  const proposal = (await listProposalDrafts()).data.find((entry) => entry.id === id) ?? null;

  if (!proposal) {
    notFound();
  }

  // No FK relations in this schema (flat keys) — resolve the source draft
  // with a separate query.
  const draft =
    (await listEventPlanningDrafts()).data.find((entry) => entry.id === proposal.draftId) ??
    null;

  // Serialize for client component
  const serializedProposal = {
    id: proposal.id,
    tenantId: proposal.tenantId,
    draftId: proposal.draftId,
    userId: proposal.userId,
    status: proposal.status,
    version: proposal.version,
    title: proposal.title,
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail,
    clientPhone: proposal.clientPhone,
    eventSummary: (proposal.eventSummary ?? {}) as Record<string, unknown>,
    menuSections: (proposal.menuSections ?? {}) as Record<string, unknown>,
    servicePlan: (proposal.servicePlan ?? {}) as Record<string, unknown>,
    pricingBreakdown: (proposal.pricingBreakdown ?? {}) as Record<
      string,
      unknown
    >,
    timeline: proposal.timeline as Record<string, unknown> | null,
    upgradeOptions: proposal.upgradeOptions as Record<string, unknown> | null,
    visionSummary: proposal.visionSummary,
    notes: proposal.notes,
    nextSteps: proposal.nextSteps,
    templateId: proposal.templateId,
    magicToken: proposal.magicToken,
    magicTokenExpiresAt: proposal.magicTokenExpiresAt
      ? proposal.magicTokenExpiresAt.toISOString()
      : null,
    sentAt: proposal.sentAt ? proposal.sentAt.toISOString() : null,
    sentVia: proposal.sentVia ? proposal.sentVia.split(",") : [],
    viewedAt: proposal.viewedAt ? proposal.viewedAt.toISOString() : null,
    respondedAt: proposal.respondedAt
      ? proposal.respondedAt.toISOString()
      : null,
    depositAmount: Number(proposal.depositAmount),
    depositPaid: proposal.depositPaid,
    htmlContent: proposal.htmlContent,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
    draft: draft
      ? {
          id: draft.id,
          sessionId: draft.sessionId,
          status: draft.status,
          clientName: draft.clientName,
          eventType: draft.eventType,
        }
      : null,
    actions: [],
  };

  return <ProposalDetailClient proposal={serializedProposal} />;
}
