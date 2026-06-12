/**
 * @module ProposalDetailPage
 * @intent Server component for proposal detail page
 * @responsibility Fetch and display proposal with magic link management
 * @domain Call Planner
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
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
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  const proposal = await database.proposalDraft.findFirst({
    where: {
      tenantId,
      id,
      deletedAt: null,
    },
    include: {
      draft: {
        select: {
          id: true,
          sessionId: true,
          status: true,
          clientName: true,
          eventType: true,
        },
      },
    },
  });

  if (!proposal) {
    notFound();
  }

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
    eventSummary: proposal.eventSummary,
    menuSections: proposal.menuSections,
    servicePlan: proposal.servicePlan,
    pricingBreakdown: proposal.pricingBreakdown,
    timeline: proposal.timeline,
    upgradeOptions: proposal.upgradeOptions,
    visionSummary: proposal.visionSummary,
    notes: proposal.notes,
    nextSteps: proposal.nextSteps,
    templateId: proposal.templateId,
    magicToken: proposal.magicToken,
    magicTokenExpiresAt: proposal.magicTokenExpiresAt.toISOString(),
    sentAt: proposal.sentAt?.toISOString(),
    sentVia: proposal.sentVia,
    viewedAt: proposal.viewedAt?.toISOString(),
    respondedAt: proposal.respondedAt?.toISOString(),
    depositAmount: proposal.depositAmount,
    depositPaid: proposal.depositPaid,
    htmlContent: proposal.htmlContent,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
    draft: proposal.draft
      ? {
          id: proposal.draft.id,
          sessionId: proposal.draft.sessionId,
          status: proposal.draft.status,
          clientName: proposal.draft.clientName,
          eventType: proposal.draft.eventType,
        }
      : null,
    actions: await database.proposalAction.findMany({
      where: {
        proposalId: proposal.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        actionType: true,
        clientMessage: true,
        respondedAt: true,
        createdAt: true,
      },
    }),
  };

  return <ProposalDetailClient proposal={serializedProposal} />;
}
