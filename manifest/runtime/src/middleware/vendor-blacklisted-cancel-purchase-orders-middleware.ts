/**
 * VendorBlacklisted → cancel the vendor's open PurchaseOrders.
 *
 * Implements the procurement orphan-event mop-up "VendorSuspended/VendorBlacklisted
 * → cancel/flag open PurchaseOrders" (IMPLEMENTATION_PLAN: Operations / "Orphan-event
 * mop-up"). Before this, `VendorBlacklisted` (procurement/vendor-rules.manifest:202,
 * emitted by `Vendor.blacklist`) had ZERO consumers: blacklisting a vendor for cause
 * (fraud, food-safety, chronic non-delivery) permanently bans them — `status =
 * "blacklisted"` is a TERMINAL state (no transition out, and `approve` guards
 * `status != "blacklisted"`) — yet every open PurchaseOrder still pointing at that
 * vendor stayed live and would continue to be ordered, received, and paid. This closes
 * that financial-integrity hole: one governed `Vendor.blacklist` fans out to
 * `PurchaseOrder.cancel` for every still-cancellable PO linked by `vendorId`.
 *
 * WHY blacklist ONLY, not suspend (the crux): `Vendor.suspend` → `status = "inactive"`
 * is REVERSIBLE (`approve` transitions `inactive → active`), so irreversibly cancelling
 * a suspended vendor's in-flight POs would be wrong the moment the pause is lifted.
 * `blacklist` → `"blacklisted"` is permanent. This mirrors the Dish precedent in the
 * plan (cascade the permanent `deactivate`; defer the reversible `eightySix` which needs
 * a restore path). Suspension intentionally has no destructive cascade here.
 *
 * WHY middleware and not a reaction: this is a 1:N fan-out — one blacklisted Vendor has
 * MANY open PurchaseOrders, resolved by `vendorId`. A declarative `on VendorBlacklisted
 * run PurchaseOrder.cancel` reaction resolves exactly ONE target instance, so it
 * structurally cannot reach the set (same reason as the EventCancelled cascade). The
 * vendor id is also reachable only as the engine-stamped `event.subject?.id` (the
 * declared `vendorId` event field is NOT auto-populated from `self.*`, and `blacklist`
 * does not take it as a param).
 *
 * The leg is GUARD- and TRANSITION-SAFE and IDEMPOTENT: only POs whose status is still a
 * valid `from` for the `-> cancelled` transition (draft / submitted / approved / ordered
 * / partially_received) AND that are not soft-deleted are dispatched, so terminal
 * (received / cancelled / rejected — note `rejected -> cancelled` is NOT a declared
 * transition) and already-deleted POs are skipped rather than spamming swallowed
 * failures. A re-emitted `VendorBlacklisted` finds nothing open and no-ops.
 *
 * Scope notes (documented, deliberate): `PurchaseRequisition` is NOT cascaded — its
 * header carries no vendor FK (only requisition ITEMS suggest a vendor), so it cannot be
 * resolved by `vendorId`. `InventorySupplier` (the inventory-side supplier entity) also
 * emits blacklist events, but `PurchaseOrder.vendorId` links to the procurement `Vendor`
 * entity, not InventorySupplier — so only `VendorBlacklisted` is consumed here.
 *
 * KNOWN LIMITATION (documented, not silent): each dispatched `cancel` runs as the actor
 * who blacklisted the vendor and is subject to PurchaseOrder's policy
 * (procurement_manager / manager / admin). That is the SAME role set as `Vendor.blacklist`'s
 * policy, so the common path always aligns (no policy-skip class). A failure still surfaces
 * through `onDiagnostic` rather than being swallowed.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import type { AsyncDispatch } from "../async-reactions";
import {
  captureTriggeringEvents,
  VENDOR_BLACKLISTED_CANCEL_PURCHASE_ORDERS_REACTION,
} from "../async-reactions";

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

export interface VendorBlacklistedCancelPurchaseOrdersDiagnostic {
  detail?: Record<string, unknown>;
  purchaseOrderId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
  vendorId?: string;
}

export interface VendorBlacklistedCancelPurchaseOrdersMiddlewareOptions {
  asyncEnqueue?: AsyncDispatch;
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: VendorBlacklistedCancelPurchaseOrdersDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface PurchaseOrderRow {
  deletedAt?: unknown;
  id?: unknown;
  status?: unknown;
  tenantId?: unknown;
  vendorId?: unknown;
}

/**
 * PO statuses that are a valid `from` for the `-> cancelled` transition AND pass
 * `PurchaseOrder.cancel`'s guards (status != received, status != cancelled).
 * `rejected` is intentionally excluded: it is terminal with NO declared
 * `rejected -> cancelled` transition, so dispatching cancel on it would be a
 * swallowed engine rejection, not a real cancel.
 */
const CANCELLABLE_PO_STATUSES = new Set([
  "draft",
  "submitted",
  "approved",
  "ordered",
  "partially_received",
]);

const defaultDiagnostic = (
  diag: VendorBlacklistedCancelPurchaseOrdersDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[vendor-blacklist-po-cancel:${diag.stage}] ${diag.reason}`, {
    vendorId: diag.vendorId,
    tenantId: diag.tenantId,
    purchaseOrderId: diag.purchaseOrderId,
    ...diag.detail,
  });
};

export function createVendorBlacklistedCancelPurchaseOrdersMiddleware(
  options: VendorBlacklistedCancelPurchaseOrdersMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
    asyncEnqueue,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const blacklistedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "VendorBlacklisted" &&
          ctx.entityName === "Vendor" &&
          ctx.command.name === "blacklist"
      );

      if (asyncEnqueue && blacklistedEvents.length > 0) {
        await captureTriggeringEvents({
          asyncEnqueue,
          ctx,
          events: blacklistedEvents,
          reactionName: VENDOR_BLACKLISTED_CANCEL_PURCHASE_ORDERS_REACTION,
        });
        return {};
      }

      for (const event of blacklistedEvents) {
        const payload = event.payload as
          | { blacklistedBy?: unknown; reason?: unknown; tenantId?: unknown }
          | undefined;

        // The vendor id is the engine-stamped source instance id — the declared
        // `vendorId` event field is NOT auto-populated from self.* (mirrors the
        // EventCancelled cascade reading event.subject?.id, not payload.vendorId).
        const vendorId = asNonEmptyString(event.subject?.id);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(vendorId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `VendorBlacklisted missing ${vendorId ? "tenantId" : "vendorId"}`,
            vendorId,
            tenantId,
          });
          continue;
        }

        const store = storeProvider("PurchaseOrder");
        if (!store) {
          onDiagnostic({
            stage: "stores",
            reason: "PurchaseOrder store unavailable — cancel cascade skipped",
            vendorId,
            tenantId,
          });
          continue;
        }

        // `blacklistedBy` IS a Vendor.blacklist input param, so it rides the payload;
        // fall back to "system" so PurchaseOrder.cancel always has a userId. The cancel
        // reason references the blacklist reason for an auditable trail.
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

        for (const row of openOrders) {
          const poId = asNonEmptyString(row.id);
          if (!poId) {
            continue;
          }

          const result = await dispatchCommand(
            "cancel",
            { userId: actor, reason: cancelReason },
            {
              entityName: "PurchaseOrder",
              instanceId: poId,
              correlationId: vendorId,
              causationId: "VendorBlacklisted",
              idempotencyKey: `vendor-blacklist-po-cancel:${tenantId}:${vendorId}:${poId}`,
            }
          );

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "dispatch",
              reason: `PurchaseOrder.cancel failed for ${poId}: ${result.error ?? "unknown"}`,
              vendorId,
              tenantId,
              purchaseOrderId: poId,
            });
            continue;
          }

          onDiagnostic({
            stage: "done",
            reason: "PurchaseOrder.cancel applied for blacklisted vendor",
            vendorId,
            tenantId,
            purchaseOrderId: poId,
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
