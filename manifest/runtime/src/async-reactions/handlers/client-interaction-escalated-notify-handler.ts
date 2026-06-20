/**
 * Async reaction handler for ClientInteraction escalation → target notification.
 *
 * Deferred counterpart of {@link createClientInteractionEscalatedNotifyMiddleware}.
 * When `ClientInteractionEscalated` fires, the middleware (with async enabled)
 * ENQUEUES a job; this handler runs LATER in the worker, loads the
 * ClientInteraction, and dispatches the governed `Notification.create` for the
 * ESCALATION TARGET (`escalatedTo`) — the person the follow-up is now urgent
 * for, not the original assignee. The `subject` and `tenantId` are the
 * interaction's OWN fields (read from the loaded row); `escalatedTo` and
 * `reason` ride the payload as `escalate` input params.
 *
 * Idempotent: the dispatch idempotency key is per (tenant, interaction), so a
 * redelivered job does not produce a duplicate notification.
 */

import { randomUUID } from "node:crypto";

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const CLIENT_INTERACTION_ESCALATED_NOTIFY_REACTION =
  "clientInteractionEscalatedNotify";

interface ClientInteractionLike {
  deletedAt?: unknown;
  escalatedTo?: unknown;
  subject?: unknown;
  tenantId?: unknown;
}

interface EscalatedPayload {
  escalatedTo?: unknown;
  reason?: unknown;
}

interface ManifestStore {
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const clientInteractionEscalatedNotifyHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const interactionId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;
    const payload = job.triggeringEvent.payload as EscalatedPayload | undefined;

    if (!interactionId) {
      log.warn?.(
        "clientInteractionEscalatedNotify: missing subjectId — skipping",
        { jobId: job.id },
      );
      return;
    }

    const interactionStore = storeProvider("ClientInteraction") as
      | ManifestStore
      | undefined;
    if (!interactionStore) {
      throw new Error("ClientInteraction store unavailable");
    }

    const interaction = (await interactionStore.getById(interactionId)) as
      | ClientInteractionLike
      | undefined;
    if (!interaction) {
      log.warn?.(
        "clientInteractionEscalatedNotify: interaction not found — skipping",
        { jobId: job.id, interactionId },
      );
      return;
    }

    if (interaction.deletedAt != null) {
      log.warn?.(
        "clientInteractionEscalatedNotify: interaction is soft-deleted — skipping",
        { jobId: job.id, interactionId },
      );
      return;
    }

    const recipient =
      asNonEmptyString(interaction.escalatedTo) ??
      asNonEmptyString(payload?.escalatedTo);
    if (!recipient) {
      log.warn?.(
        "clientInteractionEscalatedNotify: escalation has no target — skipping",
        { jobId: job.id, interactionId },
      );
      return;
    }

    const subject = asNonEmptyString(interaction.subject) ?? "a follow-up";
    const escalationReason = asNonEmptyString(payload?.reason);
    const body = escalationReason
      ? `The follow-up "${subject}" has been escalated to you: ${escalationReason}. It is now urgent.`
      : `The follow-up "${subject}" has been escalated to you. It is now urgent.`;

    const result = await dispatchCommand(
      "create",
      {
        id: randomUUID(),
        tenantId,
        recipientEmployeeId: recipient,
        notificationType: "interaction_escalated",
        title: `Interaction escalated: ${subject}`,
        body,
        actionUrl: "",
        correlationId: interactionId,
      },
      {
        entityName: "Notification",
        correlationId: interactionId,
        causationId: "ClientInteractionEscalated",
        idempotencyKey:
          job.idempotencyKey ??
          `client-interaction-escalated:${tenantId}:${interactionId}`,
      },
    );

    if (!result.success) {
      throw new Error(
        `Notification.create failed for escalated interaction ${interactionId}: ${result.error ?? "unknown"}`,
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
