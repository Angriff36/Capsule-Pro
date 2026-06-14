/**
 * PrepTask lifecycle → Station active-task-count reconciliation middleware.
 *
 * Runs inside the Manifest runtime lifecycle after a PrepTask lifecycle event is
 * emitted (claim / complete / cancel / unclaim / release / reassign). It keeps
 * the GOVERNED, stored `Station.currentTaskCount` in step with reality so the
 * Station capacity feature actually functions.
 *
 * WHY a recompute, not +1/-1 deltas (the crux):
 *   - `Station.currentTaskCount` is read by the capacity computeds
 *     (`isAtCapacity`/`capacityRemaining`/…) AND, more importantly, by the
 *     `assignTask` `blockFull` / `warnNearCapacity` constraints. But NOTHING in
 *     the runtime ever moved it — `assignTask`/`removeTask` have no reaction or
 *     middleware caller — so it stayed at its create-time 0 and the capacity
 *     enforcement was inert (a capacity-3 station would never block a 4th task).
 *   - A naive delta middleware (`+1` on claim, `-1` on complete) CANNOT close the
 *     loop: `PrepTask.unclaim` and `PrepTask.release` CLEAR `stationId` in the
 *     same mutate that opens the task, so by the after-emit hook the row no longer
 *     knows which station to decrement (and the partial event payloads don't carry
 *     it — declared event fields are never auto-populated from `self.*`). The
 *     count would leak upward forever.
 *   - So instead, on any station-affecting PrepTask event we RECOMPUTE the true
 *     occupancy of every station for the tenant (= number of `in_progress`
 *     PrepTasks whose `stationId` points at it) and dispatch the governed,
 *     absolute `Station.syncTaskCount(count)` for any station whose stored count
 *     drifted. This is correct on every path (incl. unclaim/release, where the
 *     now-empty station falls out of the occupancy map and is reset to 0) and is
 *     naturally idempotent — it only dispatches on a real difference.
 *
 * Middleware (not a reaction) because (a) a reaction resolves exactly one target
 * instance, but this fans out across all of a tenant's stations, and (b) the
 * occupancy is derived from a cross-entity scan of PrepTask rows, which a
 * declarative reaction cannot express.
 *
 * Every skip path reports through `onDiagnostic` (default: console.warn) instead
 * of silently returning, so reconciliation gaps are visible in logs and tests.
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

export interface PrepTaskStationCountDiagnostic {
  detail?: Record<string, unknown>;
  reason: string;
  stage: string;
  stationId?: string;
  tenantId?: string;
}

export interface PrepTaskStationCountMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: PrepTaskStationCountDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface EventPayload {
  tenantId?: unknown;
}

interface PrepTaskLike {
  status?: unknown;
  stationId?: unknown;
  tenantId?: unknown;
}

interface StationLike {
  currentTaskCount?: unknown;
  deletedAt?: unknown;
  id?: unknown;
  name?: unknown;
  tenantId?: unknown;
}

/**
 * PrepTask events whose handling can change which station(s) hold active tasks.
 * `claim` assigns a task to a station; complete/cancel free it; unclaim/release
 * open it (clearing stationId); reassign keeps it at the station but is included
 * so a recompute runs if the underlying status ever changes. `start` is omitted
 * deliberately — it sets in_progress WITHOUT a station, so it never alters any
 * station's occupancy.
 */
const TRIGGER_EVENTS = new Set<string>([
  "PrepTaskClaimed",
  "PrepTaskCompleted",
  "PrepTaskCanceled",
  "PrepTaskUnclaimed",
  "PrepTaskReleased",
  "PrepTaskReassigned",
]);

/** A PrepTask occupies a station only while it is actively being worked. */
const ACTIVE_STATUS = "in_progress";

const defaultDiagnostic = (diag: PrepTaskStationCountDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[prep-task-station-count:${diag.stage}] ${diag.reason}`, {
    stationId: diag.stationId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that reconciles each station's stored `currentTaskCount` with
 * the real number of in-progress prep tasks assigned to it whenever a prep task's
 * lifecycle changes. Store/provider based so tests and production share the same
 * Manifest runtime boundary.
 */
export function createPrepTaskStationCountMiddleware(
  options: PrepTaskStationCountMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "PrepTask") {
        return {};
      }
      const triggers = ctx.emittedEvents.filter((event) =>
        TRIGGER_EVENTS.has(event.name)
      );
      if (triggers.length === 0) {
        return {};
      }

      // The recompute is over the WHOLE tenant, so it runs once per command no
      // matter how many trigger events fired.
      const tenantId =
        asNonEmptyString((triggers[0].payload as EventPayload).tenantId) ??
        asNonEmptyString(
          (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
            ?.tenantId
        );
      if (!tenantId) {
        onDiagnostic({
          stage: "resolve",
          reason: "PrepTask lifecycle event carried no resolvable tenantId",
        });
        return {};
      }

      const prepTaskStore = storeProvider("PrepTask");
      const stationStore = storeProvider("Station");
      if (!prepTaskStore || !stationStore) {
        onDiagnostic({
          stage: "stores",
          reason: "PrepTask or Station store unavailable",
          tenantId,
        });
        return {};
      }

      // True occupancy: count in-progress tasks per station for this tenant.
      const allTasks = await prepTaskStore.getAll();
      const countByStation = new Map<string, number>();
      for (const raw of allTasks) {
        const task = raw as PrepTaskLike;
        if (asNonEmptyString(task.tenantId) !== tenantId) {
          continue;
        }
        if (asNonEmptyString(task.status) !== ACTIVE_STATUS) {
          continue;
        }
        const stationId = asNonEmptyString(task.stationId);
        if (!stationId) {
          continue;
        }
        countByStation.set(stationId, (countByStation.get(stationId) ?? 0) + 1);
      }

      // Reconcile EVERY station for the tenant (not just occupied ones) so a
      // station emptied by unclaim/release/complete is reset to 0 too.
      const allStations = await stationStore.getAll();
      for (const raw of allStations) {
        const station = raw as StationLike;
        if (asNonEmptyString(station.tenantId) !== tenantId) {
          continue;
        }
        if (station.deletedAt != null) {
          continue;
        }
        const stationId = asNonEmptyString(station.id);
        if (!stationId) {
          continue;
        }
        const target = countByStation.get(stationId) ?? 0;
        const current = asNumber(station.currentTaskCount);
        if (target === current) {
          continue;
        }

        // No idempotencyKey by design: syncTaskCount MUST re-run whenever the
        // count drifts (a static key would suppress every sync after the first),
        // and it is naturally idempotent (absolute set) — guarded here by the
        // target !== current check so we never dispatch a no-op.
        const syncResult = await dispatchCommand(
          "syncTaskCount",
          { count: target },
          {
            entityName: "Station",
            instanceId: stationId,
            causationId: triggers[0].name,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? stationId,
          }
        );

        if (syncResult.emittedEvents) {
          ctx.emittedEvents.push(...syncResult.emittedEvents);
        }
        if (!syncResult.success) {
          // Most likely a policy denial (the reconciliation runs as the acting
          // user; Station's default policy admits kitchen_staff and up). Surfaced,
          // not fatal — other stations still reconcile.
          onDiagnostic({
            stage: "sync",
            reason: `Station.syncTaskCount failed for ${stationId}: ${syncResult.error ?? "unknown"}`,
            stationId,
            tenantId,
            detail: {
              target,
              current,
              stationName: asNonEmptyString(station.name),
            },
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
