/**
 * Mirror successful email/SMS sends into governed in-app Notifications.
 *
 * WHY: the email/SMS services (`packages/notifications/*-notification-service.ts`)
 * write only to the infra `email_logs` / `sms_logs` tables and emit NO governed
 * event, so the in-app `/notifications` surface was blind to every message the
 * system sent (IMPLEMENTATION_PLAN — "Notification on email/SMS send"). This
 * dispatches the governed `Notification.create` command (constitution §5
 * canonical write path) via `runManifestCommandCore` — the same route-level
 * side-effect dispatch the inventory discrepancy-resolve route uses — so each
 * delivered message produces a real, audited `NotificationCreated` event.
 *
 * Dispatched as the `system` actor because the in-app mirror is a consequence of
 * a successful send, NOT the sender's privileged action. `Notification`'s policy
 * admits role `system`, so the mirror is created regardless of the sender's role
 * (a kitchen lead who triggers a send still produces the recipient's in-app
 * notification). This matches the runtime notify-middleware precedent, which also
 * dispatches notifications as system.
 *
 * Only recipients that (a) carry an `employeeId` — `Notification.recipientEmployeeId`
 * is required and `belongsTo User`, so external clients with only an email/phone
 * have no in-app inbox — and (b) whose send SUCCEEDED are mirrored. Results are
 * POSITIONAL: both services push exactly one result per recipient in iteration
 * order, so `results[i]` always corresponds to `recipients[i]`.
 *
 * Failures are swallowed (logged) — a notification-mirror error must never fail
 * the send that already happened (constitution §11: notifications are an
 * operational consequence, not part of the send's success contract).
 */

import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const systemDeps = {
  createRuntime: ({
    user,
    entityName,
  }: {
    entityName: string;
    user: { id: string; role: string; tenantId: string };
  }) =>
    createManifestRuntime({
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
      entityName,
    }),
};

/** A recipient as seen by the email/SMS send services. */
interface MirrorRecipient {
  employeeId?: string;
}

/** A per-recipient send result (positional with `recipients`). */
interface MirrorResult {
  success: boolean;
}

export interface MirrorSendsParams {
  /** Optional in-app deep link for the notification. */
  actionUrl?: string;
  /** Short notification body; may be empty (title carries the summary). */
  body: string;
  /** Correlates the in-app notification to its originating workflow/send. */
  correlationId?: string;
  /** Notification type label (e.g. "shift_reminder"); must be non-empty. */
  notificationType: string;
  /** Send recipients, positional with `results`. */
  recipients: MirrorRecipient[];
  /** Per-recipient send results, positional with `recipients`. */
  results: MirrorResult[];
  tenantId: string;
  /** Human-readable notification title; must be non-empty (create guard). */
  title: string;
}

/**
 * Turn a notification-type slug into a human title, e.g.
 * `"shift_reminder"` → `"Shift reminder"`. Falls back to the raw type, then to
 * a generic label, so the non-empty `title` guard on `Notification.create`
 * always holds.
 */
export function humanizeNotificationType(notificationType: string): string {
  const words = notificationType.replace(/[_-]+/g, " ").trim();
  if (!words) {
    return notificationType || "Notification";
  }
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function mirrorSendsToNotifications(
  params: MirrorSendsParams
): Promise<void> {
  const {
    tenantId,
    notificationType,
    title,
    body,
    actionUrl,
    correlationId,
    recipients,
    results,
  } = params;

  const user = { id: "system", role: "system", tenantId };

  for (let i = 0; i < recipients.length; i++) {
    const employeeId = recipients[i]?.employeeId;
    // Mirror only employees whose send actually succeeded.
    if (!(employeeId && results[i]?.success)) {
      continue;
    }

    try {
      const dispatched = await runManifestCommandCore(systemDeps, {
        entity: "Notification",
        command: "create",
        body: {
          recipientEmployeeId: employeeId,
          notificationType,
          title,
          body,
          actionUrl: actionUrl ?? "",
          correlationId: correlationId ?? "",
        },
        user,
      });

      if (!dispatched.ok) {
        log.error("[notification-mirror] Notification.create failed", {
          tenantId,
          employeeId,
          notificationType,
          error: dispatched.message,
        });
      }
    } catch (error) {
      log.error("[notification-mirror] Notification.create threw", {
        tenantId,
        employeeId,
        notificationType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
