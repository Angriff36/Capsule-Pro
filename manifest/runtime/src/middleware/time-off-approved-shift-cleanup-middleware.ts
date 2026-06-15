/**
 * TimeOffRequestApproved → conflicting ScheduleShift cleanup middleware
 * (IMPLEMENTATION_PLAN P1, Staffing → "TimeOffRequestApproved → conflicting
 * shift cleanup").
 *
 * WHY this exists: approving an employee's time-off request must take that
 * employee OFF any shifts that fall inside the approved window — otherwise the
 * person is simultaneously "on approved PTO" and "rostered to work", which is a
 * double-booking the schedule should never show. Until this middleware existed,
 * `TimeOffRequestApproved` (time-off-request-rules.manifest:155) had ZERO
 * consumers: approving time off changed only the request's own status and left
 * every conflicting shift live, so a manager had to remember to hunt down and
 * remove each clashing shift by hand.
 *
 * WHY middleware and not a reaction (the structural reason, per the verified
 * engine-semantics correction in IMPLEMENTATION_PLAN P0):
 *   - It is a 1:N fan-out: one approved request → MANY conflicting
 *     `ScheduleShift` rows. A declarative reaction resolves exactly ONE target
 *     instance, so it cannot reach the set.
 *   - The fields needed to find the conflicts (`employeeId`, `startDate`,
 *     `endDate`) are the TimeOffRequest's OWN fields, NOT `approve` input params
 *     — and the engine payload is `{ ...commandInput, result }` only (declared
 *     event fields are never auto-populated from self.*). `TimeOffRequestApproved`
 *     carries only `{requestId, processedBy, processedAt}`, so the request must be
 *     LOADED from the store and the shifts QUERIED by employee + date.
 *
 * Resolution: on `TimeOffRequestApproved`, load the approved TimeOffRequest via
 * `_subject.id`, read `employeeId`/`startDate`/`endDate`, then scan
 * `ScheduleShift` for that employee + tenant whose shift window OVERLAPS the
 * approved time-off range and dispatch the governed `ScheduleShift.remove` on
 * each. The window is whole-day inclusive: a shift conflicts when it starts
 * before the day after `endDate` and ends on or after `startDate`.
 *
 * Guard-safe + idempotent: already-removed (soft-deleted) shifts are filtered out
 * before dispatch, so a re-delivered `TimeOffRequestApproved` re-scans and finds
 * nothing to remove; each dispatch also carries a per-(request, shift)
 * idempotency key. Every skip path reports through `onDiagnostic` (default:
 * console.warn) rather than returning silently.
 *
 * KNOWN LIMITATION — restore-on-cancel is NOT implemented here (deliberately
 * deferred, documented not silent): cancelling an approved time-off request does
 * not bring the removed shifts back. Two prerequisites are missing: (1)
 * `ScheduleShift` has no `restore` command (its only un-delete path would be a new
 * command mutating `deletedAt = null` → an IR/source change), and (2) there is no
 * removal-provenance link on a soft-deleted shift, so a cancel handler could not
 * tell which soft-deleted shifts were removed BY this request versus removed for
 * unrelated reasons — restoring by employee+date alone would resurrect shifts a
 * manager deleted on purpose. Wiring restore correctly needs both a `restore`
 * command and a provenance marker; tracked as a follow-up.
 *
 * KNOWN LIMITATION (documented, not silent): each `ScheduleShift.remove` dispatch
 * runs as the SAME actor who approved the request and is subject to
 * `ScheduleShift`'s policy (`user.role in ["manager", "admin"]`). A manager/admin
 * approving time off (the common case) passes; but `TimeOffRequest.approve`'s own
 * policy also admits `hr_admin`/`payroll_admin`, who are NOT manager/admin — for
 * those actors the remove is policy-denied and the shift is skipped with a
 * diagnostic (the runtime has no per-call identity override).
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

export interface TimeOffApprovedShiftCleanupDiagnostic {
  detail?: Record<string, unknown>;
  employeeId?: string;
  reason: string;
  requestId?: string;
  shiftId?: string;
  stage: string;
  tenantId?: string;
}

export interface TimeOffApprovedShiftCleanupMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: TimeOffApprovedShiftCleanupDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface TimeOffRequestLike {
  employeeId?: unknown;
  endDate?: unknown;
  startDate?: unknown;
  tenantId?: unknown;
}

interface ScheduleShiftLike {
  deletedAt?: unknown;
  employeeId?: unknown;
  id?: unknown;
  shiftEnd?: unknown;
  shiftStart?: unknown;
  tenantId?: unknown;
}

interface TimeOffApprovedPayload {
  processedBy?: unknown;
  tenantId?: unknown;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const defaultDiagnostic = (
  diag: TimeOffApprovedShiftCleanupDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[timeoff-shift-cleanup:${diag.stage}] ${diag.reason}`, {
    requestId: diag.requestId,
    employeeId: diag.employeeId,
    shiftId: diag.shiftId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that removes an employee's conflicting scheduled shifts when
 * their time-off request is approved. Store/provider based so tests and
 * production share the same Manifest runtime boundary.
 */
export function createTimeOffApprovedShiftCleanupMiddleware(
  options: TimeOffApprovedShiftCleanupMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine TimeOffRequest.approve — not a look-alike event.
      if (
        !(
          ctx.entityName === "TimeOffRequest" && ctx.command.name === "approve"
        )
      ) {
        return {};
      }

      const approvedEvents = ctx.emittedEvents.filter(
        (event) => event.name === "TimeOffRequestApproved"
      );

      for (const event of approvedEvents) {
        const payload = event.payload as TimeOffApprovedPayload | undefined;

        // The request id is the engine-stamped source instance id; the declared
        // event fields (employeeId/startDate/endDate) are NOT auto-populated from
        // self.*, so the request itself must be loaded for them.
        const requestId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        // The approver becomes the actor of record on each shift removal.
        const userId = asNonEmptyString(payload?.processedBy) ?? "system";

        if (!(requestId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `TimeOffRequestApproved missing ${requestId ? "tenantId" : "requestId"}`,
            requestId,
            tenantId,
          });
          continue;
        }

        const requestStore = storeProvider("TimeOffRequest");
        const shiftStore = storeProvider("ScheduleShift");
        if (!(requestStore && shiftStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "TimeOffRequest or ScheduleShift store unavailable — shifts not cleaned up",
            requestId,
            tenantId,
            detail: { request: !!requestStore, shift: !!shiftStore },
          });
          continue;
        }

        const request = (await requestStore.getById(requestId)) as
          | TimeOffRequestLike
          | undefined;
        if (!request) {
          onDiagnostic({
            stage: "load",
            reason: "approved time-off request not found in store",
            requestId,
            tenantId,
          });
          continue;
        }

        const employeeId = asNonEmptyString(request.employeeId);
        const rangeStartMs = toDayStartMs(request.startDate);
        const rangeEndMs = toDayStartMs(request.endDate);
        if (!employeeId) {
          onDiagnostic({
            stage: "employee",
            reason: "approved request has no employeeId — nothing to clean up",
            requestId,
            tenantId,
          });
          continue;
        }
        if (rangeStartMs === undefined || rangeEndMs === undefined) {
          onDiagnostic({
            stage: "range",
            reason: "approved request has an unparseable start/end date — cannot scope shifts",
            requestId,
            employeeId,
            tenantId,
            detail: { startDate: request.startDate, endDate: request.endDate },
          });
          continue;
        }
        // Whole-day inclusive upper bound: midnight after `endDate`.
        const rangeEndExclusiveMs = rangeEndMs + DAY_MS;

        // Conflicting shifts: this employee's active shifts whose window overlaps
        // the approved range. Overlap = starts before the day after endDate AND
        // ends on/after startDate.
        const conflicts = (await shiftStore.getAll())
          .map((row) => row as ScheduleShiftLike)
          .filter((row) => {
            if (asNonEmptyString(row.tenantId) !== tenantId) {
              return false;
            }
            if (asNonEmptyString(row.employeeId) !== employeeId) {
              return false;
            }
            if (isRemoved(row.deletedAt)) {
              return false;
            }
            const startMs = toMs(row.shiftStart);
            if (startMs === undefined) {
              return false;
            }
            const endMs = toMs(row.shiftEnd) ?? startMs;
            return startMs < rangeEndExclusiveMs && endMs >= rangeStartMs;
          });

        if (conflicts.length === 0) {
          onDiagnostic({
            stage: "scan",
            reason: "no conflicting shifts for approved time off",
            requestId,
            employeeId,
            tenantId,
          });
          continue;
        }

        for (const shift of conflicts) {
          const shiftId = asNonEmptyString(shift.id);
          if (!shiftId) {
            continue;
          }

          const result = await dispatchCommand(
            "remove",
            { userId },
            {
              entityName: "ScheduleShift",
              instanceId: shiftId,
              correlationId: requestId,
              causationId: "TimeOffRequestApproved",
              idempotencyKey: `timeoff-shift-cleanup:${tenantId}:${requestId}:${shiftId}`,
            }
          );

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "remove",
              reason: `ScheduleShift.remove failed for ${shiftId}: ${result.error ?? "unknown"}`,
              requestId,
              employeeId,
              shiftId,
              tenantId,
            });
            continue;
          }

          onDiagnostic({
            stage: "removed",
            reason: "conflicting shift removed for approved time off",
            requestId,
            employeeId,
            shiftId,
            tenantId,
          });
        }
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** A removed shift carries a non-null/non-empty `deletedAt`. */
function isRemoved(value: unknown): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.length > 0;
  }
  // epoch-ms number or Date → removed.
  return true;
}

/** Coerce an epoch-ms number / ISO string / Date to epoch ms (undefined if unparseable). */
function toMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}

/**
 * Floor a date value (plain "YYYY-MM-DD" string, full ISO datetime, epoch-ms
 * number, or Date) to the start of its UTC day in epoch ms. Flooring to a
 * multiple of DAY_MS aligns to UTC midnight (epoch 0 is UTC midnight), so a
 * whole-day time-off range compares cleanly against epoch-ms shift datetimes.
 */
function toDayStartMs(value: unknown): number | undefined {
  const ms = toMs(value);
  if (ms === undefined) {
    return undefined;
  }
  return Math.floor(ms / DAY_MS) * DAY_MS;
}
