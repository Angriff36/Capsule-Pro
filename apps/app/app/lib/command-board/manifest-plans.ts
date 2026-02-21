import "server-only";

import { database } from "@repo/database";
import {
  type ManifestPlanRecordPayload,
  planRecordPayloadSchema,
  type SuggestedManifestPlan,
} from "../../(authenticated)/command-board/types/manifest-plan";

const PLAN_AGGREGATE_TYPE = "command_board_plan";
const PENDING_EVENT_TYPE = "command_board.plan.pending";

interface CreatePendingManifestPlanInput {
  tenantId: string;
  boardId: string;
  plan: SuggestedManifestPlan;
  requestedBy: string | null;
}

export async function createPendingManifestPlan({
  tenantId,
  boardId,
  plan,
  requestedBy,
}: CreatePendingManifestPlanInput): Promise<void> {
  const payload: ManifestPlanRecordPayload = {
    state: "pending",
    boardId,
    requestedBy,
    requestedAt: new Date().toISOString(),
    plan,
  };

  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: PLAN_AGGREGATE_TYPE,
      aggregateId: plan.planId,
      eventType: PENDING_EVENT_TYPE,
      payload: JSON.parse(JSON.stringify(payload)),
    },
  });
}

export async function getPendingManifestPlan(
  tenantId: string,
  boardId: string,
  planId: string
): Promise<{
  eventId: string;
  payload: ManifestPlanRecordPayload;
} | null> {
  const event = await database.outboxEvent.findFirst({
    where: {
      tenantId,
      aggregateType: PLAN_AGGREGATE_TYPE,
      aggregateId: planId,
      eventType: PENDING_EVENT_TYPE,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!event) {
    return null;
  }

  const payloadResult = planRecordPayloadSchema.safeParse(event.payload);
  if (!payloadResult.success) {
    console.error("[manifest-plans] Invalid stored plan payload", {
      planId,
      issues: payloadResult.error.issues,
    });
    return null;
  }

  if (payloadResult.data.boardId !== boardId) {
    return null;
  }

  return {
    eventId: event.id,
    payload: payloadResult.data,
  };
}

interface UpdateManifestPlanRecordInput {
  eventId: string;
  payload: ManifestPlanRecordPayload;
  published: boolean;
}

export async function updateManifestPlanRecord({
  eventId,
  payload,
  published,
}: UpdateManifestPlanRecordInput): Promise<void> {
  await database.outboxEvent.update({
    where: { id: eventId },
    data: {
      payload: JSON.parse(JSON.stringify(payload)),
      ...(published
        ? {
            status: "published",
            publishedAt: new Date(),
          }
        : {}),
    },
  });
}

interface CreateManifestPlanAuditEventInput {
  tenantId: string;
  planId: string;
  payload: ManifestPlanRecordPayload;
}

export async function createManifestPlanAuditEvent({
  tenantId,
  planId,
  payload,
}: CreateManifestPlanAuditEventInput): Promise<void> {
  await database.outboxEvent.create({
    data: {
      tenantId,
      aggregateType: PLAN_AGGREGATE_TYPE,
      aggregateId: planId,
      eventType: "command_board.plan.executed",
      payload: JSON.parse(JSON.stringify(payload)),
    },
  });
}
