/**
 * Async reaction handler for VendorBlacklisted → PurchaseOrder cancel cascade.
 *
 * Deferred counterpart of {@link createVendorBlacklistedCancelPurchaseOrdersMiddleware}.
 * When `VendorBlacklisted` fires, the middleware (with async enabled) ENQUEUES
 * a job instead of dispatching synchronously; this handler runs LATER in the
 * worker, loads every open PurchaseOrder linked to the blacklisted vendor, and
 * dispatches the governed `PurchaseOrder.cancel` per cancellable order.
 *
 * The load + filter + dispatch logic is duplicated here from the synchronous
 * middleware (same CANCELLABLE_PO_STATUSES set, same input shape). The two
 * paths are intentionally independent: the middleware reads `ctx.emittedEvents`
 * and the engine-stamped `event.subject?.id`, while the handler only has the
 * {@link TriggeringEventPayload} captured at enqueue time.
 *
 * Idempotency: per (tenant, vendor, PO) — every dispatch carries
 * `vendor-blacklist:${tenantId}:${vendorId}:${poId}`. The cascade is
 * guard-safe (only POs whose status is still a valid `from` for the
 * `-> cancelled` transition dispatch), so a re-run after partial completion
 * skips already-cancelled POs. The worker is at-least-once; these keys are
 * load-bearing.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const VENDOR_BLACKLISTED_CANCEL_PURCHASE_ORDERS_REACTION =
  "vendorBlacklistedCancelPurchaseOrders";

interface PurchaseOrderRow {
  deletedAt?: unknown;
  id?: unknown;
  status?: unknown;
  tenantId?: unknown;
  vendorId?: unknown;
}

interface VendorBlacklistedPayload {
  blacklistedBy?: unknown;
  reason?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
}

const CANCELLABLE_PO_STATUSES = new Set([
  "draft",
  "submitted",
  "approved",
  "ordered",
  "partially_received",
]);

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const vendorBlacklistedCancelPurchaseOrdersHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const vendorId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;
    const payload = job.triggeringEvent.payload as
      | VendorBlacklistedPayload
      | undefined;

    if (!vendorId) {
      log.warn?.(
        "vendorBlacklistedCancelPurchaseOrders: missing subjectId — skipping",
        { jobId: job.id }
      );
      return;
    }

    const store = storeProvider("PurchaseOrder") as ManifestStore | undefined;
    if (!store) {
      throw new Error("PurchaseOrder store unavailable");
    }

    const actor = asNonEmptyString(payload?.blacklistedBy) ?? "system";
    const blacklistReason = asNonEmptyString(payload?.reason);
    const cancelReason = blacklistReason
      ? `Vendor blacklisted: ${blacklistReason}`
      : "Vendor blacklisted";

    const openOrders = (await store.getAll())
      .map((row) => row as PurchaseOrderRow)
      .filter(
        (row) =>
          asNonEmptyString(row.tenantId) === tenantId &&
          asNonEmptyString(row.vendorId) === vendorId &&
          row.deletedAt == null &&
          CANCELLABLE_PO_STATUSES.has(asNonEmptyString(row.status) ?? "")
      );

    if (openOrders.length === 0) {
      return;
    }

    let failures = 0;
    for (const row of openOrders) {
      const poId = asNonEmptyString(row.id);
      if (!poId) continue;

      const result = await dispatchCommand(
        "cancel",
        { userId: actor, reason: cancelReason },
        {
          entityName: "PurchaseOrder",
          instanceId: poId,
          correlationId: vendorId,
          causationId: "VendorBlacklisted",
          idempotencyKey: `vendor-blacklist:${tenantId}:${vendorId}:${poId}`,
        }
      );
      if (!result.success) {
        failures++;
        log.warn?.(
          "vendorBlacklistedCancelPurchaseOrders: PO cancel failed",
          { jobId: job.id, poId, error: result.error ?? "unknown" }
        );
      }
    }

    if (failures > 0 && failures === openOrders.length) {
      throw new Error(
        `PurchaseOrder.cancel failed for all ${failures} open order(s): ${job.id}`
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
