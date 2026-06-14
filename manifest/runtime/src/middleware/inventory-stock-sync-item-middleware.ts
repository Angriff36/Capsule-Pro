/**
 * InventoryStock movement → InventoryItem.adjust sync middleware.
 *
 * Keeps the aggregate `InventoryItem.quantityOnHand` (the item total used by
 * valuation, par/reorder math, and every "how much do we have?" read) in sync
 * with per-storage-location `InventoryStock` movements. `InventoryStock.adjust`
 * and `InventoryStock.recount` mutate ONLY the per-location row and emit
 * `InventoryStockAdjusted` / `InventoryStockRecounted`, but NOTHING propagated
 * that change up to the parent `InventoryItem`. So after any location-level
 * stock adjustment or recount the per-location stock and the item total diverge
 * permanently — the item total silently goes stale (IMPLEMENTATION_PLAN P1,
 * Kitchen/inventory → "InventoryStock ↔ InventoryItem sync").
 *
 * WHY middleware and not a reaction (two independent blockers):
 *   1. The target item is `InventoryStock.itemId` — the stock row's OWN field
 *      (inventory-extended-rules.manifest:78), NOT an `adjust`/`recount` command
 *      param. The emitted payload is `{ ...commandInput, result }` only, and the
 *      event's declared `inventoryItemId` field is NEVER auto-populated from
 *      `self.*`, so a reaction's payload structurally cannot carry the item id.
 *      The middleware reads `self.itemId` off the InventoryStock instance.
 *   2. `recount`'s delta is a DIFFERENCE (newQuantity − oldQuantityOnHand). The
 *      command does `mutate quantityOnHand = newQuantity` before emitting, so by
 *      the time any `after-emit` consumer runs the OLD on-hand is gone. This
 *      middleware snapshots it on `before-guard` (same two-hook pattern as the
 *      EventGuestCountUpdated prep rescale) and computes the delta in `after-emit`.
 *
 * The propagated `InventoryItem.adjust(quantity, reason, userId)` itself emits
 * `InventoryAdjusted`, which the inventory-movement ledger middleware records as
 * an `adjustment` `InventoryTransaction` row — so a location adjustment correctly
 * flows item-total → ledger in one governed chain. `userId` is the system actor
 * `"system:stock-sync"` (the stock commands carry no `userId` param; same
 * convention as the prep-demand/prep-consume middleware).
 *
 * Each stock movement is a distinct, real change; a zero net delta is skipped
 * (an `adjust(0)` would be a no-op item mutation and a spurious ledger row).
 * Every skip/failure reports through `onDiagnostic` — never silently.
 */

import { randomUUID } from "node:crypto";
import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
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

export interface InventoryStockSyncDiagnostic {
  detail?: Record<string, unknown>;
  eventName?: string;
  itemId?: string;
  reason: string;
  stage: string;
  stockId?: string;
  tenantId?: string;
}

export interface InventoryStockSyncItemMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: InventoryStockSyncDiagnostic) => void;
}

/** evalContext key carrying the pre-mutation on-hand across hooks (recount). */
const OLD_ON_HAND_KEY = "__inventoryStockSyncItem_oldOnHand";

/** Below this absolute delta the change is treated as a no-op. */
const DELTA_EPSILON = 1e-9;

interface InventoryStockSelf {
  itemId?: unknown;
  quantityOnHand?: unknown;
  storageLocationId?: unknown;
  tenantId?: unknown;
}

interface StockMovementPayload {
  countedBy?: unknown;
  delta?: unknown;
  newQuantity?: unknown;
  reason?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: InventoryStockSyncDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[inv-stock-sync:${diag.stage}] ${diag.reason}`, {
    eventName: diag.eventName,
    stockId: diag.stockId,
    itemId: diag.itemId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that mirrors per-location InventoryStock adjust/recount
 * movements onto the parent InventoryItem total via a governed
 * `InventoryItem.adjust`. No store provider needed: the item id and the
 * pre-mutation on-hand both come off the InventoryStock instance threaded
 * through the runtime's evalContext.
 */
export function createInventoryStockSyncItemMiddleware(
  options: InventoryStockSyncItemMiddlewareOptions
): Middleware {
  const { dispatchCommand, onDiagnostic = defaultDiagnostic } = options;

  return {
    hooks: ["before-guard", "after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Only the InventoryStock adjust/recount lifecycle is relevant.
      if (
        ctx.entityName !== "InventoryStock" ||
        (ctx.command.name !== "adjust" && ctx.command.name !== "recount")
      ) {
        return {};
      }

      // Phase 1 (before-guard): snapshot the OLD on-hand before the mutate
      // overwrites it. recount's delta = newQuantity − this value.
      if (ctx.hook === "before-guard") {
        const self = ctx.evalContext.self as InventoryStockSelf | undefined;
        const oldOnHand = asFiniteNumber(self?.quantityOnHand);
        return { contextPatch: { [OLD_ON_HAND_KEY]: oldOnHand ?? null } };
      }

      if (ctx.hook !== "after-emit") {
        return {};
      }

      // Phase 2 (after-emit): mirror the net change onto the item total.
      const triggers = ctx.emittedEvents.filter(
        (event) =>
          event.name === "InventoryStockAdjusted" ||
          event.name === "InventoryStockRecounted"
      );
      if (triggers.length === 0) {
        return {};
      }

      const self = ctx.evalContext.self as InventoryStockSelf | undefined;
      const itemId = asNonEmptyString(self?.itemId);
      const seen = new Set<string>();

      for (const event of triggers) {
        const payload = event.payload as StockMovementPayload | undefined;
        const stockId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(self?.tenantId) ??
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );

        if (!(itemId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `${event.name} could not resolve ${itemId ? "tenantId" : "itemId (InventoryStock.itemId missing)"}`,
            eventName: event.name,
            itemId,
            stockId,
            tenantId,
          });
          continue;
        }

        // One sync per emitted event; guard against a double-delivered event.
        const dedupeKey = `${event.name}:${stockId ?? ""}`;
        if (seen.has(dedupeKey)) {
          continue;
        }
        seen.add(dedupeKey);

        let delta: number | undefined;
        let reason: string;

        if (event.name === "InventoryStockAdjusted") {
          // `delta` is a genuine adjust input param → on the payload, already signed.
          delta = asFiniteNumber(payload?.delta);
          reason = asNonEmptyString(payload?.reason) ?? "Stock adjustment";
        } else {
          // recount: delta = newQuantity − pre-mutation on-hand (captured above).
          const newQuantity = asFiniteNumber(payload?.newQuantity);
          const oldOnHand = asFiniteNumber(ctx.evalContext[OLD_ON_HAND_KEY]);
          if (newQuantity === undefined || oldOnHand === undefined) {
            onDiagnostic({
              stage: "delta",
              reason:
                "recount could not resolve new/old on-hand — item sync skipped",
              eventName: event.name,
              itemId,
              stockId,
              tenantId,
              detail: { newQuantity, oldOnHand },
            });
            continue;
          }
          delta = newQuantity - oldOnHand;
          const countedBy = asNonEmptyString(payload?.countedBy);
          reason = countedBy
            ? `Stock recount by ${countedBy}`
            : "Stock recount";
        }

        if (delta === undefined) {
          onDiagnostic({
            stage: "delta",
            reason: `${event.name} carried no numeric delta — item sync skipped`,
            eventName: event.name,
            itemId,
            stockId,
            tenantId,
          });
          continue;
        }
        if (Math.abs(delta) < DELTA_EPSILON) {
          // No net change (e.g. a recount that confirmed the count) — nothing to
          // mirror; an adjust(0) would be a no-op item mutation + spurious ledger row.
          continue;
        }

        const syncId = randomUUID();
        const result = await dispatchCommand(
          "adjust",
          {
            quantity: delta,
            reason,
            userId: "system:stock-sync",
          },
          {
            entityName: "InventoryItem",
            instanceId: itemId,
            correlationId: stockId ?? itemId,
            causationId: event.name,
            idempotencyKey: `stock-sync:${tenantId}:${itemId}:${syncId}`,
          }
        );

        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "dispatch",
            reason: `InventoryItem.adjust failed: ${result.error ?? "unknown"}`,
            eventName: event.name,
            itemId,
            stockId,
            tenantId,
            detail: { delta },
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: `item total synced (delta ${delta})`,
          eventName: event.name,
          itemId,
          stockId,
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

/** Coerce numbers, numeric strings, and Decimal-like objects to a number. */
function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  // decimal fields may surface as strings or Decimal objects from the runtime.
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { toString?: unknown }).toString === "function"
  ) {
    const parsed = Number((value as { toString(): string }).toString());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
