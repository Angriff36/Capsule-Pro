/**
 * EmployeeCertification expired / revoked → Notification for the affected employee
 * (IMPLEMENTATION_PLAN P1, Core / cross-cutting orphan events —
 * "EmployeeCertificationExpired/Revoked → escalation").
 *
 * WHY this exists: a staff member's certification (food-handler, alcohol service,
 * allergen, safety, …) going invalid is a compliance + safety event. Both
 * `EmployeeCertification.expire()` (driven by a scheduled job once a credential is
 * past its expiry date, employee-certification-rules.manifest:79) and
 * `EmployeeCertification.revoke(reason, revokedBy)` (:87) flip the certification row
 * (`status = "expired"` / `"revoked"`) and emit `EmployeeCertificationExpired` /
 * `EmployeeCertificationRevoked` — but until this middleware existed BOTH events had
 * ZERO consumers (verified: no reaction, no middleware, no factory registration). So
 * a lapsed or pulled credential fired nothing: the employee was never told to renew,
 * and `/notifications` was blind to the compliance gap. This middleware closes the
 * most direct leg — notify the affected employee — so the lapse surfaces in-product.
 *
 * WHY middleware and not a reaction (the structural reason, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0): `expire()`/`revoke()` are
 * MUTATE commands, so the engine's emitted payload is `{ ...commandInput, result }`
 * where `result` is the last mutate's scalar — NOT the certification instance. The
 * recipient is `EmployeeCertification.employeeId` (employee-certification-rules.manifest:9),
 * which is the certification's OWN field and NOT an `expire`/`revoke` input param;
 * declared event fields (`EmployeeCertificationExpired.employeeId`, …) are NEVER
 * auto-populated from `self.*`. So no reaction can read the recipient FK — the
 * middleware LOADS the certification via `_subject.id` and reads `self.employeeId`
 * (plus the name/type/expiry for a useful message). Same mechanism as the
 * ingredient-recall and event-staff-assigned-notify legs.
 *
 * Resolution: on either lapse event, load the certification row, then dispatch the
 * governed `Notification.create` — `recipientEmployeeId` = the cert's `employeeId`,
 * `correlationId` = the certification id (so the notification is traceable back to
 * the credential). The revocation `reason` IS a `revoke` param, so it rides the
 * payload and is folded into the message body.
 *
 * Guard-safe + idempotent: `expire`/`revoke` are single-shot FSM transitions
 * (active → expired / {active,expired} → revoked), so a credential cannot re-emit the
 * same lapse; the dispatch key
 * `cert-{kind}-notify:{tenant}:{certificationId}:{employeeId}` makes a re-delivered
 * event a single notification regardless. A certification with no `employeeId` (the
 * entity constraint forbids it, but defensively) or an unresolvable tenant is a clean
 * skip reported via `onDiagnostic`, never silent.
 *
 * KNOWN LIMITATIONS (documented, not silent):
 *  - The recipient is `EmployeeCertification.employeeId` used as
 *    `Notification.recipientEmployeeId`; the certification's `belongsTo employee: User`
 *    makes `employeeId` a real `User` id, so this is a clean fit (no convention gap).
 *  - The dispatched `Notification.create` runs as the SAME actor who expired/revoked
 *    the credential and is subject to Notification's default policy
 *    (`user.role in ["manager", "admin"]`). A revocation is a manager/admin action so
 *    the common path passes; the scheduled `expire()` sweep must run as a
 *    manager/admin (or a future per-call identity override) for the notify leg to
 *    fire — otherwise it is reported via `onDiagnostic` as a policy-denied dispatch
 *    rather than a created row (same class as the deal-assign / event-staff-assigned
 *    notify legs). Notifying a manager/HR in addition (an AdminTask escalation) and
 *    suspending the employee's availability / flagging future shifts remain deferred
 *    follow-on legs of this plan item.
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
  EMPLOYEE_CERTIFICATION_LAPSED_NOTIFY_REACTION,
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

export interface EmployeeCertificationLapsedNotifyDiagnostic {
  certificationId?: string;
  detail?: Record<string, unknown>;
  employeeId?: string;
  kind?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EmployeeCertificationLapsedNotifyMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  asyncEnqueue?: AsyncDispatch;
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: EmployeeCertificationLapsedNotifyDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface LapsePayload {
  reason?: unknown;
  tenantId?: unknown;
}

interface CertificationLike {
  certificationName?: unknown;
  certificationType?: unknown;
  employeeId?: unknown;
  expiryDate?: unknown;
  tenantId?: unknown;
}

const EXPIRED_EVENT = "EmployeeCertificationExpired";
const REVOKED_EVENT = "EmployeeCertificationRevoked";

const defaultDiagnostic = (
  diag: EmployeeCertificationLapsedNotifyDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[cert-lapse-notify:${diag.stage}] ${diag.reason}`, {
    certificationId: diag.certificationId,
    employeeId: diag.employeeId,
    kind: diag.kind,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that notifies the affected employee when one of their
 * certifications expires or is revoked. Store/provider based so tests and production
 * share the same Manifest runtime boundary.
 */
export function createEmployeeCertificationLapsedNotifyMiddleware(
  options: EmployeeCertificationLapsedNotifyMiddlewareOptions
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
      // Anchor to the certification lapse commands only.
      if (
        !(
          ctx.entityName === "EmployeeCertification" &&
          (ctx.command.name === "expire" || ctx.command.name === "revoke")
        )
      ) {
        return {};
      }

      const lapseEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === EXPIRED_EVENT || event.name === REVOKED_EVENT
      );

      if (asyncEnqueue && lapseEvents.length > 0) {
        await captureTriggeringEvents({
          asyncEnqueue,
          ctx,
          events: lapseEvents,
          reactionName: EMPLOYEE_CERTIFICATION_LAPSED_NOTIFY_REACTION,
        });
        return {};
      }

      for (const event of lapseEvents) {
        const kind = event.name === REVOKED_EVENT ? "revoked" : "expired";
        const payload = event.payload as LapsePayload | undefined;
        const certificationId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);

        if (!certificationId) {
          onDiagnostic({
            stage: "resolve",
            kind,
            reason: `${event.name} carried no certification id — cannot notify`,
          });
          continue;
        }

        const certStore = storeProvider("EmployeeCertification");
        if (!certStore) {
          onDiagnostic({
            stage: "stores",
            kind,
            reason: "EmployeeCertification store unavailable — cannot notify",
            certificationId,
          });
          continue;
        }

        const cert = (await certStore.getById(certificationId)) as
          | CertificationLike
          | undefined;
        if (!cert) {
          onDiagnostic({
            stage: "load",
            kind,
            reason:
              "lapsed certification not found in store — cannot resolve employee",
            certificationId,
          });
          continue;
        }

        const tenantId =
          asNonEmptyString(cert.tenantId) ??
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        const employeeId = asNonEmptyString(cert.employeeId);

        if (!(tenantId && employeeId)) {
          onDiagnostic({
            stage: "recipient",
            kind,
            reason: `certification missing ${employeeId ? "tenantId" : "employeeId"} — no one to notify`,
            certificationId,
            employeeId,
            tenantId,
          });
          continue;
        }

        const certName =
          asNonEmptyString(cert.certificationName) ?? "credential";
        const certType = asNonEmptyString(cert.certificationType);
        const expiryDate = asNonEmptyString(cert.expiryDate);
        // `reason` is a genuine `revoke` input param, so it rides the payload.
        const reason =
          kind === "revoked" ? asNonEmptyString(payload?.reason) : undefined;

        const notificationType =
          kind === "revoked"
            ? "certification_revoked"
            : "certification_expired";
        const title =
          kind === "revoked"
            ? `Certification revoked: ${certName}`
            : `Certification expired: ${certName}`;
        const body = composeBody({ kind, certName, certType, expiryDate, reason });

        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId
            // (passing instanceId targets an existing instance and the row is never
            // persisted — mirrors event-staff-assigned-notify / schedule-notify).
            id: randomUUID(),
            tenantId,
            recipientEmployeeId: employeeId,
            notificationType,
            title,
            body,
            actionUrl: "",
            correlationId: certificationId,
          },
          {
            entityName: "Notification",
            correlationId: certificationId,
            causationId: event.name,
            idempotencyKey: `cert-${kind}-notify:${tenantId}:${certificationId}:${employeeId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            kind,
            reason: `Notification.create failed: ${result.error ?? "unknown"}`,
            certificationId,
            employeeId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          kind,
          reason: `employee notified that certification ${kind}`,
          certificationId,
          employeeId,
          tenantId,
        });
      }

      return {};
    },
  };
}

function composeBody(input: {
  certName: string;
  certType: string | undefined;
  expiryDate: string | undefined;
  kind: string;
  reason: string | undefined;
}): string {
  const { certName, certType, expiryDate, kind, reason } = input;
  const what = certType ? `${certType} certification "${certName}"` : `certification "${certName}"`;
  if (kind === "revoked") {
    const why = reason ? ` Reason: ${reason}.` : "";
    return `Your ${what} has been revoked.${why} Contact your manager to resolve your scheduling eligibility.`;
  }
  const when = expiryDate ? ` (expired ${expiryDate})` : "";
  return `Your ${what} has expired${when}. Please renew it to stay eligible for scheduling.`;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
