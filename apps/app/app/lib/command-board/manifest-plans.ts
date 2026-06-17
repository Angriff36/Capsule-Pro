import "server-only";

import { captureException } from "@sentry/nextjs";
import {
  commandBoardCardCreate,
  commandBoardCardUpdate,
  listCommandBoardCards,
} from "../../lib/manifest-client.generated";
import {
  type ManifestPlanRecordPayload,
  planRecordPayloadSchema,
  type SuggestedManifestPlan,
} from "../../api/command-board/types/manifest-plan";

const PLAN_AGGREGATE_TYPE = "command_board_plan";
const PENDING_EVENT_TYPE = "command_board.plan.pending";
const PLAN_CARD_TYPE = "manifest_plan_pending";

interface CreatePendingManifestPlanInput {
  boardId: string;
  plan: SuggestedManifestPlan;
  requestedBy: string | null;
  tenantId: string;
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

  await commandBoardCardCreate({
    boardId,
    title: `Manifest Plan ${plan.planId}`,
    content: "Pending manifest plan",
    cardType: PLAN_CARD_TYPE,
    status: "pending",
    metadata: JSON.stringify({
      tenantId,
      aggregateType: PLAN_AGGREGATE_TYPE,
      aggregateId: plan.planId,
      eventType: PENDING_EVENT_TYPE,
      payload,
      published: false,
    }),
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
  const cards = (await listCommandBoardCards()).data
    .filter(
      (card) =>
        card.boardId === boardId &&
        card.cardType === PLAN_CARD_TYPE &&
        typeof card.metadata === "string"
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const card = cards.find((candidate) => {
    try {
      const parsed = JSON.parse(candidate.metadata ?? "{}") as {
        tenantId?: string;
        aggregateType?: string;
        aggregateId?: string;
        eventType?: string;
      };
      return (
        parsed.tenantId === tenantId &&
        parsed.aggregateType === PLAN_AGGREGATE_TYPE &&
        parsed.aggregateId === planId &&
        parsed.eventType === PENDING_EVENT_TYPE
      );
    } catch {
      return false;
    }
  });

  if (!card) {
    return null;
  }

  const parsedMetadata = (() => {
    try {
      return JSON.parse(card.metadata ?? "{}") as {
        payload?: unknown;
      };
    } catch {
      return {};
    }
  })();
  const payloadResult = planRecordPayloadSchema.safeParse(parsedMetadata.payload);
  if (!payloadResult.success) {
    const validationError = new Error(
      `[manifest-plans] Invalid stored plan payload for planId=${planId}`
    );
    captureException(validationError, {
      tags: { source: "manifest-plans", type: "validation" },
      extra: {
        planId,
        issues: payloadResult.error.issues,
      },
    });
    console.error("[manifest-plans] Invalid stored plan payload", {
      planId,
      issues: payloadResult.error.issues,
    });
    captureException(payloadResult.error, {
      tags: { route: "manifest-plans", errorType: "zod_validation" },
      extra: { planId, boardId },
    });
    return null;
  }

  if (payloadResult.data.boardId !== boardId) {
    return null;
  }

  return {
    eventId: card.id,
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
  const existing = await listCommandBoardCards();
  const card = existing.data.find((candidate) => candidate.id === eventId);
  if (!card) {
    return;
  }
  const existingMeta =
    typeof card.metadata === "string" && card.metadata.length > 0
      ? (JSON.parse(card.metadata) as Record<string, unknown>)
      : {};

  await commandBoardCardUpdate({
    id: eventId,
    newMetadata: JSON.stringify({
      ...existingMeta,
      payload,
      published,
      publishedAt: published ? new Date().toISOString() : undefined,
    }),
    newStatus: published ? "published" : card.status,
  });
}

interface CreateManifestPlanAuditEventInput {
  payload: ManifestPlanRecordPayload;
  planId: string;
  tenantId: string;
}

export async function createManifestPlanAuditEvent({
  tenantId,
  planId,
  payload,
}: CreateManifestPlanAuditEventInput): Promise<void> {
  await commandBoardCardCreate({
    boardId: payload.boardId,
    title: `Manifest Plan Executed ${planId}`,
    content: "Manifest plan execution audit",
    cardType: PLAN_CARD_TYPE,
    status: "published",
    metadata: JSON.stringify({
      tenantId,
      aggregateType: PLAN_AGGREGATE_TYPE,
      aggregateId: planId,
      eventType: "command_board.plan.executed",
      payload,
      published: true,
      publishedAt: new Date().toISOString(),
    }),
  });
}
