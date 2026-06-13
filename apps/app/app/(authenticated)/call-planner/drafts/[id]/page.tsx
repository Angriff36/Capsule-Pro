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
  });

  if (!draft) {
    notFound();
  }

  // No FK relations in this schema (flat keys) — resolve session + extracted
  // details with separate queries.
  const [session, extractedDetails] = await Promise.all([
    database.callPlanningSession.findFirst({
      where: { tenantId, id: draft.sessionId, deletedAt: null },
      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,
        transcriptText: true,
      },
    }),
    database.extractedDetail.findMany({
      where: { tenantId, draftId: draft.id, deletedAt: null },
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
    }),
  ]);

  // Stored confidence is a label ("high"/"medium"/"low"); the client works
  // with the numeric scale the extractor uses for overallConfidence.
  const confidenceToScore = (confidence: string): number => {
    switch (confidence) {
      case "high":
        return 1.0;
      case "medium":
        return 0.6;
      case "low":
        return 0.3;
      default: {
        const parsed = Number(confidence);
        return Number.isNaN(parsed) ? 0.5 : parsed;
      }
    }
  };

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
    eventDate: draft.eventDate ? draft.eventDate.toISOString() : null,
    eventTime: draft.eventTime,
    guestCount: draft.guestCount,
    guestCountMin: draft.guestCountMin,
    guestCountMax: draft.guestCountMax,
    venuePreference: draft.venuePreference,
    venueId: draft.venueId,
    serviceStyle: draft.serviceStyle,
    dietaryRestrictions: draft.dietaryRestrictions,
    menuPreferences: draft.menuPreferences as Record<string, unknown> | null,
    budgetMin: draft.budgetMin === null ? null : Number(draft.budgetMin),
    budgetMax: draft.budgetMax === null ? null : Number(draft.budgetMax),
    packageIds: draft.packageIds,
    addOnIds: draft.addOnIds,
    customItems: draft.customItems as Record<string, unknown> | null,
    timelineNotes: draft.timelineNotes,
    // Generated client types this column as Json — coerce defensively.
    openQuestions: Array.isArray(draft.openQuestions)
      ? (draft.openQuestions as string[])
      : [],
    specialNotes: draft.specialNotes,
    aiSummary: draft.aiSummary,
    overallConfidence: Number(draft.overallConfidence ?? 0),
    convertedEventId: draft.convertedEventId,
    proposalId: draft.proposalId,
    expiresAt: draft.expiresAt ? draft.expiresAt.toISOString() : null,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    session: session
      ? {
          id: session.id,
          status: session.status,
          startedAt: session.startedAt.toISOString(),
          endedAt: session.endedAt ? session.endedAt.toISOString() : null,
          transcriptText: session.transcriptText,
        }
      : null,
    extractedDetails: extractedDetails.map((ed) => ({
      id: ed.id,
      fieldName: ed.fieldName,
      rawValue: ed.rawValue,
      normalizedValue: ed.normalizedValue,
      confidence: confidenceToScore(ed.confidence),
      sourceQuote: ed.sourceQuote,
      status: ed.status,
      catalogMatchType: ed.catalogMatchType,
      createdAt: ed.createdAt.toISOString(),
    })),
  };

  return <DraftDetailClient draft={serializedDraft} />;
}
