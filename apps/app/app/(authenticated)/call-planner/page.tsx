/**
 * @module CallPlannerPage
 * @intent Server component for AI Call Planner landing page
 * @responsibility Display call planner drafts and transcript upload interface
 * @domain Call Planner
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { redirect } from "next/navigation";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { CallPlannerClient } from "./call-planner-client";

export default async function CallPlannerPage() {
  const { userId, orgId } = await auth();
  if (!(userId && orgId)) redirect("/sign-in");

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) redirect("/");

  // Fetch recent drafts
  const drafts = await database.eventPlanningDraft.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      clientName: true,
      eventType: true,
      eventDate: true,
      guestCount: true,
      overallConfidence: true,
      proposalId: true,
      createdAt: true,
      updatedAt: true,
      session: {
        select: {
          status: true,
          startedAt: true,
        },
      },
    },
  });

  const serialized = drafts.map((draft) => ({
    id: draft.id,
    status: draft.status,
    clientName: draft.clientName,
    eventType: draft.eventType,
    eventDate: draft.eventDate?.toISOString(),
    guestCount: draft.guestCount,
    overallConfidence: draft.overallConfidence,
    proposalId: draft.proposalId,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    sessionStatus: draft.session?.status,
    sessionStartedAt: draft.session?.startedAt?.toISOString(),
  }));

  return <CallPlannerClient initialDrafts={serialized} />;
}
