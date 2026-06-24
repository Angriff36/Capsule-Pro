/**
 * LogisticsDispatch lifecycle → Driver / Vehicle status middleware.
 *
 * Runs inside the Manifest runtime lifecycle after a `LogisticsDispatch` command
 * emits one of the lifecycle events. It keeps the assigned Driver and Vehicle's
 * availability in lockstep with the dispatch they are working:
 *
 *   LogisticsDispatchAssigned  → Driver.setOnRoute  + Vehicle.setInUse   (busy)
 *   LogisticsDispatchDelivered → Driver.setAvailable + Vehicle.setAvailable (free)
 *   LogisticsDispatchFailed    → Driver.setAvailable + Vehicle.setAvailable (free)
 *
 * WHY this exists: the Driver `on_route` and Vehicle `in_use` states were declared
 * (constraint + transition) but UNREACHABLE — no command ever mutated a driver to
 * `on_route` or a vehicle to `in_use`, so dispatching catering goods never reflected
 * that the driver/vehicle were busy, and they were never freed on completion. The
 * fleet's availability board was permanently wrong. The four new status commands
 * (`Driver.setOnRoute`/`setAvailable`, `Vehicle.setInUse`/`setAvailable`) make those
 * states live, and this middleware drives them off the dispatch lifecycle.
 *
 * WHY middleware and not a reaction (the engine-semantics rule, IMPLEMENTATION_PLAN
 * P0): the `deliver`/`fail` commands take no driver/vehicle params, and `driverId` /
 * `vehicleId` are the LogisticsDispatch's OWN fields — declared event fields are never
 * auto-populated from `self.*`, so the delivered/failed event payloads do not carry
 * them. The middleware loads the dispatch from the store via `_subject.id` and reads
 * `self.driverId` / `self.vehicleId` uniformly across all three legs (the assigned
 * event does carry them as command params, but loading the row is the single code path
 * that works for every leg and always reflects the just-persisted assignment).
 *
 * Guard-safety / concurrency: every status dispatch is guarded (`setOnRoute` requires
 * `available`, `setAvailable` requires `on_route`, etc.), so a driver already busy on
 * another dispatch, or already free, is skipped cleanly rather than erroring. That also
 * gives free idempotency — re-emitting a lifecycle event for the same dispatch is a
 * no-op once the status already matches. Each skip reports through `onDiagnostic`.
 *
 * Reassignment (`LogisticsDispatchReassigned`) is intentionally NOT handled here: it
 * swaps driver/vehicle and would need the PRE-mutation driver/vehicle ids (two-hook
 * capture) to free the previous pair; that is a separate, larger change. The core
 * assign → busy, deliver/fail → free lifecycle is complete and correct on its own.
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

export interface LogisticsDispatchStatusDiagnostic {
  detail?: Record<string, unknown>;
  dispatchId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface LogisticsDispatchDriverVehicleStatusMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: LogisticsDispatchStatusDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface LogisticsDispatchPayload {
  tenantId?: unknown;
}

interface LogisticsDispatchLike {
  driverId?: unknown;
  vehicleId?: unknown;
}

/**
 * One lifecycle leg: which dispatch event drives which Driver / Vehicle command.
 * `null` means that entity is not touched by the leg (none today, but keeps the
 * shape explicit and extensible).
 */
const LIFECYCLE_LEGS: Record<
  string,
  { driverCommand: string; vehicleCommand: string }
> = {
  LogisticsDispatchAssigned: {
    driverCommand: "setOnRoute",
    vehicleCommand: "setInUse",
  },
  LogisticsDispatchDelivered: {
    driverCommand: "setAvailable",
    vehicleCommand: "setAvailable",
  },
  LogisticsDispatchFailed: {
    driverCommand: "setAvailable",
    vehicleCommand: "setAvailable",
  },
};

const defaultDiagnostic = (diag: LogisticsDispatchStatusDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[logistics-dispatch-status:${diag.stage}] ${diag.reason}`, {
    dispatchId: diag.dispatchId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that keeps Driver / Vehicle availability in lockstep with the
 * LogisticsDispatch lifecycle. Store/provider based so tests and production share
 * the same Manifest runtime boundary.
 */
export function createLogisticsDispatchDriverVehicleStatusMiddleware(
  options: LogisticsDispatchDriverVehicleStatusMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine LogisticsDispatch mutation, not a look-alike event.
      if (ctx.entityName !== "LogisticsDispatch") {
        return {};
      }

      const legs = ctx.emittedEvents.filter((event) =>
        Object.hasOwn(LIFECYCLE_LEGS, event.name)
      );

      for (const event of legs) {
        const leg = LIFECYCLE_LEGS[event.name];
        if (!leg) continue;
        const payload = event.payload as LogisticsDispatchPayload | undefined;

        const dispatchId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(dispatchId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `${event.name} missing ${
              dispatchId ? "tenantId" : "dispatchId"
            }`,
            dispatchId,
            tenantId,
          });
          continue;
        }

        const dispatchStore = storeProvider("LogisticsDispatch");
        const driverStore = storeProvider("Driver");
        const vehicleStore = storeProvider("Vehicle");
        if (!(dispatchStore && driverStore && vehicleStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "LogisticsDispatch/Driver/Vehicle store unavailable",
            dispatchId,
            tenantId,
          });
          continue;
        }

        const dispatch = (await dispatchStore.getById(dispatchId)) as
          | LogisticsDispatchLike
          | undefined;
        if (!dispatch) {
          onDiagnostic({
            stage: "load",
            reason: "LogisticsDispatch not found in store",
            dispatchId,
            tenantId,
          });
          continue;
        }

        // driverId / vehicleId are the dispatch's OWN fields — the reason this is
        // middleware, not a reaction.
        const driverId = asNonEmptyString(dispatch.driverId);
        const vehicleId = asNonEmptyString(dispatch.vehicleId);

        await applyStatus({
          entityName: "Driver",
          entityId: driverId,
          command: leg.driverCommand,
          dispatchId,
          tenantId,
          eventName: event.name,
          ctx,
          dispatchCommand,
          onDiagnostic,
        });
        await applyStatus({
          entityName: "Vehicle",
          entityId: vehicleId,
          command: leg.vehicleCommand,
          dispatchId,
          tenantId,
          eventName: event.name,
          ctx,
          dispatchCommand,
          onDiagnostic,
        });
      }

      return {};
    },
  };
}

interface ApplyStatusArgs {
  command: string;
  ctx: MiddlewareContext;
  dispatchCommand: DispatchCommand;
  dispatchId: string;
  entityId: string | undefined;
  entityName: "Driver" | "Vehicle";
  eventName: string;
  onDiagnostic: (diag: LogisticsDispatchStatusDiagnostic) => void;
  tenantId: string;
}

/**
 * Dispatch one governed status command for the dispatch's Driver or Vehicle. The
 * command is a MUTATE on an existing row, so the id travels in the body AND as
 * instanceId. A guard failure (already busy / already free) is reported, not fatal.
 */
async function applyStatus(args: ApplyStatusArgs): Promise<void> {
  const {
    command,
    ctx,
    dispatchCommand,
    dispatchId,
    entityId,
    entityName,
    eventName,
    onDiagnostic,
    tenantId,
  } = args;

  if (!entityId) {
    onDiagnostic({
      stage: "fk",
      reason: `dispatch carries no ${entityName.toLowerCase()}Id — nothing to update`,
      dispatchId,
      tenantId,
      detail: { command },
    });
    return;
  }

  const result = await dispatchCommand(
    command,
    { id: entityId, tenantId },
    {
      entityName,
      instanceId: entityId,
      correlationId: dispatchId,
      causationId: eventName,
      // Per dispatch + entity + target command — re-emitting the lifecycle event
      // must not double-apply. (Effective once dispatcher idempotency is enabled;
      // inert but harmless today — the FSM guard already makes repeats no-ops.)
      idempotencyKey: `dispatch-status:${tenantId}:${dispatchId}:${entityName}:${command}`,
    }
  );

  if (result.emittedEvents) {
    ctx.emittedEvents.push(...result.emittedEvents);
  }
  if (!result.success) {
    // Most commonly a guard skip (e.g. driver already on another route, or already
    // free). That is expected, not an error — report and move on.
    onDiagnostic({
      stage: "dispatch",
      reason: `${entityName}.${command} did not apply: ${
        result.error ?? "guard skipped"
      }`,
      dispatchId,
      tenantId,
      detail: { entityId },
    });
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
