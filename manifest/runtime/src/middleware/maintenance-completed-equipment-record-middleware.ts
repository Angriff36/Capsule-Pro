/**
 * MaintenanceWorkOrder completion → Equipment maintenance record middleware.
 *
 * Runs inside the Manifest runtime lifecycle after a `MaintenanceWorkOrder.completeWork`
 * command emits `MaintenanceWorkOrderCompleted`. Completing a work order is supposed to
 * record the maintenance on the parent Equipment (refresh lastMaintenanceDate /
 * nextMaintenanceDate) and return the equipment to active status, but the two old
 * reactions (`on MaintenanceWorkOrderCompleted run Equipment.recordMaintenance` and
 * `... run Equipment.updateStatus`) were SILENT NO-OPs: both resolved
 * `payload.result.equipmentId`, and `completeWork` is a MUTATE command, so the engine's
 * emitted payload `{ ...commandInput, result }` carries `result` = the last mutate's
 * scalar (`completedAt`), NOT the MaintenanceWorkOrder instance. So completed work orders
 * never touched the equipment record — maintenance history silently diverged from reality
 * and equipment taken into maintenance was never brought back to active automatically.
 *
 * WHY middleware and not a reaction (the crux — matches the verified engine-semantics
 * correction in IMPLEMENTATION_PLAN P0): `equipmentId` is the MaintenanceWorkOrder's OWN
 * field, NOT a `completeWork` param, and declared event fields are never auto-populated
 * from `self.*` — so no reaction (even reading `payload.*`) can see it. The middleware
 * loads the completed work order from the store via `_subject.id`, reads
 * `self.equipmentId`, and dispatches the governed `Equipment.recordMaintenance`. The
 * genuine `completeWork` params (`totalCost`, `userId`) DO ride the payload, so cost /
 * performer come from there (with the work order's own fields as fallback).
 *
 * Only ONE command is dispatched: `recordMaintenance` itself mutates `status = "active"`,
 * which subsumes the old redundant `updateStatus -> "active"` reaction. Dispatching both
 * would make `updateStatus`'s `newStatus != self.status` guard fail once
 * recordMaintenance has already set active (a Rule-7 collapse of two conflicting
 * propagations into the one that actually carries the effect).
 *
 * Completing a work order is a one-shot record, so the idempotency key is per
 * MaintenanceWorkOrder — re-dispatching `recordMaintenance` for the same completion would
 * re-stamp the maintenance dates. Every skip path reports through `onDiagnostic` instead
 * of silently returning.
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

export interface MaintenanceEquipmentRecordDiagnostic {
  detail?: Record<string, unknown>;
  equipmentId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
  workOrderId?: string;
}

export interface MaintenanceCompletedEquipmentRecordMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: MaintenanceEquipmentRecordDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface MaintenanceWorkOrderCompletedPayload {
  tenantId?: unknown;
  totalCost?: unknown;
  userId?: unknown;
}

interface MaintenanceWorkOrderLike {
  assignedTo?: unknown;
  completedAt?: unknown;
  equipmentId?: unknown;
  totalCost?: unknown;
  workOrderType?: unknown;
}

const COMPLETE_COMMANDS = new Set(["completeWork"]);

// recordMaintenance guards `maintenanceType in [preventive, corrective, emergency]`.
// MaintenanceWorkOrder.workOrderType has a wider set (repair/replacement/inspection/
// upgrade); map those down to "corrective" so the dispatch never trips the guard.
const RECORD_MAINTENANCE_TYPES = new Set(["preventive", "corrective", "emergency"]);

const defaultDiagnostic = (
  diag: MaintenanceEquipmentRecordDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[maintenance-equipment:${diag.stage}] ${diag.reason}`, {
    equipmentId: diag.equipmentId,
    tenantId: diag.tenantId,
    workOrderId: diag.workOrderId,
    ...diag.detail,
  });
};

/**
 * Create middleware that records maintenance on the parent equipment when a
 * MaintenanceWorkOrder is completed. Store/provider based so tests and production
 * share the same Manifest runtime boundary.
 */
export function createMaintenanceCompletedEquipmentRecordMiddleware(
  options: MaintenanceCompletedEquipmentRecordMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine MaintenanceWorkOrder.completeWork mutation, not a
      // look-alike event from another entity/command.
      if (ctx.entityName !== "MaintenanceWorkOrder") {
        return {};
      }

      const completed = ctx.emittedEvents.filter(
        (event) =>
          event.name === "MaintenanceWorkOrderCompleted" &&
          COMPLETE_COMMANDS.has(ctx.command.name)
      );

      for (const event of completed) {
        const payload = event.payload as
          | MaintenanceWorkOrderCompletedPayload
          | undefined;

        const workOrderId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(workOrderId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `MaintenanceWorkOrderCompleted missing ${
              workOrderId ? "tenantId" : "workOrderId"
            }`,
            tenantId,
            workOrderId,
          });
          continue;
        }

        const workOrderStore = storeProvider("MaintenanceWorkOrder");
        const equipmentStore = storeProvider("Equipment");
        if (!(workOrderStore && equipmentStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "MaintenanceWorkOrder/Equipment store unavailable",
            tenantId,
            workOrderId,
          });
          continue;
        }

        const workOrder = (await workOrderStore.getById(workOrderId)) as
          | MaintenanceWorkOrderLike
          | undefined;
        if (!workOrder) {
          onDiagnostic({
            stage: "load",
            reason: "MaintenanceWorkOrder not found in store",
            tenantId,
            workOrderId,
          });
          continue;
        }

        // equipmentId is the work order's OWN field — the whole reason this is
        // middleware, not a reaction.
        const equipmentId = asNonEmptyString(workOrder.equipmentId);
        if (!equipmentId) {
          onDiagnostic({
            stage: "equipmentId",
            reason: "work order carries no equipmentId — nothing to record",
            tenantId,
            workOrderId,
          });
          continue;
        }

        const equipment = await equipmentStore.getById(equipmentId);
        if (!equipment) {
          onDiagnostic({
            stage: "equipment-load",
            reason: "linked Equipment not found — cannot record maintenance",
            equipmentId,
            tenantId,
            workOrderId,
          });
          continue;
        }

        // recordMaintenance guards `maintenanceDate != null` and computes
        // nextMaintenanceDate = addDays(maintenanceDate, interval); use the work
        // order's completion timestamp (epoch ms) so the record is honest.
        const maintenanceDate =
          asFiniteNumber(workOrder.completedAt) ?? Date.now();

        const workOrderType = asNonEmptyString(workOrder.workOrderType);
        const maintenanceType =
          workOrderType && RECORD_MAINTENANCE_TYPES.has(workOrderType)
            ? workOrderType
            : "corrective";

        const performedBy =
          asNonEmptyString(payload?.userId) ??
          asNonEmptyString(workOrder.assignedTo) ??
          "system";

        const cost =
          asFiniteNumber(payload?.totalCost) ??
          asFiniteNumber(workOrder.totalCost) ??
          0;

        const result = await dispatchCommand(
          "recordMaintenance",
          {
            // recordMaintenance is a MUTATE on an existing equipment — the id
            // travels in the body AND as instanceId (mutate-dispatch contract).
            id: equipmentId,
            tenantId,
            maintenanceDate,
            maintenanceType,
            performedBy,
            cost,
            notes: "Auto-recorded from work order completion",
          },
          {
            entityName: "Equipment",
            instanceId: equipmentId,
            correlationId: workOrderId,
            causationId: "MaintenanceWorkOrderCompleted",
            // Per completed work order — re-emitting the completion must not
            // re-stamp the maintenance dates. (Effective once dispatcher
            // idempotency is enabled; inert but harmless today.)
            idempotencyKey: `maintenance-complete:${tenantId}:${workOrderId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "recordMaintenance",
            reason: `Equipment.recordMaintenance failed: ${
              result.error ?? "unknown"
            }`,
            equipmentId,
            tenantId,
            workOrderId,
            detail: { maintenanceDate, maintenanceType, cost },
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `recorded ${maintenanceType} maintenance @ ${cost}`,
          equipmentId,
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

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // money/decimal fields may surface as strings from the store/payload.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
