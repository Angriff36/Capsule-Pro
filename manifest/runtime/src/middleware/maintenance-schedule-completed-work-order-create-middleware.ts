/**
 * MaintenanceScheduleCompleted → MaintenanceWorkOrder.create middleware.
 *
 * Closes the broken preventive-maintenance RECURRENCE LOOP. A
 * `PreventiveMaintenanceSchedule` (staff-logistics-extended-rules.manifest:834)
 * is the recurring template — "service walk-in cooler every 30 days". Its
 * `complete(nextDueAt)` command rolls the schedule forward (sets the NEW
 * `nextDueAt`, stamps `lastCompletedAt`) and emits `MaintenanceScheduleCompleted`,
 * but that event had ZERO consumers: nothing opened the work order for the next
 * cycle, so once the first manually-created work order was done the recurrence
 * silently stopped — preventive maintenance never got scheduled again. This
 * middleware turns each completion into the next governed `MaintenanceWorkOrder`,
 * scheduled for the schedule's new `nextDueAt`.
 *
 * WHY this is middleware and not a reaction (the crux):
 * `complete(nextDueAt)` is a MUTATE command, so the emitted payload is
 * `{ ...commandInput, result }` — `nextDueAt` rides it (it IS an input param), but
 * everything else the work order needs (`equipmentId`, `areaId`, `title`,
 * `description`, `assignedTo`, `scheduleNumber`) is the SCHEDULE's OWN field, NOT a
 * `complete` param, and declared event fields (`MaintenanceScheduleCompleted.equipmentId`
 * etc.) are NEVER auto-populated from `self.*`. A reaction can only see the (one)
 * input param plus `_subject.id`; it structurally cannot read the schedule's fields.
 * The middleware instead LOADS the `PreventiveMaintenanceSchedule` via `_subject.id`
 * and dispatches the governed, EXPLICIT `MaintenanceWorkOrder.create`
 * (equipment-rules.manifest:303) — the new id travels in the body, never as
 * `instanceId` (a create targets a new row; see lead-converted-deal-create).
 *
 * Guard-safe + idempotent:
 *  - The created row passes the target's create guards/invariants by construction:
 *    `workOrderType = "preventive"`, `priority = "medium"`, `status` defaults to
 *    `"open"` — all in `validWorkOrderType`/`validPriority`/`validStatus`.
 *  - Re-emitting the SAME completion must not double-open the cycle's work order:
 *    a store-scan skips when a non-terminal `preventive` work order already exists
 *    for the same asset (equipmentId, else areaId) AND the same `scheduledDate`
 *    (the recurrence's `nextDueAt`). A genuine NEXT completion carries a DIFFERENT
 *    `nextDueAt`, so it opens a fresh work order. A stable `idempotencyKey` is a
 *    second backstop.
 * Every skip and failure reports through `onDiagnostic` — never silent.
 *
 * KNOWN LIMITATION (documented, not silent): the dispatch runs as the actor who
 * completed the schedule, subject to `MaintenanceWorkOrder.create`'s policy
 * (facility_manager/facilities_manager/manager/admin). The schedule's own
 * `complete` policy is the same set, so the common path passes; a lower-privilege
 * actor's completion yields a policy-denied diagnostic + skip (the runtime has no
 * per-call identity override).
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

export interface MaintenanceScheduleWorkOrderDiagnostic {
  detail?: Record<string, unknown>;
  reason: string;
  scheduleId?: string;
  stage: string;
  tenantId?: string;
  workOrderId?: string;
}

export interface MaintenanceScheduleCompletedWorkOrderCreateMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: MaintenanceScheduleWorkOrderDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface ScheduleLike {
  areaId?: unknown;
  assignedTo?: unknown;
  description?: unknown;
  equipmentId?: unknown;
  nextDueAt?: unknown;
  scheduleNumber?: unknown;
  tenantId?: unknown;
  title?: unknown;
}

interface WorkOrderLike {
  areaId?: unknown;
  equipmentId?: unknown;
  scheduledDate?: unknown;
  status?: unknown;
  tenantId?: unknown;
  workOrderType?: unknown;
}

const TERMINAL_WORK_ORDER_STATUS = new Set(["completed", "cancelled"]);

const defaultDiagnostic = (
  diag: MaintenanceScheduleWorkOrderDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[pm-schedule-recurrence:${diag.stage}] ${diag.reason}`, {
    scheduleId: diag.scheduleId,
    tenantId: diag.tenantId,
    workOrderId: diag.workOrderId,
    ...diag.detail,
  });
};

export function createMaintenanceScheduleCompletedWorkOrderCreateMiddleware(
  options: MaintenanceScheduleCompletedWorkOrderCreateMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const completions = ctx.emittedEvents.filter(
        (event) =>
          event.name === "MaintenanceScheduleCompleted" &&
          ctx.entityName === "PreventiveMaintenanceSchedule" &&
          ctx.command.name === "complete"
      );

      for (const event of completions) {
        const payload = event.payload as
          | { nextDueAt?: unknown; tenantId?: unknown }
          | undefined;
        const scheduleId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        if (!scheduleId) {
          onDiagnostic({
            stage: "resolve",
            reason: "MaintenanceScheduleCompleted missing scheduleId",
          });
          continue;
        }

        const scheduleStore = storeProvider("PreventiveMaintenanceSchedule");
        const workOrderStore = storeProvider("MaintenanceWorkOrder");
        if (!(scheduleStore && workOrderStore)) {
          onDiagnostic({
            stage: "stores",
            reason:
              "PreventiveMaintenanceSchedule or MaintenanceWorkOrder store unavailable — recurrence not scheduled",
            scheduleId,
            detail: {
              schedule: !!scheduleStore,
              workOrder: !!workOrderStore,
            },
          });
          continue;
        }

        const schedule = (await scheduleStore.getById(scheduleId)) as
          | ScheduleLike
          | undefined;
        if (!schedule) {
          onDiagnostic({
            stage: "load",
            reason:
              "completed schedule not found in store — cannot open next work order",
            scheduleId,
          });
          continue;
        }

        const tenantId =
          asNonEmptyString(schedule.tenantId) ??
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!tenantId) {
          onDiagnostic({
            stage: "resolve",
            reason: "completed schedule has no resolvable tenantId",
            scheduleId,
          });
          continue;
        }

        // The recurrence target = the schedule's NEW nextDueAt. It is a genuine
        // `complete` input param (rides the payload) and is also the post-mutation
        // value on the loaded schedule; prefer the param, fall back to the row.
        const nextDueAt =
          toEpochMs(payload?.nextDueAt) ?? toEpochMs(schedule.nextDueAt);
        if (nextDueAt == null) {
          onDiagnostic({
            stage: "due-date",
            reason: "completed schedule has no nextDueAt — cannot schedule next work order",
            scheduleId,
            tenantId,
          });
          continue;
        }

        const equipmentId = asNonEmptyString(schedule.equipmentId) ?? "";
        const areaId = asNonEmptyString(schedule.areaId) ?? "";

        // Idempotency: skip when a non-terminal preventive work order already
        // exists for this asset at this exact recurrence date (a re-emitted same
        // completion). Only applied when the schedule names an asset; otherwise
        // the idempotencyKey is the sole backstop.
        if (equipmentId || areaId) {
          const duplicate = (await workOrderStore.getAll()).find((row) => {
            const wo = row as WorkOrderLike;
            if (asNonEmptyString(wo.tenantId) !== tenantId) {
              return false;
            }
            if (asNonEmptyString(wo.workOrderType) !== "preventive") {
              return false;
            }
            const status = asNonEmptyString(wo.status) ?? "";
            if (TERMINAL_WORK_ORDER_STATUS.has(status)) {
              return false;
            }
            if (toEpochMs(wo.scheduledDate) !== nextDueAt) {
              return false;
            }
            return equipmentId
              ? asNonEmptyString(wo.equipmentId) === equipmentId
              : asNonEmptyString(wo.areaId) === areaId;
          });
          if (duplicate) {
            onDiagnostic({
              stage: "dedupe",
              reason:
                "a preventive work order already exists for this asset + due date — skip",
              scheduleId,
              tenantId,
            });
            continue;
          }
        }

        const title =
          asNonEmptyString(schedule.title) ?? "Preventive maintenance";
        const scheduleNumber =
          asNonEmptyString(schedule.scheduleNumber) ?? scheduleId;
        const workOrderId = randomUUID();
        const result = await dispatchCommand(
          "create",
          {
            // For a create the new id travels in the body, NOT as instanceId.
            id: workOrderId,
            tenantId,
            title,
            workOrderType: "preventive",
            priority: "medium",
            description: asNonEmptyString(schedule.description) ?? "",
            areaId,
            equipmentId,
            assignedTo: asNonEmptyString(schedule.assignedTo) ?? "",
            reportedBy: "system:pm-schedule",
            scheduledDate: nextDueAt,
            notes: `Auto-generated from preventive maintenance schedule ${scheduleNumber} on completion.`,
          },
          {
            entityName: "MaintenanceWorkOrder",
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? scheduleId,
            causationId: "MaintenanceScheduleCompleted",
            idempotencyKey: `pm-schedule-recurrence:${tenantId}:${scheduleId}:${nextDueAt}`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "create",
            reason: `MaintenanceWorkOrder.create failed: ${result.error ?? "unknown"}`,
            scheduleId,
            tenantId,
            workOrderId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `next preventive work order scheduled for ${nextDueAt}`,
          scheduleId,
          tenantId,
          workOrderId,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Coerce a datetime (epoch ms number, numeric string, or Date) to epoch ms. */
function toEpochMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
