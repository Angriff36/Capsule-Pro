/**
 * @module DraftDetailPage
 * @intent Server component for draft detail page
 * @responsibility Fetch and display draft with extracted details for review
 * @domain Call Planner
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { redirect, notFound } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { DraftDetailClient } from "./draft-detail-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DraftDetailPage({ params }: Props) {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const { id } = await params;
  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  const draft = await database.eventPlanningDraft.findFirst({
    where: {
      tenantId,
      id,
      deletedAt: null,
    },
    include: {
      session: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,
          transcriptText: true,
        },
      },
      extractedDetails: {
        select: {
          id: true,
          fieldName: true,
          rawValue: true,
          normalizedValue: true,
          confidence: true,
          sourceQuote: true,
          status: true,
          catalogMatchType: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!draft) {
    notFound();
  }

  // Serialize for client component
  const serializedDraft = {
    id: draft.id,
    tenantId: draft.tenantId,
    sessionId: draft.sessionId,
    userId: draft.userId,
    status: draft.status,
    clientName: draft.clientName,
    clientContactId: draft.clientContactId,
    eventType: draft.eventType,
    eventDate: draft.eventDate?.toISOString(),
    eventTime: draft.eventTime,
    guestCount: draft.guestCount,
    guestCountMin: draft.guestCountMin,
    guestCountMax: draft.guestCountMax,
    venuePreference: draft.venuePreference,
    venueId: draft.venueId,
    serviceStyle: draft.serviceStyle,
    dietaryRestrictions: draft.dietaryRestrictions,
    menuPreferences: draft.menuPreferences,
    budgetMin: draft.budgetMin,
    budgetMax: draft.budgetMax,
    packageIds: draft.packageIds,
    addOnIds: draft.addOnIds,
    customItems: draft.customItems,
    timelineNotes: draft.timelineNotes,
    openQuestions: draft.openQuestions,
    specialNotes: draft.specialNotes,
    aiSummary: draft.aiSummary,
    overallConfidence: draft.overallConfidence,
    convertedEventId: draft.convertedEventId,
    proposalId: draft.proposalId,
    expiresAt: draft.expiresAt?.toISOString(),
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    session: draft.session
      ? {
          id: draft.session.id,
          status: draft.session.status,
          startedAt: draft.session.startedAt.toISOString(),
          endedAt: draft.session.endedAt?.toISOString(),
          transcriptText: draft.session.transcriptText,
        }
      : null,
    extractedDetails: draft.extractedDetails.map((ed) => ({
      id: ed.id,
      fieldName: ed.fieldName,
      rawValue: ed.rawValue,
      normalizedValue: ed.normalizedValue,
      confidence: ed.confidence,
      sourceQuote: ed.sourceQuote,
      status: ed.status,
      catalogMatchType: ed.catalogMatchType,
      createdAt: ed.createdAt.toISOString(),
    })),
  };

  return <DraftDetailClient draft={serializedDraft} />;
}
