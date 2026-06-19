/**
 * Async reaction handler for EmployeeCertification lapsed → employee notification.
 *
 * Deferred counterpart of {@link createEmployeeCertificationLapsedNotifyMiddleware}.
 * When `EmployeeCertificationExpired` OR `EmployeeCertificationRevoked` fires,
 * the middleware (with async enabled) ENQUEUES a job; this handler runs LATER
 * in the worker, loads the EmployeeCertification, and dispatches the governed
 * `Notification.create` for the affected employee (`employeeId`). The recipient,
 * cert name/type/expiry are the certification's OWN fields — read from the
 * loaded row. `reason` (revoke only) rides the payload as a `revoke` input param.
 *
 * Idempotent: the dispatch idempotency key is per (tenant, cert), so a
 * redelivered job does not produce a duplicate notification. `expire`/`revoke`
 * are single-shot FSM transitions.
 */

import { randomUUID } from "node:crypto";

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const EMPLOYEE_CERTIFICATION_LAPSED_NOTIFY_REACTION =
  "employeeCertificationLapsedNotify";

const EXPIRED_EVENT = "EmployeeCertificationExpired";
const REVOKED_EVENT = "EmployeeCertificationRevoked";

interface CertificationLike {
  certificationName?: unknown;
  certificationType?: unknown;
  employeeId?: unknown;
  expiryDate?: unknown;
  tenantId?: unknown;
}

interface LapsePayload {
  reason?: unknown;
}

interface ManifestStore {
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const employeeCertificationLapsedNotifyHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const eventName = job.triggeringEvent.name;
    const certId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;

    if (eventName !== EXPIRED_EVENT && eventName !== REVOKED_EVENT) {
      log.warn?.(
        "employeeCertificationLapsedNotify: unexpected event name — skipping",
        { jobId: job.id, eventName },
      );
      return;
    }

    const kind = eventName === REVOKED_EVENT ? "revoked" : "expired";

    if (!certId) {
      log.warn?.(
        "employeeCertificationLapsedNotify: missing subjectId — skipping",
        { jobId: job.id, kind },
      );
      return;
    }

    const certStore = storeProvider("EmployeeCertification") as
      | ManifestStore
      | undefined;
    if (!certStore) {
      throw new Error("EmployeeCertification store unavailable");
    }

    const cert = (await certStore.getById(certId)) as
      | CertificationLike
      | undefined;
    if (!cert) {
      log.warn?.(
        "employeeCertificationLapsedNotify: certification not found — skipping",
        { jobId: job.id, certId, kind },
      );
      return;
    }

    const employeeId = asNonEmptyString(cert.employeeId);
    if (!employeeId) {
      log.warn?.(
        "employeeCertificationLapsedNotify: certification has no employeeId — skipping",
        { jobId: job.id, certId, kind },
      );
      return;
    }

    const payload = job.triggeringEvent.payload as LapsePayload | undefined;
    const certName =
      asNonEmptyString(cert.certificationName) ?? "credential";
    const certType = asNonEmptyString(cert.certificationType);
    const expiryDate = asNonEmptyString(cert.expiryDate);
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
        id: randomUUID(),
        tenantId,
        recipientEmployeeId: employeeId,
        notificationType,
        title,
        body,
        actionUrl: "",
        correlationId: certId,
      },
      {
        entityName: "Notification",
        correlationId: certId,
        causationId: eventName,
        idempotencyKey:
          job.idempotencyKey ?? `cert-lapsed:${tenantId}:${certId}`,
      },
    );

    if (!result.success) {
      throw new Error(
        `Notification.create failed for ${kind} certification ${certId}: ${result.error ?? "unknown"}`,
      );
    }
  };

function composeBody(input: {
  certName: string;
  certType: string | undefined;
  expiryDate: string | undefined;
  kind: string;
  reason: string | undefined;
}): string {
  const { certName, certType, expiryDate, kind, reason } = input;
  const what = certType
    ? `${certType} certification "${certName}"`
    : `certification "${certName}"`;
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
