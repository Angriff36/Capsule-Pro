/**
 * FacilityWorkOrder lifecycle → FacilityAsset maintenance-status middleware.
 *
 * Runs inside the Manifest runtime lifecycle after a `FacilityWorkOrder` command emits its
 * lifecycle event. It keeps a `FacilityAsset`'s status in step with the work orders against
 * it — the facility-side mirror of the already-shipped Equipment maintenance legs:
 *
 *   • `FacilityWorkOrderCreated`   → `FacilityAsset.sendToMaintenance`   (operational → maintenance)
 *   • `FacilityWorkOrderCompleted` → `FacilityAsset.returnFromMaintenance` (maintenance → operational)
 *
 * Both events had ZERO consumers, so opening a work order against an asset never took it out
 * of service (it kept reading as operational/bookable for the whole life of the order) and
 * completing the work never brought it back — the asset's status silently diverged from its
 * real availability. Together the two legs make FacilityAsset status track the work-order
 * lifecycle.
 *
 * WHY middleware and not a reaction (the crux — matches the verified engine-semantics
 * correction in IMPLEMENTATION_PLAN P0):
 *   • COMPLETED leg: `FacilityWorkOrder.complete(actualCost, completionNotes)` does NOT take
 *     `assetId`. The asset to return is `FacilityWorkOrder.assetId` — the work order's OWN
 *     field — and declared event fields are never auto-populated from `self.*`, so no reaction
 *     (even reading `payload.*`) can see it. The middleware loads the completed work order via
 *     `_subject.id` and reads `self.assetId`.
 *   • CREATED leg: `assetId` IS a `FacilityWorkOrder.create` param, so `payload.assetId` is
 *     reachable and a reaction was technically possible here — but we use middleware anyway for
 *     GUARD-SAFETY (mirroring the Equipment created leg). `sendToMaintenance` guards
 *     `self.status == "operational"`, so a reaction would fire blindly and rely on the engine
 *     SWALLOWING the guard failure whenever the asset is already in maintenance / retired /
 *     sold. The middleware loads the asset first and skips cleanly via `onDiagnostic`.
 *
 * ZERO IR CHANGE: both trigger events and both target commands already exist in IR, so this is
 * a pure runtime addition — no `.manifest` edit, no recompile, and the schema / route /
 * reaction-payload / drift gates are entirely unaffected.
 *
 * Each transition is one-shot per work order, so the idempotency key is per FacilityWorkOrder.
 * Every skip path reports through `onDiagnostic` rather than silently returning.
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

export interface FacilityWorkOrderAssetStatusDiagnostic {
  assetId?: string;
  currentStatus?: string;
  detail?: Record<string, unknown>;
  reason: string;
  stage: string;
  tenantId?: string;
  workOrderId?: string;
}

export interface FacilityWorkOrderAssetStatusMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: FacilityWorkOrderAssetStatusDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface FacilityWorkOrderCreatedPayload {
  assetId?: unknown;
  tenantId?: unknown;
}

interface FacilityWorkOrderCompletedPayload {
  completionNotes?: unknown;
  tenantId?: unknown;
}

interface FacilityWorkOrderLike {
  assetId?: unknown;
  tenantId?: unknown;
}

interface FacilityAssetLike {
  nextMaintenanceAt?: unknown;
  status?: unknown;
}

const CREATE_COMMANDS = new Set(["create"]);
const COMPLETE_COMMANDS = new Set(["complete"]);

// FacilityAsset.sendToMaintenance guards `self.status == "operational"`. The FSM
// (facilities-all-rules.manifest) only allows operational -> [maintenance, retired, sold],
// so "operational" is the sole status that can be sent to maintenance.
const OPERATIONAL_STATUS = "operational";
// FacilityAsset.returnFromMaintenance guards `self.status == "maintenance"`.
const MAINTENANCE_STATUS = "maintenance";

const defaultDiagnostic = (
  diag: FacilityWorkOrderAssetStatusDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[facility-asset-status:${diag.stage}] ${diag.reason}`, {
    assetId: diag.assetId,
    currentStatus: diag.currentStatus,
    tenantId: diag.tenantId,
    workOrderId: diag.workOrderId,
    ...diag.detail,
  });
};

/**
 * Create middleware that drives FacilityAsset status from the FacilityWorkOrder lifecycle.
 * Store/provider based so tests and production share the same Manifest runtime boundary.
 */
export function createFacilityWorkOrderAssetStatusMiddleware(
  options: FacilityWorkOrderAssetStatusMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  const contextTenantId = (ctx: MiddlewareContext): string | undefined =>
    asNonEmptyString(
      (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)?.tenantId
    );

  const contextUserId = (ctx: MiddlewareContext): string =>
    asNonEmptyString(
      (ctx.runtimeContext.user as { id?: unknown } | undefined)?.id
    ) ?? "system";

  /** Leg 1: opening a work order takes an operational asset into maintenance. */
  async function handleCreated(
    ctx: MiddlewareContext,
    event: MiddlewareContext["emittedEvents"][number]
  ): Promise<void> {
    const payload = event.payload as FacilityWorkOrderCreatedPayload | undefined;

    const workOrderId =
      asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
    const tenantId =
      asNonEmptyString(payload?.tenantId) ?? contextTenantId(ctx);
    if (!(workOrderId && tenantId)) {
      onDiagnostic({
        stage: "resolve",
        reason: `FacilityWorkOrderCreated missing ${
          workOrderId ? "tenantId" : "workOrderId"
        }`,
        tenantId,
        workOrderId,
      });
      return;
    }

    // assetId IS a create param, so it rides the payload — no need to reload the work order.
    const assetId = asNonEmptyString(payload?.assetId);
    if (!assetId) {
      onDiagnostic({
        stage: "assetId",
        reason: "work order carries no assetId — nothing to send to maintenance",
        tenantId,
        workOrderId,
      });
      return;
    }

    const asset = await loadAsset(assetId, { tenantId, workOrderId });
    if (!asset) {
      return;
    }

    // Guard-safe pre-check: only an operational asset can be sent to maintenance.
    const currentStatus = asNonEmptyString(asset.status);
    if (currentStatus === MAINTENANCE_STATUS) {
      onDiagnostic({
        stage: "skip",
        reason: "asset already in maintenance — nothing to do",
        assetId,
        currentStatus,
        tenantId,
        workOrderId,
      });
      return;
    }
    if (currentStatus !== OPERATIONAL_STATUS) {
      onDiagnostic({
        stage: "skip",
        reason: `asset status '${
          currentStatus ?? "unknown"
        }' cannot be sent to maintenance — skip`,
        assetId,
        currentStatus,
        tenantId,
        workOrderId,
      });
      return;
    }

    const result = await dispatchCommand(
      "sendToMaintenance",
      {
        // sendToMaintenance is a MUTATE on an existing asset — the id travels in the body
        // AND as instanceId (mutate-dispatch contract).
        id: assetId,
        tenantId,
        reason: "Auto: facility work order opened",
        userId: contextUserId(ctx),
      },
      {
        entityName: "FacilityAsset",
        instanceId: assetId,
        correlationId: workOrderId,
        causationId: "FacilityWorkOrderCreated",
        idempotencyKey: `facility-wo-open:${tenantId}:${workOrderId}`,
      }
    );

    pushEvents(ctx, result);
    if (!result.success) {
      onDiagnostic({
        stage: "sendToMaintenance",
        reason: `FacilityAsset.sendToMaintenance failed: ${
          result.error ?? "unknown"
        }`,
        assetId,
        currentStatus,
        tenantId,
        workOrderId,
      });
      return;
    }

    onDiagnostic({
      stage: "done",
      reason: "asset sent to maintenance",
      assetId,
      currentStatus,
      tenantId,
      workOrderId,
    });
  }

  /** Leg 2: completing a work order returns its asset to service. */
  async function handleCompleted(
    ctx: MiddlewareContext,
    event: MiddlewareContext["emittedEvents"][number]
  ): Promise<void> {
    const payload = event.payload as
      | FacilityWorkOrderCompletedPayload
      | undefined;

    const workOrderId =
      asNonEmptyString(event.subject?.id) ?? asNonEmptyString(ctx.instanceId);
    if (!workOrderId) {
      onDiagnostic({
        stage: "resolve",
        reason: "FacilityWorkOrderCompleted missing workOrderId",
      });
      return;
    }

    const workOrderStore = storeProvider("FacilityWorkOrder");
    if (!workOrderStore) {
      onDiagnostic({
        stage: "stores",
        reason: "FacilityWorkOrder store unavailable",
        workOrderId,
      });
      return;
    }

    // assetId is the work order's OWN field, not a `complete` param — load to read it.
    const workOrder = (await workOrderStore.getById(workOrderId)) as
      | FacilityWorkOrderLike
      | undefined;
    if (!workOrder) {
      onDiagnostic({
        stage: "load",
        reason: "FacilityWorkOrder not found in store",
        workOrderId,
      });
      return;
    }

    const tenantId =
      asNonEmptyString(workOrder.tenantId) ??
      asNonEmptyString(payload?.tenantId) ??
      contextTenantId(ctx);
    if (!tenantId) {
      onDiagnostic({
        stage: "resolve",
        reason: "FacilityWorkOrderCompleted missing tenantId",
        workOrderId,
      });
      return;
    }

    const assetId = asNonEmptyString(workOrder.assetId);
    if (!assetId) {
      onDiagnostic({
        stage: "assetId",
        reason: "work order carries no assetId — nothing to return from maintenance",
        tenantId,
        workOrderId,
      });
      return;
    }

    const asset = await loadAsset(assetId, { tenantId, workOrderId });
    if (!asset) {
      return;
    }

    // Guard-safe pre-check: only an in-maintenance asset can be returned. If it never went
    // into maintenance (e.g. the open leg skipped it, or it was retired), there is nothing
    // to return — skip cleanly instead of firing a swallowed guard failure.
    const currentStatus = asNonEmptyString(asset.status);
    if (currentStatus !== MAINTENANCE_STATUS) {
      onDiagnostic({
        stage: "skip",
        reason: `asset status '${
          currentStatus ?? "unknown"
        }' is not in maintenance — nothing to return`,
        assetId,
        currentStatus,
        tenantId,
        workOrderId,
      });
      return;
    }

    const result = await dispatchCommand(
      "returnFromMaintenance",
      {
        // returnFromMaintenance is a MUTATE — id in the body AND as instanceId.
        id: assetId,
        tenantId,
        maintenanceNotes:
          asNonEmptyString(payload?.completionNotes) ??
          "Auto: facility work order completed",
        // returnFromMaintenance unconditionally `mutate nextMaintenanceAt = nextMaintenanceAt`;
        // the work order does not know the next due date, so PRESERVE the asset's existing
        // value rather than clobbering it (same pattern as shipment-restock preserving unitCost).
        nextMaintenanceAt: asset.nextMaintenanceAt ?? null,
        userId: contextUserId(ctx),
      },
      {
        entityName: "FacilityAsset",
        instanceId: assetId,
        correlationId: workOrderId,
        causationId: "FacilityWorkOrderCompleted",
        idempotencyKey: `facility-wo-complete:${tenantId}:${workOrderId}`,
      }
    );

    pushEvents(ctx, result);
    if (!result.success) {
      onDiagnostic({
        stage: "returnFromMaintenance",
        reason: `FacilityAsset.returnFromMaintenance failed: ${
          result.error ?? "unknown"
        }`,
        assetId,
        currentStatus,
        tenantId,
        workOrderId,
      });
      return;
    }

    onDiagnostic({
      stage: "done",
      reason: "asset returned from maintenance",
      assetId,
      currentStatus,
      tenantId,
      workOrderId,
    });
  }

  async function loadAsset(
    assetId: string,
    ctx: { tenantId: string; workOrderId: string }
  ): Promise<FacilityAssetLike | undefined> {
    const assetStore = storeProvider("FacilityAsset");
    if (!assetStore) {
      onDiagnostic({
        stage: "stores",
        reason: "FacilityAsset store unavailable",
        assetId,
        ...ctx,
      });
      return undefined;
    }
    const asset = (await assetStore.getById(assetId)) as
      | FacilityAssetLike
      | undefined;
    if (!asset) {
      onDiagnostic({
        stage: "asset-load",
        reason: "linked FacilityAsset not found — cannot change status",
        assetId,
        ...ctx,
      });
      return undefined;
    }
    return asset;
  }

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Anchor to a genuine FacilityWorkOrder command, not a look-alike event from
      // another entity.
      if (ctx.entityName !== "FacilityWorkOrder") {
        return {};
      }

      for (const event of ctx.emittedEvents) {
        if (
          event.name === "FacilityWorkOrderCreated" &&
          CREATE_COMMANDS.has(ctx.command.name)
        ) {
          await handleCreated(ctx, event);
        } else if (
          event.name === "FacilityWorkOrderCompleted" &&
          COMPLETE_COMMANDS.has(ctx.command.name)
        ) {
          await handleCompleted(ctx, event);
        }
      }

      return {};
    },
  };
}

function pushEvents(ctx: MiddlewareContext, result: CommandResult): void {
  if (result.emittedEvents) {
    ctx.emittedEvents.push(...result.emittedEvents);
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
