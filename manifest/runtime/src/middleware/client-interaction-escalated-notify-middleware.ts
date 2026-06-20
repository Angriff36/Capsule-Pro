/**
 * ClientInteraction escalation-notification middleware (CRM, IMPLEMENTATION_PLAN P1).
 *
 * Completes a CRM propagation the declarative DSL cannot express, and the direct
 * sibling of `client-interaction-overdue-notify-middleware`:
 *   - ClientInteractionEscalated → Notification.create for the ESCALATION TARGET, so
 *     when a rep escalates a follow-up it lands on the recipient's notification feed
 *     instead of relying on an out-of-band ping. `ClientInteractionEscalated`
 *     (client-interaction-rules.manifest:247) is an ORPHAN event today — nothing
 *     consumes it, so an escalation produces zero in-app signal for the person it is
 *     escalated to.
 *
 * WHO is notified (the deliberate difference from the overdue leg): the OVERDUE leg
 * notifies the assignee (`employeeId`) whose follow-up slipped; ESCALATION notifies
 * `escalatedTo` — the person the interaction is now urgent for and handed to. They
 * are the party that needs the signal. (CC-ing the original assignee is a possible
 * follow-up; kept to one recipient here for a minimal, clear leg.)
 *
 * WHY this is middleware and not a reaction (the crux):
 *
 *   `escalate(escalatedTo, reason)` (client-interaction-rules.manifest:160) is a
 *   MUTATE command. The engine-emitted payload is `{ ...commandInput, result }`, so
 *   `escalatedTo` and `reason` DO ride the payload (they are genuine input params) —
 *   but the notification also needs the interaction's `subject` and `tenantId`, which
 *   are the interaction's OWN fields, NOT escalate params; declared event fields are
 *   NEVER auto-populated from `self.*`, so `payload.subject`/`payload.tenantId` are
 *   `undefined` at runtime. `Notification.create` guards `recipientEmployeeId != ""`
 *   / `title != ""`, so a reaction building the title from an undefined `subject`
 *   would still be brittle, and there is no declarative way to load the interaction.
 *   The middleware LOADS the interaction from the store via `_subject.id` and reads
 *   its own fields — the same mechanism the overdue sibling uses.
 *
 * KNOWN LIMITATION (documented, not silent): the dispatch runs as the SAME actor who
 * escalated the interaction, subject to `Notification.create`'s policy
 * (notification-rules.manifest:30 default `manager/admin`; the `NotificationCreate`
 * policy admits `system` too). `ClientInteraction.escalate` admits
 * `sales*`/manager/admin, so a sales-rep actor's notification leg yields a
 * policy-denied diagnostic + skip (the runtime has no per-call identity override;
 * elevating it would be a governance change, out of scope).
 *
 * Guard-safe + idempotent: skips cleanly (with a diagnostic, never silent) when the
 * interaction is missing, soft-deleted, or carries no escalation target. The dispatch
 * idempotency key is per (interaction, recipient) so a re-emitted event dedups, while
 * a genuine RE-escalation to a DIFFERENT person notifies anew (escalate allows
 * escalated → escalated). Mirrors the deal-reassignment notify pattern.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import type { AsyncDispatch } from "../async-reactions";
import {
  captureTriggeringEvents,
  CLIENT_INTERACTION_ESCALATED_NOTIFY_REACTION,
} from "../async-reactions";

interface RunCommandOptions {
  causationId?: string;
  correlationId?: string;
  entityName?: string;
  idempotencyKey?: string;
  instanceId?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface ClientInteractionEscalatedNotifyDiagnostic {
  detail?: Record<string, unknown>;
  interactionId?: string;
  reason: string;
  recipient?: string;
  stage: string;
  tenantId?: string;
}

export interface ClientInteractionEscalatedNotifyMiddlewareOptions {
  asyncEnqueue?: AsyncDispatch;
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: ClientInteractionEscalatedNotifyDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface ClientInteractionLike {
  deletedAt?: unknown;
  escalatedTo?: unknown;
  subject?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (
  diag: ClientInteractionEscalatedNotifyDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[interaction-escalated-notify:${diag.stage}] ${diag.reason}`, {
    interactionId: diag.interactionId,
    recipient: diag.recipient,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createClientInteractionEscalatedNotifyMiddleware(
  options: ClientInteractionEscalatedNotifyMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
    asyncEnqueue,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "ClientInteraction") {
        return {};
      }

      const escalatedEvents = ctx.emittedEvents.filter(
        (event) => event.name === "ClientInteractionEscalated"
      );

      if (asyncEnqueue && escalatedEvents.length > 0) {
        await captureTriggeringEvents({
          asyncEnqueue,
          ctx,
          events: escalatedEvents,
          reactionName: CLIENT_INTERACTION_ESCALATED_NOTIFY_REACTION,
        });
        return {};
      }

      for (const event of escalatedEvents) {
        await notifyEscalationTarget(event, ctx);
      }

      return {};
    },
  };

  /** ClientInteractionEscalated → Notification.create for the escalation target. */
  async function notifyEscalationTarget(
    // biome-ignore lint/suspicious/noExplicitAny: structural emitted-event row.
    event: any,
    ctx: MiddlewareContext
  ): Promise<void> {
    const interactionId =
      asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
    if (!interactionId) {
      onDiagnostic({
        stage: "resolve",
        reason: "ClientInteractionEscalated missing interactionId",
      });
      return;
    }

    const interactionStore = storeProvider("ClientInteraction");
    const notificationStore = storeProvider("Notification");
    if (!(interactionStore && notificationStore)) {
      onDiagnostic({
        stage: "stores",
        reason:
          "ClientInteraction or Notification store unavailable — escalation target not notified",
        interactionId,
        detail: {
          interaction: !!interactionStore,
          notification: !!notificationStore,
        },
      });
      return;
    }

    const interaction = (await interactionStore.getById(interactionId)) as
      | ClientInteractionLike
      | undefined;
    if (!interaction) {
      onDiagnostic({
        stage: "load",
        reason:
          "escalated interaction not found in store — cannot build notification",
        interactionId,
      });
      return;
    }

    // `escalatedTo`/`reason` ARE escalate params (they ride the payload); `subject`
    // and `tenantId` are the interaction's OWN fields (read from the loaded row).
    // tenantId prefers the entity (most authoritative) and falls back to the context.
    const payload = event.payload as
      | { escalatedTo?: unknown; reason?: unknown; tenantId?: unknown }
      | undefined;
    const tenantId =
      asNonEmptyString(interaction.tenantId) ??
      asNonEmptyString(payload?.tenantId) ??
      asNonEmptyString(
        (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
          ?.tenantId
      );
    if (!tenantId) {
      onDiagnostic({
        stage: "tenant",
        reason: "could not resolve tenantId — skip notification",
        interactionId,
      });
      return;
    }

    // Soft-deleted interactions should not generate notifications (escalate guards
    // `deletedAt == null`, but stay defensive against store drift).
    if (interaction.deletedAt != null) {
      onDiagnostic({
        stage: "deleted",
        reason: "interaction is soft-deleted — skip notification",
        interactionId,
        tenantId,
      });
      return;
    }

    // The recipient is the escalation TARGET. Prefer the entity's mutated value
    // (escalate sets `escalatedTo`); fall back to the command param on the payload.
    // escalate guards `escalatedTo != ""`, but skip cleanly if drifted — otherwise
    // Notification.create fails its `recipientEmployeeId != ""` guard.
    const recipient =
      asNonEmptyString(interaction.escalatedTo) ??
      asNonEmptyString(payload?.escalatedTo);
    if (!recipient) {
      onDiagnostic({
        stage: "recipient",
        reason: "escalation has no target — nothing to notify",
        interactionId,
        tenantId,
      });
      return;
    }

    const subject = asNonEmptyString(interaction.subject) ?? "a follow-up";
    const escalationReason = asNonEmptyString(payload?.reason);
    const body = escalationReason
      ? `The follow-up "${subject}" has been escalated to you: ${escalationReason}. It is now urgent.`
      : `The follow-up "${subject}" has been escalated to you. It is now urgent.`;

    const notificationId = randomUUID();
    const result = await dispatchCommand(
      "create",
      {
        // For a create the new id travels in the body, NOT as instanceId.
        id: notificationId,
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
        correlationId:
          asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
          interactionId,
        causationId: "ClientInteractionEscalated",
        // Keyed on (interaction, recipient): a re-emitted escalation dedups, while a
        // re-escalation to a different person notifies anew.
        idempotencyKey: `interaction-escalated-notify:${tenantId}:${interactionId}:${recipient}`,
      }
    );
    if (result.emittedEvents) {
      ctx.emittedEvents.push(...result.emittedEvents);
    }
    if (!result.success) {
      onDiagnostic({
        stage: "create",
        // The common cause is the manager/admin policy on Notification.create when a
        // sales_rep escalated the interaction — surfaced, not silent.
        reason: `Notification.create failed (policy or guard): ${result.error ?? "unknown"}`,
        interactionId,
        tenantId,
        recipient,
      });
      return;
    }

    onDiagnostic({
      stage: "done",
      reason: `escalation target notified ("${subject}")`,
      interactionId,
      tenantId,
      recipient,
    });
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
