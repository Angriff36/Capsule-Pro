/**
 * EmployeeCertification expired / revoked → suspend the employee's EmployeeAvailability
 * (IMPLEMENTATION_PLAN P1, Core / cross-cutting orphan events —
 * "EmployeeCertificationExpired/Revoked → escalation", the availability-suspend leg).
 *
 * WHY this exists: a staff member's certification (food-handler, alcohol service,
 * allergen, safety, …) going invalid is a compliance + safety event. The sibling
 * notify leg (`employee-certification-lapsed-notify-middleware`) tells the employee to
 * renew, but until this middleware existed a lapsed credential did NOT stop the
 * employee from being rostered: their `EmployeeAvailability` rows stayed active, so the
 * scheduler still treated them as available for work that may require the now-invalid
 * credential. Suspending availability on a lapse is the protective, compliance-correct
 * default — the employee comes off the schedule until the credential is renewed and
 * their availability is reinstated.
 *
 * WHY middleware and not a reaction (two structural reasons):
 *  1. It is a 1:N fan-out — one certification lapse must suspend EVERY active
 *     `EmployeeAvailability` row for that employee (recurring day-of-week slots are
 *     separate rows). A declarative `on EmployeeCertificationExpired run
 *     EmployeeAvailability.suspend` reaction resolves exactly ONE target instance, so
 *     it structurally cannot reach the set.
 *  2. `expire()` / `revoke(reason, revokedBy)` are MUTATE commands, so the engine's
 *     emitted payload is `{ ...commandInput, result }` (the last mutate's scalar), NOT
 *     the certification instance. The employee is `EmployeeCertification.employeeId`
 *     (employee-certification-rules.manifest:9) — the cert's OWN field, NOT an
 *     `expire`/`revoke` input param — and declared event fields are never
 *     auto-populated from `self.*`. So the recipient FK is unreachable from a reaction;
 *     the middleware LOADS the certification via `_subject.id` and reads
 *     `self.employeeId`, then queries `EmployeeAvailability` by that employee.
 *
 * WHY this is SAFE to cascade (unlike ClientArchived → withdraw Proposals, deferred):
 * `EmployeeAvailability.suspend` is REVERSIBLE — `reinstate()` (employee-availability-
 * rules.manifest:82) flips the row back to active. We are cascading a reversible action
 * off a lapse, so the permanent-vs-reversible hazard that defers vendor-suspend /
 * dish-eightySix does not apply. There is intentionally NO restore-on-renewal leg:
 * renewing a credential and putting someone back on the schedule is a deliberate manual
 * act (same conservative stance as the ingredient-recall quarantine — pulling is
 * automatic, restoring is a human decision).
 *
 * SCOPE — credential-wide, not shift-specific: there is no modeled link between a
 * certification TYPE and the shifts/availability that require it, so a lapse suspends
 * ALL of the employee's availability rather than only credential-specific slots. This
 * is the conservative compliance default (when a required credential lapses, the safe
 * action is to take the employee off the schedule entirely until it is resolved). A
 * future credential→shift-requirement model could narrow this.
 *
 * Guard-safe + idempotent: only rows that are still non-deleted AND not already
 * suspended are dispatched, mirroring `suspend`'s `deletedAt == null` +
 * `isSuspended == false` guards — so an already-suspended or deleted row is skipped
 * rather than tripping a swallowed guard failure, and a re-delivered lapse event finds
 * nothing active and no-ops. The dispatch key
 * `cert-{kind}-suspend-availability:{tenant}:{certificationId}:{availabilityId}` is a
 * second backstop.
 *
 * KNOWN LIMITATION (documented, not silent): each dispatched `suspend` runs as the SAME
 * actor who expired/revoked the credential and is subject to EmployeeAvailability's
 * default policy (`hr_admin` / `payroll_admin` / `manager` / `admin`). A revocation is a
 * manager/admin action so the common path passes; the scheduled `expire()` sweep must
 * run as one of those roles (or a future per-call identity override) for the suspend leg
 * to fire — otherwise it surfaces via `onDiagnostic` as a policy-denied dispatch rather
 * than a suspended row (same class as the deal-assign / event-staff-assigned notify
 * legs). An AdminTask escalation for manager/HR follow-up remains a deferred sibling leg.
 */

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

export interface EmployeeCertificationLapsedSuspendAvailabilityDiagnostic {
  availabilityId?: string;
  certificationId?: string;
  detail?: Record<string, unknown>;
  employeeId?: string;
  kind?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EmployeeCertificationLapsedSuspendAvailabilityMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (
    diag: EmployeeCertificationLapsedSuspendAvailabilityDiagnostic
  ) => void;
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
  tenantId?: unknown;
}

interface AvailabilityRow {
  deletedAt?: unknown;
  employeeId?: unknown;
  id?: unknown;
  isSuspended?: unknown;
  tenantId?: unknown;
}

const EXPIRED_EVENT = "EmployeeCertificationExpired";
const REVOKED_EVENT = "EmployeeCertificationRevoked";

const defaultDiagnostic = (
  diag: EmployeeCertificationLapsedSuspendAvailabilityDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[cert-lapse-suspend-availability:${diag.stage}] ${diag.reason}`, {
    availabilityId: diag.availabilityId,
    certificationId: diag.certificationId,
    employeeId: diag.employeeId,
    kind: diag.kind,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that suspends an employee's availability when one of their
 * certifications expires or is revoked. Store/provider based so tests and production
 * share the same Manifest runtime boundary.
 */
export function createEmployeeCertificationLapsedSuspendAvailabilityMiddleware(
  options: EmployeeCertificationLapsedSuspendAvailabilityMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

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

      const lapses = ctx.emittedEvents.filter(
        (event) =>
          event.name === EXPIRED_EVENT || event.name === REVOKED_EVENT
      );

      for (const event of lapses) {
        const kind = event.name === REVOKED_EVENT ? "revoked" : "expired";
        const payload = event.payload as LapsePayload | undefined;
        const certificationId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);

        if (!certificationId) {
          onDiagnostic({
            stage: "resolve",
            kind,
            reason: `${event.name} carried no certification id — cannot suspend availability`,
          });
          continue;
        }

        const certStore = storeProvider("EmployeeCertification");
        const availabilityStore = storeProvider("EmployeeAvailability");
        if (!(certStore && availabilityStore)) {
          onDiagnostic({
            stage: "stores",
            kind,
            reason: `${certStore ? "EmployeeAvailability" : "EmployeeCertification"} store unavailable — suspend cascade skipped`,
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
            reason: `certification missing ${employeeId ? "tenantId" : "employeeId"} — no availability to suspend`,
            certificationId,
            employeeId,
            tenantId,
          });
          continue;
        }

        // 1:N fan-out: every active availability row for this employee. Already-suspended
        // or soft-deleted rows are filtered out so we never trip suspend's
        // `isSuspended == false` / `deletedAt == null` guards (no swallowed failures) and
        // a re-emitted lapse is a clean no-op.
        const activeRows = (await availabilityStore.getAll())
          .map((row) => row as AvailabilityRow)
          .filter(
            (row) =>
              asNonEmptyString(row.tenantId) === tenantId &&
              asNonEmptyString(row.employeeId) === employeeId &&
              row.deletedAt == null &&
              row.isSuspended !== true
          );

        if (activeRows.length === 0) {
          onDiagnostic({
            stage: "skip",
            kind,
            reason: "no active availability rows for the employee — nothing to suspend",
            certificationId,
            employeeId,
            tenantId,
          });
          continue;
        }

        // `suspend(reason)` guards a non-empty reason; compose a traceable one. The
        // revocation `reason` is a genuine `revoke` param so it rides the payload.
        const suspendReason = composeReason({
          kind,
          certName: asNonEmptyString(cert.certificationName) ?? "credential",
          certType: asNonEmptyString(cert.certificationType),
          revokeReason:
            kind === "revoked" ? asNonEmptyString(payload?.reason) : undefined,
        });

        for (const row of activeRows) {
          const availabilityId = asNonEmptyString(row.id);
          if (!availabilityId) {
            continue;
          }

          const result = await dispatchCommand(
            "suspend",
            { reason: suspendReason },
            {
              entityName: "EmployeeAvailability",
              instanceId: availabilityId,
              correlationId: certificationId,
              causationId: event.name,
              idempotencyKey: `cert-${kind}-suspend-availability:${tenantId}:${certificationId}:${availabilityId}`,
            }
          );

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "dispatch",
              kind,
              reason: `EmployeeAvailability.suspend failed for ${availabilityId}: ${result.error ?? "unknown"}`,
              availabilityId,
              certificationId,
              employeeId,
              tenantId,
            });
            continue;
          }

          onDiagnostic({
            stage: "done",
            kind,
            reason: `availability suspended for employee whose certification ${kind}`,
            availabilityId,
            certificationId,
            employeeId,
            tenantId,
          });
        }
      }

      return {};
    },
  };
}

function composeReason(input: {
  certName: string;
  certType: string | undefined;
  kind: string;
  revokeReason: string | undefined;
}): string {
  const { certName, certType, kind, revokeReason } = input;
  const what = certType
    ? `${certType} certification "${certName}"`
    : `certification "${certName}"`;
  if (kind === "revoked") {
    const why = revokeReason ? ` — ${revokeReason}` : "";
    return `Revoked ${what}${why}`;
  }
  return `Expired ${what}`;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
