/**
 * ClientInteraction overdue-notification middleware (CRM, IMPLEMENTATION_PLAN P1).
 *
 * Completes a CRM propagation the declarative DSL cannot express:
 *   - ClientInteractionMarkedOverdue → Notification.create for the assignee, so a
 *     follow-up that slips past its due date surfaces on the rep's notification feed
 *     instead of silently rotting. `ClientInteractionMarkedOverdue`
 *     (client-interaction-rules.manifest:237) is an ORPHAN event today — nothing
 *     consumes it, so overdue follow-ups generate zero signal.
 *
 * WHY this is middleware and not a reaction (the crux):
 *
 *   `markOverdue()` takes NO input params (client-interaction-rules.manifest:149).
 *   The engine-emitted payload is `{ ...commandInput, result }` — with no params it
 *   carries only `result` (the last mutate's scalar) plus `_subject.id`. Declared
 *   event fields are NEVER auto-populated from `self.*`, so `payload.employeeId`,
 *   `payload.subject`, `payload.tenantId` are all `undefined` at runtime. The
 *   recipient (`employeeId`), the `subject`, and `tenantId` are the
 *   ClientInteraction's OWN fields — a reaction structurally cannot read them, and
 *   `Notification.create` guards `recipientEmployeeId != ""` / `title != ""`, so a
 *   reaction passing `undefined`s would fail the create guard and be
 *   logged-and-swallowed (zero notifications). The middleware LOADS the interaction
 *   from the store via `_subject.id` and reads its own fields — the only mechanism
 *   that works. Direct sibling of `deal-lifecycle-propagation-middleware`'s
 *   `DealAssigned → Notification.create` leg.
 *
 * KNOWN LIMITATION (documented, not silent): the dispatch runs as the SAME actor who
 * marked the interaction overdue, subject to `Notification.create`'s policy
 * (notification-rules.manifest:30 default `manager/admin`; the `NotificationCreate`
 * policy admits `system` too). `ClientInteraction.markOverdue` admits
 * `sales*`/manager/admin, so a sales-rep actor's notification leg yields a
 * policy-denied diagnostic + skip (the runtime has no per-call identity override;
 * elevating it would be a governance change, out of scope). Cron/admin-driven
 * overdue sweeps — the realistic trigger — pass.
 *
 * Guard-safe + idempotent: skips cleanly (with a diagnostic, never silent) when the
 * interaction is missing, soft-deleted, or has no assignee. The dispatch idempotency
 * key is per (interaction, recipient) so a re-emitted event dedups; `markOverdue`'s
 * own FSM (open|scheduled → overdue, never overdue → overdue) means it cannot fire
 * twice for one interaction anyway.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

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

export interface ClientInteractionOverdueNotifyDiagnostic {
  detail?: Record<string, unknown>;
  interactionId?: string;
  reason: string;
  recipient?: string;
  stage: string;
  tenantId?: string;
}

export interface ClientInteractionOverdueNotifyMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: ClientInteractionOverdueNotifyDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface ClientInteractionLike {
  deletedAt?: unknown;
  employeeId?: unknown;
  followUpDate?: unknown;
  interactionType?: unknown;
  subject?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (
  diag: ClientInteractionOverdueNotifyDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[interaction-overdue-notify:${diag.stage}] ${diag.reason}`, {
    interactionId: diag.interactionId,
    recipient: diag.recipient,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createClientInteractionOverdueNotifyMiddleware(
  options: ClientInteractionOverdueNotifyMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "ClientInteraction") {
        return {};
      }

      for (const event of ctx.emittedEvents) {
        if (event.name === "ClientInteractionMarkedOverdue") {
          await notifyAssignee(event, ctx);
        }
      }

      return {};
    },
  };

  /** ClientInteractionMarkedOverdue → Notification.create for the assignee. */
  async function notifyAssignee(
    // biome-ignore lint/suspicious/noExplicitAny: structural emitted-event row.
    event: any,
    ctx: MiddlewareContext
  ): Promise<void> {
    const interactionId =
      asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
    if (!interactionId) {
      onDiagnostic({
        stage: "resolve",
        reason: "ClientInteractionMarkedOverdue missing interactionId",
      });
      return;
    }

    const interactionStore = storeProvider("ClientInteraction");
    const notificationStore = storeProvider("Notification");
    if (!(interactionStore && notificationStore)) {
      onDiagnostic({
        stage: "stores",
        reason:
          "ClientInteraction or Notification store unavailable — assignee not notified",
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
          "overdue interaction not found in store — cannot build notification",
        interactionId,
      });
      return;
    }

    // `markOverdue` takes no params, so nothing rides the payload — every field is
    // the interaction's OWN, read from the loaded row. tenantId prefers the entity
    // (most authoritative) and falls back to the runtime context.
    const payload = event.payload as { tenantId?: unknown } | undefined;
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

    // Soft-deleted interactions should not generate notifications (markOverdue
    // guards `deletedAt == null`, but stay defensive against store drift).
    if (interaction.deletedAt != null) {
      onDiagnostic({
        stage: "deleted",
        reason: "interaction is soft-deleted — skip notification",
        interactionId,
        tenantId,
      });
      return;
    }

    // The assignee is `ClientInteraction.employeeId` (its OWN field). The entity
    // constraint `validEmployeeId` keeps it non-empty, but skip cleanly if drifted —
    // Notification.create would otherwise fail its `recipientEmployeeId != ""` guard.
    const recipient = asNonEmptyString(interaction.employeeId);
    if (!recipient) {
      onDiagnostic({
        stage: "recipient",
        reason: "overdue interaction has no assignee — nothing to notify",
        interactionId,
        tenantId,
      });
      return;
    }

    const subject = asNonEmptyString(interaction.subject) ?? "a follow-up";
    const interactionType =
      asNonEmptyString(interaction.interactionType) ?? "note";

    const notificationId = randomUUID();
    const result = await dispatchCommand(
      "create",
      {
        // For a create the new id travels in the body, NOT as instanceId.
        id: notificationId,
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
        correlationId:
          asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
          interactionId,
        causationId: "ClientInteractionMarkedOverdue",
        // Keyed on (interaction, recipient): a re-emitted overdue event dedups.
        idempotencyKey: `interaction-overdue-notify:${tenantId}:${interactionId}:${recipient}`,
      }
    );
    if (result.emittedEvents) {
      ctx.emittedEvents.push(...result.emittedEvents);
    }
    if (!result.success) {
      onDiagnostic({
        stage: "create",
        // The common cause is the manager/admin policy on Notification.create when a
        // sales_rep marked the interaction overdue — surfaced, not silent.
        reason: `Notification.create failed (policy or guard): ${result.error ?? "unknown"}`,
        interactionId,
        tenantId,
        recipient,
      });
      return;
    }

    onDiagnostic({
      stage: "done",
      reason: `assignee notified of overdue follow-up ("${subject}")`,
      interactionId,
      tenantId,
      recipient,
    });
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
