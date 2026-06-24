/**
 * LogisticsRoute lifecycle → Driver / Vehicle status middleware.
 *
 * Sibling of the LogisticsDispatch lifecycle middleware. Runs inside the Manifest
 * runtime after a `LogisticsRoute` command emits a lifecycle event, keeping the
 * route's assigned Driver and Vehicle availability in lockstep with the route they
 * are working:
 *
 *   LogisticsRouteStarted   → Driver.setOnRoute  + Vehicle.setInUse   (busy)
 *   LogisticsRouteCompleted → Driver.setAvailable + Vehicle.setAvailable (free*)
 *   LogisticsRouteCancelled → Driver.setAvailable + Vehicle.setAvailable (free*)
 *
 * WHY this exists: starting a delivery route should take its driver/vehicle off the
 * available board (they are out driving), and completing/cancelling the route should
 * return them — but `LogisticsRoute` had ZERO consumers, so the route status machine
 * walked planned → in_progress → completed while the fleet board stayed wrong. The
 * four status commands (`Driver.setOnRoute`/`setAvailable`, `Vehicle.setInUse`/
 * `setAvailable`) were already added for the dispatch sibling, so this reuses them
 * with NO IR change.
 *
 * WHY middleware and not a reaction (the engine-semantics rule, IMPLEMENTATION_PLAN
 * P0): `start`/`complete`/`cancel` take no driver/vehicle params, and `driverId` /
 * `vehicleId` are the LogisticsRoute's OWN fields — declared event fields are never
 * auto-populated from `self.*`, so the lifecycle event payloads do not carry them
 * (the `LogisticsRouteStarted` event DECLARES driverId/vehicleId, but `start()` has
 * no params to populate them with). The middleware loads the route from the store via
 * `_subject.id` and reads `self.driverId` / `self.vehicleId` uniformly across all legs.
 *
 * PRECEDENCE — route ↔ dispatch overlap (* the reason the free legs are conditional):
 * a LogisticsDispatch belongs to a route (`routeId` required) and carries its own
 * driver/vehicle, so the same fleet member can be committed to BOTH an in-progress
 * route and an in-transit dispatch. The dispatch sibling frees the fleet on its own
 * `deliver`/`fail`. To avoid freeing a driver/vehicle that is still physically mid-
 * delivery, the route's free legs free them ONLY when no OTHER active commitment
 * remains — no `assigned`/`in_transit` LogisticsDispatch and no other `in_progress`
 * LogisticsRoute references them. If one does, the free is deferred (that commitment's
 * own completion frees them). The busy legs stay unconditional and FSM-guard-safe
 * (a driver already `on_route` from a dispatch is skipped cleanly — free idempotency).
 *
 * Every status dispatch is FSM-guarded (`setOnRoute` requires `available`,
 * `setAvailable` requires `on_route`, etc.), so an already-busy / already-free fleet
 * member is skipped, not errored. Each skip / deferral reports through `onDiagnostic`.
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

export interface LogisticsRouteStatusDiagnostic {
  detail?: Record<string, unknown>;
  reason: string;
  routeId?: string;
  stage: string;
  tenantId?: string;
}

export interface LogisticsRouteDriverVehicleStatusMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: LogisticsRouteStatusDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface LogisticsRoutePayload {
  tenantId?: unknown;
}

interface LogisticsRouteLike {
  driverId?: unknown;
  vehicleId?: unknown;
}

interface FleetCommitmentRow {
  driverId?: unknown;
  id?: unknown;
  status?: unknown;
  vehicleId?: unknown;
}

type FleetKind = "driver" | "vehicle";

/**
 * One lifecycle leg: which route event drives which Driver / Vehicle command, and
 * whether it is a "busy" (unconditional) or "free" (deferred when still committed) leg.
 */
const LIFECYCLE_LEGS: Record<
  string,
  { driverCommand: string; kind: "busy" | "free"; vehicleCommand: string }
> = {
  LogisticsRouteStarted: {
    driverCommand: "setOnRoute",
    vehicleCommand: "setInUse",
    kind: "busy",
  },
  LogisticsRouteCompleted: {
    driverCommand: "setAvailable",
    vehicleCommand: "setAvailable",
    kind: "free",
  },
  LogisticsRouteCancelled: {
    driverCommand: "setAvailable",
    vehicleCommand: "setAvailable",
    kind: "free",
  },
};

/** Dispatch statuses that still commit a driver/vehicle (out on a delivery). */
const ACTIVE_DISPATCH_STATUSES = new Set(["assigned", "in_transit"]);
/** Route status that still commits a driver/vehicle. */
const ACTIVE_ROUTE_STATUS = "in_progress";

const defaultDiagnostic = (diag: LogisticsRouteStatusDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[logistics-route-status:${diag.stage}] ${diag.reason}`, {
    routeId: diag.routeId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that keeps Driver / Vehicle availability in lockstep with the
 * LogisticsRoute lifecycle. Store/provider based so tests and production share the
 * same Manifest runtime boundary.
 */
export function createLogisticsRouteDriverVehicleStatusMiddleware(
  options: LogisticsRouteDriverVehicleStatusMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine LogisticsRoute mutation, not a look-alike event.
      if (ctx.entityName !== "LogisticsRoute") {
        return {};
      }

      const legs = ctx.emittedEvents.filter((event) =>
        Object.hasOwn(LIFECYCLE_LEGS, event.name)
      );

      for (const event of legs) {
        await processRouteLeg(event, ctx, {
          storeProvider,
          dispatchCommand,
          onDiagnostic,
        });
      }

      return {};
    },
  };
}

interface LegDeps {
  dispatchCommand: DispatchCommand;
  onDiagnostic: (diag: LogisticsRouteStatusDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

/**
 * Resolve one route lifecycle event to its Driver / Vehicle status updates. Extracted
 * from the handler so each early-exit (missing ids / stores / route) stays a simple
 * guard, and so both fleet legs share the loaded route.
 */
async function processRouteLeg(
  event: MiddlewareContext["emittedEvents"][number],
  ctx: MiddlewareContext,
  deps: LegDeps
): Promise<void> {
  const { storeProvider, dispatchCommand, onDiagnostic } = deps;
  const leg = LIFECYCLE_LEGS[event.name];
  if (!leg) {
    return;
  }
  const payload = event.payload as LogisticsRoutePayload | undefined;

  const routeId =
    asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
  const tenantId =
    asNonEmptyString(payload?.tenantId) ??
    asNonEmptyString(
      (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)?.tenantId
    );
  if (!(routeId && tenantId)) {
    onDiagnostic({
      stage: "resolve",
      reason: `${event.name} missing ${routeId ? "tenantId" : "routeId"}`,
      routeId,
      tenantId,
    });
    return;
  }

  const routeStore = storeProvider("LogisticsRoute");
  const dispatchStore = storeProvider("LogisticsDispatch");
  const driverStore = storeProvider("Driver");
  const vehicleStore = storeProvider("Vehicle");
  if (!(routeStore && driverStore && vehicleStore)) {
    onDiagnostic({
      stage: "stores",
      reason: "LogisticsRoute/Driver/Vehicle store unavailable",
      routeId,
      tenantId,
    });
    return;
  }

  const route = (await routeStore.getById(routeId)) as
    | LogisticsRouteLike
    | undefined;
  if (!route) {
    onDiagnostic({
      stage: "load",
      reason: "LogisticsRoute not found in store",
      routeId,
      tenantId,
    });
    return;
  }

  // driverId / vehicleId are the route's OWN fields — the reason this is middleware,
  // not a reaction.
  const driverId = asNonEmptyString(route.driverId);
  const vehicleId = asNonEmptyString(route.vehicleId);

  await applyStatus({
    kind: "driver",
    entityName: "Driver",
    entityId: driverId,
    command: leg.driverCommand,
    legKind: leg.kind,
    routeId,
    tenantId,
    eventName: event.name,
    ctx,
    dispatchCommand,
    routeStore,
    dispatchStore,
    onDiagnostic,
  });
  await applyStatus({
    kind: "vehicle",
    entityName: "Vehicle",
    entityId: vehicleId,
    command: leg.vehicleCommand,
    legKind: leg.kind,
    routeId,
    tenantId,
    eventName: event.name,
    ctx,
    dispatchCommand,
    routeStore,
    dispatchStore,
    onDiagnostic,
  });
}

interface ApplyStatusArgs {
  command: string;
  ctx: MiddlewareContext;
  dispatchCommand: DispatchCommand;
  dispatchStore: Store | undefined;
  entityId: string | undefined;
  entityName: "Driver" | "Vehicle";
  eventName: string;
  kind: FleetKind;
  legKind: "busy" | "free";
  onDiagnostic: (diag: LogisticsRouteStatusDiagnostic) => void;
  routeId: string;
  routeStore: Store;
  tenantId: string;
}

/**
 * Dispatch one governed status command for the route's Driver or Vehicle. The command
 * is a MUTATE on an existing row, so the id travels in the body AND as instanceId. A
 * guard failure (already busy / already free) is reported, not fatal. For a "free" leg,
 * the fleet member is freed only when no OTHER active route/dispatch still commits them
 * (precedence: a route never frees a driver/vehicle mid-delivery).
 */
async function applyStatus(args: ApplyStatusArgs): Promise<void> {
  const {
    command,
    ctx,
    dispatchCommand,
    dispatchStore,
    entityId,
    entityName,
    eventName,
    kind,
    legKind,
    onDiagnostic,
    routeId,
    routeStore,
    tenantId,
  } = args;

  if (!entityId) {
    onDiagnostic({
      stage: "fk",
      reason: `route carries no ${entityName.toLowerCase()}Id — nothing to update`,
      routeId,
      tenantId,
      detail: { command },
    });
    return;
  }

  if (legKind === "free") {
    const stillCommitted = await hasOtherActiveCommitment({
      kind,
      entityId,
      tenantId,
      excludeRouteId: routeId,
      routeStore,
      dispatchStore,
    });
    if (stillCommitted) {
      // The driver/vehicle is still out on another route or a live dispatch; that
      // commitment's own completion will free them. Freeing now would wrongly show
      // them available mid-delivery.
      onDiagnostic({
        stage: "defer",
        reason: `${entityName} still committed to another active route/dispatch — free deferred`,
        routeId,
        tenantId,
        detail: { entityId, command },
      });
      return;
    }
  }

  const result = await dispatchCommand(
    command,
    { id: entityId, tenantId },
    {
      entityName,
      instanceId: entityId,
      correlationId: routeId,
      causationId: eventName,
      // Per route + entity + target command — re-emitting the lifecycle event must
      // not double-apply. (Effective once dispatcher idempotency is enabled; inert
      // but harmless today — the FSM guard already makes repeats no-ops.)
      idempotencyKey: `route-status:${tenantId}:${routeId}:${entityName}:${command}`,
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
      routeId,
      tenantId,
      detail: { entityId },
    });
  }
}

interface CommitmentArgs {
  dispatchStore: Store | undefined;
  entityId: string;
  excludeRouteId: string;
  kind: FleetKind;
  routeStore: Store;
  tenantId: string;
}

/**
 * Is this driver/vehicle still committed to any OTHER active route or live dispatch?
 * Active = a LogisticsDispatch in `assigned`/`in_transit`, or another LogisticsRoute in
 * `in_progress`. Scoped to the tenant; the just-completed route is excluded (its status
 * is already terminal at after-emit, so the status filter alone would exclude it, but
 * the id exclusion makes the intent explicit).
 */
async function hasOtherActiveCommitment(
  args: CommitmentArgs
): Promise<boolean> {
  const {
    kind,
    entityId,
    tenantId,
    excludeRouteId,
    routeStore,
    dispatchStore,
  } = args;

  const matchesFleet = (row: FleetCommitmentRow): boolean =>
    kind === "driver"
      ? asNonEmptyString(row.driverId) === entityId
      : asNonEmptyString(row.vehicleId) === entityId;

  const sameTenant = (row: { tenantId?: unknown }): boolean =>
    asNonEmptyString(row.tenantId) === tenantId;

  if (dispatchStore) {
    const dispatches = (await dispatchStore.getAll()) as FleetCommitmentRow[];
    const liveDispatch = dispatches.some(
      (row) =>
        sameTenant(row as { tenantId?: unknown }) &&
        matchesFleet(row) &&
        ACTIVE_DISPATCH_STATUSES.has(asNonEmptyString(row.status) ?? "")
    );
    if (liveDispatch) {
      return true;
    }
  }

  const routes = (await routeStore.getAll()) as FleetCommitmentRow[];
  return routes.some(
    (row) =>
      sameTenant(row as { tenantId?: unknown }) &&
      asNonEmptyString(row.id) !== excludeRouteId &&
      matchesFleet(row) &&
      asNonEmptyString(row.status) === ACTIVE_ROUTE_STATUS
  );
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
