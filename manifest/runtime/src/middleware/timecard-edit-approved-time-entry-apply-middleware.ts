/**
 * TimecardEditApproved → TimeEntry.applyEdit middleware.
 *
 * Completes the propagation "when a manager approves a timecard edit request, the
 * corrected clock times actually land on the TimeEntry" — without it, approved edits
 * were silently lost and payroll/labor kept using the uncorrected hours.
 *
 * WHY this is middleware and not a reaction (the crux):
 * `TimecardEditRequest.approve(userId)` is a MUTATE command (it `mutate status =
 * "approved"`), so the engine's emitted payload is `{ ...commandInput, result }` where
 * `result` is the last mutate's scalar, NOT the request instance. The values to apply —
 * `requestedClockIn` / `requestedClockOut` / `requestedBreakMinutes` and the target
 * `timeEntryId` — are the TimecardEditRequest's OWN fields, and `approve` takes only
 * `userId`. Declared event fields (`TimecardEditApproved.timeEntryId`) are NEVER
 * auto-populated from `self.*`. So NO reaction (even one reading `payload.*`) can ever
 * see the corrected values. This middleware instead LOADS the approved request from the
 * store, reads its own fields, and dispatches the governed `TimeEntry.applyEdit`.
 *
 * Coalescing lives in the COMMAND, not here: `applyEdit` does
 * `mutate clockIn = clockIn != null ? clockIn : self.clockIn` (same for clockOut), so a
 * partial edit (only one clock field requested) can never blank a real clock time even
 * if this middleware forwards a null. `requestedBreakMinutes` is `int` (defaults 0,
 * never null), so the break value applies through directly.
 *
 * Guard-safe + idempotent: `TimeEntry.applyEdit` guards `self.deletedAt == null`, so the
 * middleware loads the TimeEntry first and SKIPS a deleted/missing entry rather than
 * producing a swallowed guard failure. `approve` itself can only fire once per request
 * (its `status == "pending"` guard + the pending→approved transition), so the event is
 * naturally single-shot; the per-request idempotency key guards a re-emitted event.
 * Every skip and failure reports through `onDiagnostic` — never silent.
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

export interface TimecardEditApplyDiagnostic {
  detail?: Record<string, unknown>;
  reason: string;
  requestId?: string;
  stage: string;
  tenantId?: string;
  timeEntryId?: string;
}

export interface TimecardEditApprovedTimeEntryApplyMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: TimecardEditApplyDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface EditRequestLike {
  requestedBreakMinutes?: unknown;
  requestedClockIn?: unknown;
  requestedClockOut?: unknown;
  tenantId?: unknown;
  timeEntryId?: unknown;
}

interface TimeEntryLike {
  deletedAt?: unknown;
}

const defaultDiagnostic = (diag: TimecardEditApplyDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[timecard-edit:${diag.stage}] ${diag.reason}`, {
    requestId: diag.requestId,
    timeEntryId: diag.timeEntryId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createTimecardEditApprovedTimeEntryApplyMiddleware(
  options: TimecardEditApprovedTimeEntryApplyMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const approvedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "TimecardEditApproved" &&
          ctx.entityName === "TimecardEditRequest" &&
          ctx.command.name === "approve"
      );

      for (const event of approvedEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const requestId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(requestId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `TimecardEditApproved missing ${requestId ? "tenantId" : "requestId"}`,
            requestId,
            tenantId,
          });
          continue;
        }

        const requestStore = storeProvider("TimecardEditRequest");
        const timeEntryStore = storeProvider("TimeEntry");
        if (!(requestStore && timeEntryStore)) {
          onDiagnostic({
            stage: "stores",
            reason:
              "TimecardEditRequest or TimeEntry store unavailable — edit not applied",
            requestId,
            tenantId,
            detail: { request: !!requestStore, timeEntry: !!timeEntryStore },
          });
          continue;
        }

        const request = (await requestStore.getById(requestId)) as
          | EditRequestLike
          | undefined;
        if (!request) {
          onDiagnostic({
            stage: "load",
            reason: "approved edit request not found in store — cannot apply",
            requestId,
            tenantId,
          });
          continue;
        }

        const timeEntryId = asNonEmptyString(request.timeEntryId);
        if (!timeEntryId) {
          onDiagnostic({
            stage: "timeEntryId",
            reason: "approved edit request has no timeEntryId — nothing to apply",
            requestId,
            tenantId,
          });
          continue;
        }

        // Guard-safe: TimeEntry.applyEdit requires `self.deletedAt == null`. Loading
        // first lets us skip a deleted/missing entry cleanly instead of triggering a
        // swallowed guard failure inside the dispatched command.
        const entry = (await timeEntryStore.getById(timeEntryId)) as
          | TimeEntryLike
          | undefined;
        if (!entry) {
          onDiagnostic({
            stage: "entry-load",
            reason: "linked time entry not found in store — cannot apply edit",
            requestId,
            timeEntryId,
            tenantId,
          });
          continue;
        }
        if (entry.deletedAt != null) {
          onDiagnostic({
            stage: "deleted",
            reason: "linked time entry is deleted — skip applying edit",
            requestId,
            timeEntryId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "applyEdit",
          {
            // applyEdit is a MUTATE on the existing TimeEntry; the target id rides
            // both the body (`id`) and `instanceId` so persistence keys correctly
            // regardless of which the engine uses (mirrors the other mutate-dispatch
            // middleware). Clock times forward as-is (null preserved → the command
            // coalesces against the current value); break is a concrete int.
            id: timeEntryId,
            tenantId,
            clockIn: request.requestedClockIn ?? null,
            clockOut: request.requestedClockOut ?? null,
            breakMinutes:
              typeof request.requestedBreakMinutes === "number"
                ? request.requestedBreakMinutes
                : 0,
          },
          {
            entityName: "TimeEntry",
            instanceId: timeEntryId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? requestId,
            causationId: "TimecardEditApproved",
            idempotencyKey: `timecard-edit:${tenantId}:${requestId}:applyEdit`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "applyEdit",
            reason: `TimeEntry.applyEdit failed: ${result.error ?? "unknown"}`,
            requestId,
            timeEntryId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "approved timecard edit applied to time entry",
          requestId,
          timeEntryId,
          tenantId,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
