/**
 * ScheduleShift create/remove → Schedule.shiftCount reconciliation middleware
 * (IMPLEMENTATION_PLAN P1, Staffing → the remaining "Schedule.shiftCount
 * increment" leg of "OpenShiftClaimed → ScheduleShift.create", also flagged on
 * the time-off shift-cleanup leg).
 *
 * WHY this exists: `Schedule.shiftCount` is a STORED int (schedule-rules.manifest)
 * that two governed gates read — `Schedule.approve`'s `guard self.shiftCount > 0`
 * and `Schedule.release`'s `blockNoShifts:block self.shiftCount > 0`. But NOTHING
 * ever moved it: `Schedule.create` sets it to 0, and no ScheduleShift create/remove
 * path (governed command OR the manager-create route) ever touched it again. So it
 * sat at 0 and BOTH gates were starved — a schedule with real shifts could neither
 * be approved nor published (the same dead-counter class as the Proposal
 * `lineItemCount` send-deadlock). This keeps the stored count honest so the gates
 * function.
 *
 * WHY a recompute, not +1/-1 deltas (the crux, same lesson as the PrepTask →
 * Station.syncTaskCount precedent):
 *   - `ScheduleShift.remove` is a MUTATE that only sets `deletedAt` and emits
 *     `ScheduleShiftRemoved` whose payload is `{ ...commandInput, result }` =
 *     `{ userId, result }` — it carries NO `scheduleId` (declared event fields are
 *     never auto-populated from `self.*`). A delta middleware would have nothing to
 *     decrement. The row itself persists (soft-deleted), so the middleware LOADS it
 *     via `_subject.id` to recover its `scheduleId`.
 *   - Recomputing the TRUE count (= non-deleted `ScheduleShift` rows for the
 *     schedule) is correct on every path and naturally idempotent. It also HEALS
 *     drift: if shifts were ever created out-of-band (the CSV-importer / setup
 *     bypasses that skip the runtime), the next governed create/remove triggers a
 *     full recompute that picks them up, since it counts the real store state
 *     rather than trusting a running delta.
 *
 * Middleware (not a reaction) because (a) the count is derived from a cross-entity
 * scan of `ScheduleShift` rows, which a declarative reaction cannot express, and
 * (b) the remove path's `scheduleId` is unreachable from the event payload.
 *
 * Dispatches the governed, absolute `Schedule.syncShiftCount(count)` only for a
 * schedule whose stored count drifted from its true shift count (so it never
 * dispatches a no-op). No idempotencyKey by design: a static key would suppress
 * every sync after the first, and the absolute set is already idempotent.
 *
 * KNOWN LIMITATION (documented, not silent): the `syncShiftCount` dispatch runs as
 * the actor who created/removed the shift and is subject to `Schedule`'s default
 * policy (`manager`/`admin`). `ScheduleShift`'s own policy admits `kitchen_lead`
 * too (LeadsCanManageShifts), so a `kitchen_lead` creating/removing a shift yields a
 * policy-denied diagnostic + skip on the sync leg (the runtime has no per-call
 * identity override) — manager/admin (the common path) always passes.
 *
 * Every skip path reports through `onDiagnostic` (default: console.warn) instead of
 * silently returning, so reconciliation gaps are visible in logs and tests.
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

export interface ScheduleShiftCountDiagnostic {
  detail?: Record<string, unknown>;
  reason: string;
  scheduleId?: string;
  stage: string;
  tenantId?: string;
}

export interface ScheduleShiftCountMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: ScheduleShiftCountDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface ScheduleShiftCreatedPayload {
  scheduleId?: unknown;
  tenantId?: unknown;
}

interface ScheduleShiftLike {
  deletedAt?: unknown;
  scheduleId?: unknown;
  tenantId?: unknown;
}

interface ScheduleLike {
  shiftCount?: unknown;
}

/**
 * ScheduleShift events that change how many active shifts a schedule has. `create`
 * adds a row; `remove` soft-deletes one. Swap/update commands keep the row count
 * the same (acceptSwap reassigns the employee, update edits fields) so they are
 * deliberately NOT triggers.
 */
const TRIGGER_EVENTS = new Set<string>([
  "ScheduleShiftCreated",
  "ScheduleShiftRemoved",
]);

const defaultDiagnostic = (diag: ScheduleShiftCountDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[schedule-shift-count:${diag.stage}] ${diag.reason}`, {
    scheduleId: diag.scheduleId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that reconciles each affected schedule's stored `shiftCount`
 * with the real number of non-removed `ScheduleShift` rows whenever a shift is
 * created or removed. Store/provider based so tests and production share the same
 * Manifest runtime boundary.
 */
export function createScheduleShiftCountMiddleware(
  options: ScheduleShiftCountMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "ScheduleShift") {
        return {};
      }
      const triggers = ctx.emittedEvents.filter((event) =>
        TRIGGER_EVENTS.has(event.name)
      );
      const firstTrigger = triggers[0];
      if (!firstTrigger) {
        return {};
      }

      const tenantId =
        asNonEmptyString(
          (firstTrigger.payload as ScheduleShiftCreatedPayload).tenantId
        ) ??
        asNonEmptyString(
          (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
            ?.tenantId
        );
      if (!tenantId) {
        onDiagnostic({
          stage: "resolve",
          reason: "ScheduleShift lifecycle event carried no resolvable tenantId",
        });
        return {};
      }

      const shiftStore = storeProvider("ScheduleShift");
      const scheduleStore = storeProvider("Schedule");
      if (!(shiftStore && scheduleStore)) {
        onDiagnostic({
          stage: "stores",
          reason: "ScheduleShift or Schedule store unavailable",
          tenantId,
        });
        return {};
      }

      // The set of schedules whose count may have changed. `create` carries
      // `scheduleId` (a create param) on the payload; `remove` does NOT, so the
      // soft-deleted row is loaded via `_subject.id` to recover it.
      const affected = new Set<string>();
      for (const event of triggers) {
        const payload = event.payload as ScheduleShiftCreatedPayload;
        let scheduleId = asNonEmptyString(payload.scheduleId);
        if (!scheduleId) {
          const shiftId =
            asNonEmptyString(event.subject?.id) ??
            asNonEmptyString(ctx.instanceId);
          if (shiftId) {
            const shift = (await shiftStore.getById(shiftId)) as
              | ScheduleShiftLike
              | undefined;
            scheduleId = asNonEmptyString(shift?.scheduleId);
          }
        }
        if (scheduleId) {
          affected.add(scheduleId);
        } else {
          onDiagnostic({
            stage: "schedule-ref",
            reason: "shift event has no resolvable scheduleId — cannot reconcile",
            tenantId,
            detail: { event: event.name },
          });
        }
      }
      if (affected.size === 0) {
        return {};
      }

      // True count per affected schedule = non-deleted ScheduleShift rows.
      const allShifts = await shiftStore.getAll();

      for (const scheduleId of affected) {
        let target = 0;
        for (const raw of allShifts) {
          const shift = raw as ScheduleShiftLike;
          if (asNonEmptyString(shift.tenantId) !== tenantId) {
            continue;
          }
          if (asNonEmptyString(shift.scheduleId) !== scheduleId) {
            continue;
          }
          if (shift.deletedAt != null) {
            continue;
          }
          target += 1;
        }

        const schedule = (await scheduleStore.getById(scheduleId)) as
          | ScheduleLike
          | undefined;
        if (!schedule) {
          onDiagnostic({
            stage: "load",
            reason: "schedule not found in store — cannot sync shiftCount",
            scheduleId,
            tenantId,
          });
          continue;
        }

        const current = asNumber(schedule.shiftCount);
        if (target === current) {
          continue;
        }

        // No idempotencyKey by design: syncShiftCount MUST re-run whenever the
        // count drifts (a static key would suppress every sync after the first),
        // and it is naturally idempotent (absolute set) — guarded here by the
        // target !== current check so we never dispatch a no-op.
        const syncResult = await dispatchCommand(
          "syncShiftCount",
          { count: target },
          {
            entityName: "Schedule",
            instanceId: scheduleId,
            causationId: firstTrigger.name,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? scheduleId,
          }
        );

        if (syncResult.emittedEvents) {
          ctx.emittedEvents.push(...syncResult.emittedEvents);
        }
        if (!syncResult.success) {
          // Most likely a policy denial (the sync runs as the acting user;
          // Schedule's default policy is manager/admin while a kitchen_lead may
          // manage shifts). Surfaced, not fatal.
          onDiagnostic({
            stage: "sync",
            reason: `Schedule.syncShiftCount failed for ${scheduleId}: ${syncResult.error ?? "unknown"}`,
            scheduleId,
            tenantId,
            detail: { target, current },
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

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
