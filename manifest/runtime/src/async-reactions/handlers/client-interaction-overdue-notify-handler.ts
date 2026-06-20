/**
 * Async reaction handler for ClientInteraction overdue → assignee notification.
 *
 * Deferred counterpart of {@link createClientInteractionOverdueNotifyMiddleware}.
 * When `ClientInteractionMarkedOverdue` fires, the middleware (with async
 * enabled) ENQUEUES a job; this handler runs LATER in the worker, loads the
 * ClientInteraction, and dispatches the governed `Notification.create` for the
 * assignee (`employeeId`). The recipient, subject, and tenantId are the
 * interaction's OWN fields — read from the loaded row, not the event payload
 * (`markOverdue` takes no params, so the payload carries only `result`).
 *
 * Idempotent: the dispatch idempotency key is per (tenant, interaction), so a
 * redelivered job does not produce a duplicate notification. `markOverdue`'s
 * own FSM (open|scheduled → overdue) cannot re-fire for one interaction.
 */

import { randomUUID } from "node:crypto";

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const CLIENT_INTERACTION_OVERDUE_NOTIFY_REACTION =
  "clientInteractionOverdueNotify";

interface ClientInteractionLike {
  deletedAt?: unknown;
  employeeId?: unknown;
  interactionType?: unknown;
  subject?: unknown;
  tenantId?: unknown;
}

interface ManifestStore {
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const clientInteractionOverdueNotifyHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const interactionId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;

    if (!interactionId) {
      log.warn?.(
        "clientInteractionOverdueNotify: missing subjectId — skipping",
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
        "clientInteractionOverdueNotify: interaction not found — skipping",
        { jobId: job.id, interactionId },
      );
      return;
    }

    if (interaction.deletedAt != null) {
      log.warn?.(
        "clientInteractionOverdueNotify: interaction is soft-deleted — skipping",
        { jobId: job.id, interactionId },
      );
      return;
    }

    const recipient = asNonEmptyString(interaction.employeeId);
    if (!recipient) {
      log.warn?.(
        "clientInteractionOverdueNotify: interaction has no assignee — skipping",
        { jobId: job.id, interactionId },
      );
      return;
    }

    const subject = asNonEmptyString(interaction.subject) ?? "a follow-up";
    const interactionType =
      asNonEmptyString(interaction.interactionType) ?? "note";

    const result = await dispatchCommand(
      "create",
      {
        id: randomUUID(),
        tenantId,
        recipientEmployeeId: recipient,
        notificationType: "interaction_overdue",
        title: `Follow-up overdue: ${subject}`,
        body: `The ${interactionType} follow-up "${subject}" is overdue. Reschedule or complete it.`,
        actionUrl: "",
        correlationId: interactionId,
      },
      {
        entityName: "Notification",
        correlationId: interactionId,
        causationId: "ClientInteractionMarkedOverdue",
        idempotencyKey:
          job.idempotencyKey ??
          `client-interaction-overdue:${tenantId}:${interactionId}`,
      },
    );

    if (!result.success) {
      throw new Error(
        `Notification.create failed for overdue interaction ${interactionId}: ${result.error ?? "unknown"}`,
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
