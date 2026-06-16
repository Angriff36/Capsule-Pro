import { listCallPlanningSessions, listEventPlanningDrafts } from "@/app/lib/manifest-client.generated";
/**
 * @module CallPlannerPage
 * @intent Server component for AI Call Planner landing page
 * @responsibility Display call planner drafts and transcript upload interface
 * @domain Call Planner
 */

import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { CallPlannerClient } from "./call-planner-client";

export default async function CallPlannerPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  // Fetch recent drafts
  const drafts = (await listEventPlanningDrafts()).data;

  // No FK relations in this schema (flat keys) — resolve sessions separately.
  const sessionIds = Array.from(new Set(drafts.map((d) => d.sessionId)));
  const sessions = sessionIds.length
    ? (await listCallPlanningSessions()).data
    : [];
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  const serialized = drafts.map((draft) => {
    const session = sessionMap.get(draft.sessionId);
    return {
      id: draft.id,
      status: draft.status,
      clientName: draft.clientName,
      eventType: draft.eventType,
      eventDate: draft.eventDate ? draft.eventDate.toISOString() : null,
      guestCount: draft.guestCount,
      overallConfidence: Number(draft.overallConfidence ?? 0),
      proposalId: draft.proposalId,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
      sessionStatus: session?.status ?? null,
      sessionStartedAt: session ? session.startedAt.toISOString() : null,
    };
  });

  return <CallPlannerClient initialDrafts={serialized} />;
}
