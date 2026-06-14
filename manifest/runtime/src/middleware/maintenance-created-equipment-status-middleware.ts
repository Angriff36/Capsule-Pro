/**
 * MaintenanceWorkOrder creation → Equipment "maintenance" status middleware.
 *
 * Runs inside the Manifest runtime lifecycle after a `MaintenanceWorkOrder.create`
 * command emits `MaintenanceWorkOrderCreated`. Opening a work order against a piece of
 * equipment means that equipment is being worked on and should NOT be treated as
 * available — but `MaintenanceWorkOrderCreated` had ZERO consumers, so the parent
 * Equipment stayed `active` (bookable / schedulable) for the entire duration of an open
 * work order. This is the symmetric counterpart of the already-shipped
 * `MaintenanceWorkOrderCompleted → Equipment.recordMaintenance` leg (which returns the
 * equipment to `active`): open the work order ⇒ equipment goes into `maintenance`; complete
 * it ⇒ equipment goes back to `active`. Together they make Equipment status track the
 * work-order lifecycle.
 *
 * NOTE ON THE STATUS VALUE: the plan phrased this as "set equipment under_maintenance",
 * but Equipment has no `under_maintenance` value — its FSM status set is
 * `["active", "maintenance", "out_of_service", "retired"]` and the dedicated
 * `Equipment.updateStatus(newStatus)` command is the governed path. The real intent maps to
 * the existing `"maintenance"` status; no new status / migration is needed.
 *
 * WHY middleware and not a reaction: `equipmentId` IS a `MaintenanceWorkOrder.create` param
 * (and `create` is a create command, so it rides the `{ ...commandInput, result }` payload),
 * so a reaction `on MaintenanceWorkOrderCreated run Equipment.updateStatus` resolving
 * `payload.equipmentId` is *technically* possible here — unlike the completed leg where
 * `equipmentId` is unreachable. We deliberately use middleware anyway for two reasons:
 *   1. GUARD-SAFETY. `updateStatus` guards `newStatus != self.status` and the FSM only
 *      allows `-> "maintenance"` from `active`/`out_of_service`. A reaction would fire the
 *      command blindly and rely on the engine SWALLOWING the failure (logged-and-discarded)
 *      whenever the equipment is already in maintenance, retired, or out_of_service-but-some
 *      other state — noisy and the established anti-pattern. The middleware loads the
 *      equipment first and skips cleanly via `onDiagnostic` instead.
 *   2. ZERO IR CHANGE. Both the trigger event and the target command already exist in IR, so
 *      this is a pure runtime addition — no `.manifest` edit, no recompile, and the
 *      schema/route/reaction-payload/drift gates are entirely unaffected.
 *
 * Opening a work order is a one-shot transition, so the idempotency key is per
 * MaintenanceWorkOrder. Every skip path reports through `onDiagnostic` rather than silently
 * returning.
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

export interface MaintenanceEquipmentStatusDiagnostic {
  currentStatus?: string;
  detail?: Record<string, unknown>;
  equipmentId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
  workOrderId?: string;
}

export interface MaintenanceCreatedEquipmentStatusMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: MaintenanceEquipmentStatusDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface MaintenanceWorkOrderCreatedPayload {
  equipmentId?: unknown;
  tenantId?: unknown;
}

interface EquipmentLike {
  status?: unknown;
}

const CREATE_COMMANDS = new Set(["create"]);

// Equipment.updateStatus only transitions to "maintenance" from these states
// (equipment-rules.manifest transitions: active -> [..maintenance..],
// out_of_service -> [..maintenance..]). "maintenance" itself is skipped earlier by the
// `newStatus != self.status` guard, and "retired" is terminal (no outbound transition).
const ELIGIBLE_FROM = new Set(["active", "out_of_service"]);

const MAINTENANCE_STATUS = "maintenance";

const defaultDiagnostic = (
  diag: MaintenanceEquipmentStatusDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[maintenance-status:${diag.stage}] ${diag.reason}`, {
    currentStatus: diag.currentStatus,
    equipmentId: diag.equipmentId,
    tenantId: diag.tenantId,
    workOrderId: diag.workOrderId,
    ...diag.detail,
  });
};

/**
 * Create middleware that takes the parent equipment into `maintenance` status when a
 * MaintenanceWorkOrder is opened. Store/provider based so tests and production share the
 * same Manifest runtime boundary.
 */
export function createMaintenanceCreatedEquipmentStatusMiddleware(
  options: MaintenanceCreatedEquipmentStatusMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine MaintenanceWorkOrder.create, not a look-alike event from
      // another entity/command.
      if (ctx.entityName !== "MaintenanceWorkOrder") {
        return {};
      }

      const created = ctx.emittedEvents.filter(
        (event) =>
          event.name === "MaintenanceWorkOrderCreated" &&
          CREATE_COMMANDS.has(ctx.command.name)
      );

      for (const event of created) {
        const payload = event.payload as
          | MaintenanceWorkOrderCreatedPayload
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
            reason: `MaintenanceWorkOrderCreated missing ${
              workOrderId ? "tenantId" : "workOrderId"
            }`,
            tenantId,
            workOrderId,
          });
          continue;
        }

        // equipmentId IS a create param, so it rides the payload — no need to reload the
        // work order just to read it.
        const equipmentId = asNonEmptyString(payload?.equipmentId);
        if (!equipmentId) {
          onDiagnostic({
            stage: "equipmentId",
            reason: "work order carries no equipmentId — nothing to take into maintenance",
            tenantId,
            workOrderId,
          });
          continue;
        }

        const equipmentStore = storeProvider("Equipment");
        if (!equipmentStore) {
          onDiagnostic({
            stage: "stores",
            reason: "Equipment store unavailable",
            equipmentId,
            tenantId,
            workOrderId,
          });
          continue;
        }

        const equipment = (await equipmentStore.getById(equipmentId)) as
          | EquipmentLike
          | undefined;
        if (!equipment) {
          onDiagnostic({
            stage: "equipment-load",
            reason: "linked Equipment not found — cannot change status",
            equipmentId,
            tenantId,
            workOrderId,
          });
          continue;
        }

        // Guard-safe pre-check: skip cleanly instead of firing updateStatus and letting the
        // engine swallow the failure. Already-in-maintenance is a no-op; retired/unknown
        // states cannot transition to "maintenance".
        const currentStatus = asNonEmptyString(equipment.status);
        if (currentStatus === MAINTENANCE_STATUS) {
          onDiagnostic({
            stage: "skip",
            reason: "equipment already in maintenance — nothing to do",
            currentStatus,
            equipmentId,
            tenantId,
            workOrderId,
          });
          continue;
        }
        if (!(currentStatus && ELIGIBLE_FROM.has(currentStatus))) {
          onDiagnostic({
            stage: "skip",
            reason: `equipment status '${
              currentStatus ?? "unknown"
            }' cannot transition to maintenance — skip`,
            currentStatus,
            equipmentId,
            tenantId,
            workOrderId,
          });
          continue;
        }

        const userId =
          asNonEmptyString(
            (ctx.runtimeContext.user as { id?: unknown } | undefined)?.id
          ) ?? "system";

        const result = await dispatchCommand(
          "updateStatus",
          {
            // updateStatus is a MUTATE on an existing equipment — the id travels in the
            // body AND as instanceId (mutate-dispatch contract).
            id: equipmentId,
            tenantId,
            newStatus: MAINTENANCE_STATUS,
            reason: "Auto: maintenance work order opened",
            userId,
          },
          {
            entityName: "Equipment",
            instanceId: equipmentId,
            correlationId: workOrderId,
            causationId: "MaintenanceWorkOrderCreated",
            // Per opened work order — re-emitting the creation must not re-fire the status
            // change. (Effective once dispatcher idempotency is enabled; inert but harmless
            // today.)
            idempotencyKey: `maintenance-open:${tenantId}:${workOrderId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "updateStatus",
            reason: `Equipment.updateStatus failed: ${
              result.error ?? "unknown"
            }`,
            currentStatus,
            equipmentId,
            tenantId,
            workOrderId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "equipment taken into maintenance",
          currentStatus,
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
