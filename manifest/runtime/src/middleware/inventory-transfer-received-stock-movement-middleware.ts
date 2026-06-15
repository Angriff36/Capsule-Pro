/**
 * InventoryTransfer received → per-location InventoryStock movement middleware.
 *
 * Runs inside the Manifest runtime lifecycle after `TransferReceived` is emitted
 * (`InventoryTransfer.receive`). `InventoryTransfer` walks a status machine
 * (draft → pending_approval → approved → in_transit → received) but NOTHING ever
 * moved the physical `InventoryStock` rows when the transfer was received — no
 * middleware or reaction consumed `TransferReceived`/`TransferShipped`. So stock
 * that physically moved between two locations was never reflected and the
 * per-location balances went permanently stale (IMPLEMENTATION_PLAN P1,
 * Kitchen/Inventory → "InventoryTransfer received → stock movement").
 *
 * This books the whole movement at RECEIPT — the single source of truth, since
 * nothing decrements the source at `ship` time. For each `InventoryTransferItem`
 * it dispatches `InventoryStock.adjust(delta = −qty)` on the source-location row
 * and `adjust(delta = +qty)` on the destination-location row.
 *
 * WHY middleware and not a reaction (two structural blockers):
 *   1. 1:N fan-out — one received transfer moves many item rows across two
 *      locations. A reaction resolves exactly one target instance; this must load
 *      the `InventoryTransferItem` set and the matching `InventoryStock` rows.
 *   2. The location ids (`fromLocationId`/`toLocationId`) are the transfer's OWN
 *      fields, NOT `receive` command params, and declared event fields are never
 *      auto-populated from `self.*`; the middleware reads them off the loaded
 *      transfer instance.
 *
 * AGGREGATE NET-ZERO (the correctness crux): the aggregate
 * `InventoryItem.quantityOnHand` must NOT change — a transfer redistributes
 * on-hand across locations, it does not change the total owned. That falls out
 * for free: each `InventoryStock.adjust` emits `InventoryStockAdjusted`, which the
 * sibling inventory-stock-sync-item middleware mirrors onto the item total, so the
 * source (−qty) and destination (+qty) legs cancel (−qty + +qty = 0). For this to
 * hold, the DESTINATION leg must always be an `adjust` (which IS mirrored). When
 * the destination has no stock row yet, we therefore CREATE it at quantity 0 and
 * THEN `adjust(+qty)` — a direct `create(qty)` would emit `InventoryStockCreated`
 * (NOT mirrored), leaving the item total net −qty. The new row's `unitId` (int) is
 * copied from the source row (same item, same unit), which the transfer item's
 * own `unitId` (a string) cannot supply.
 *
 * Consistency: the source leg goes FIRST; if it fails (the `adjust` block
 * `(quantityOnHand + delta) >= 0` rejects an oversell) or the source row does not
 * exist, the destination leg is skipped — we never add phantom stock at the
 * destination without removing it from the source. Every skip/failure reports
 * through `onDiagnostic` (CLAUDE.md Rule 12 — fail loud), never silently.
 *
 * Idempotency: `receive` guards `status == "in_transit"` and transitions one-way
 * to `received`, so the command itself cannot run twice. As defence-in-depth the
 * dispatch idempotency keys are DETERMINISTIC per (transfer, item, location,
 * direction) so a re-delivered event dedups rather than double-moving stock.
 *
 * Scope: only the FULL `receive` (`TransferReceived`). `partialReceive`
 * (`TransferPartiallyReceived`) carries a `receivedItems` JSON subset with
 * possibly-different quantities and keeps the transfer in_transit — different
 * semantics, a separate increment.
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

export interface InventoryTransferStockMovementDiagnostic {
  detail?: Record<string, unknown>;
  eventName?: string;
  itemId?: string;
  locationId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
  transferId?: string;
}

export interface InventoryTransferReceivedStockMovementMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: InventoryTransferStockMovementDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
}

interface TransferLike {
  fromLocationId?: unknown;
  tenantId?: unknown;
  toLocationId?: unknown;
}

interface TransferItemLike {
  itemId?: unknown;
  quantity?: unknown;
  tenantId?: unknown;
  transferId?: unknown;
}

interface StockLike {
  id?: unknown;
  itemId?: unknown;
  storageLocationId?: unknown;
  tenantId?: unknown;
  unitId?: unknown;
}

interface TransferReceivedPayload {
  tenantId?: unknown;
  transferId?: unknown;
}

const defaultDiagnostic = (
  diag: InventoryTransferStockMovementDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[transfer-stock:${diag.stage}] ${diag.reason}`, {
    eventName: diag.eventName,
    transferId: diag.transferId,
    itemId: diag.itemId,
    locationId: diag.locationId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that moves per-location InventoryStock when an inventory
 * transfer is received: source location − qty, destination location + qty, with
 * the aggregate item total left unchanged via the stock-sync middleware.
 */
export function createInventoryTransferReceivedStockMovementMiddleware(
  options: InventoryTransferReceivedStockMovementMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, onDiagnostic = defaultDiagnostic } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      // Only the FULL receive lifecycle moves stock. partialReceive is out of scope.
      if (
        ctx.entityName !== "InventoryTransfer" ||
        ctx.command.name !== "receive"
      ) {
        return {};
      }

      const received = ctx.emittedEvents.filter(
        (event) => event.name === "TransferReceived"
      );
      if (received.length === 0) {
        return {};
      }

      for (const event of received) {
        const payload = event.payload as TransferReceivedPayload | undefined;
        const transferId =
          asNonEmptyString(payload?.transferId) ??
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        if (!transferId) {
          onDiagnostic({
            stage: "resolve",
            reason: "TransferReceived carried no resolvable transferId",
            eventName: event.name,
          });
          continue;
        }

        const transferStore = storeProvider("InventoryTransfer");
        const transfer = transferStore
          ? ((await transferStore.getById(transferId)) as
              | TransferLike
              | undefined)
          : undefined;
        if (!transfer) {
          onDiagnostic({
            stage: "resolve",
            reason: "received InventoryTransfer not found in store",
            eventName: event.name,
            transferId,
          });
          continue;
        }

        const tenantId =
          asNonEmptyString(transfer.tenantId) ??
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        const fromLocationId = asNonEmptyString(transfer.fromLocationId);
        const toLocationId = asNonEmptyString(transfer.toLocationId);
        if (!(tenantId && fromLocationId && toLocationId)) {
          onDiagnostic({
            stage: "resolve",
            reason:
              "transfer missing tenantId / fromLocationId / toLocationId — cannot move stock",
            eventName: event.name,
            transferId,
            tenantId,
            detail: { fromLocationId, toLocationId },
          });
          continue;
        }
        if (fromLocationId === toLocationId) {
          // create() forbids this, but guard defensively against bad seed data.
          onDiagnostic({
            stage: "resolve",
            reason: "source and destination locations are identical — skipped",
            eventName: event.name,
            transferId,
            tenantId,
          });
          continue;
        }

        const transferItemStore = storeProvider("InventoryTransferItem");
        const stockStore = storeProvider("InventoryStock");
        if (!(transferItemStore && stockStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "InventoryTransferItem or InventoryStock store unavailable",
            eventName: event.name,
            transferId,
            tenantId,
          });
          continue;
        }

        const allItems = (await transferItemStore.getAll()) as TransferItemLike[];
        const lineItems = allItems.filter(
          (row) =>
            asNonEmptyString(row.tenantId) === tenantId &&
            asNonEmptyString(row.transferId) === transferId
        );
        if (lineItems.length === 0) {
          onDiagnostic({
            stage: "items",
            reason:
              "received transfer has no InventoryTransferItem rows — nothing to move",
            eventName: event.name,
            transferId,
            tenantId,
          });
          continue;
        }

        // (itemId, locationId) → stock row. Built once per received transfer.
        const allStock = (await stockStore.getAll()) as StockLike[];
        const stockByItemLocation = new Map<string, StockLike>();
        for (const row of allStock) {
          if (asNonEmptyString(row.tenantId) !== tenantId) {
            continue;
          }
          const itemId = asNonEmptyString(row.itemId);
          const locationId = asNonEmptyString(row.storageLocationId);
          if (itemId && locationId) {
            stockByItemLocation.set(stockKey(itemId, locationId), row);
          }
        }

        for (const line of lineItems) {
          const itemId = asNonEmptyString(line.itemId);
          const quantity = asPositiveNumber(line.quantity);
          if (!itemId || quantity === undefined) {
            onDiagnostic({
              stage: "line",
              reason:
                "transfer line skipped: missing itemId or non-positive quantity",
              eventName: event.name,
              transferId,
              tenantId,
              detail: { itemId, quantity: line.quantity },
            });
            continue;
          }

          const sourceStock = stockByItemLocation.get(
            stockKey(itemId, fromLocationId)
          );
          const sourceStockId = asNonEmptyString(sourceStock?.id);
          if (!(sourceStock && sourceStockId)) {
            // No tracked source stock → cannot book the move out, and no unitId to
            // bootstrap the destination row. Surface it; never invent stock.
            onDiagnostic({
              stage: "source",
              reason:
                "no InventoryStock row at source location for item — move skipped",
              eventName: event.name,
              transferId,
              tenantId,
              itemId,
              locationId: fromLocationId,
            });
            continue;
          }

          // Source leg first: decrement. The adjust block (quantityOnHand + delta
          // >= 0) rejects an oversell — if it fails we do NOT touch the destination.
          const outResult = await dispatchCommand(
            "adjust",
            {
              delta: -quantity,
              reason: `Transfer ${transferId} shipped to ${toLocationId}`,
            },
            {
              entityName: "InventoryStock",
              instanceId: sourceStockId,
              correlationId: transferId,
              causationId: event.name,
              idempotencyKey: `transfer-stock-out:${tenantId}:${transferId}:${fromLocationId}:${itemId}`,
            }
          );
          if (outResult.emittedEvents) {
            ctx.emittedEvents.push(...outResult.emittedEvents);
          }
          if (!outResult.success) {
            onDiagnostic({
              stage: "source",
              reason: `source InventoryStock.adjust failed (likely insufficient stock): ${outResult.error ?? "unknown"}`,
              eventName: event.name,
              transferId,
              tenantId,
              itemId,
              locationId: fromLocationId,
              detail: { quantity },
            });
            continue;
          }

          // Destination leg: increment an existing row, or bootstrap one at 0 then
          // increment (so the +qty rides an adjust → mirrored → aggregate net-zero).
          let destStockId = asNonEmptyString(
            stockByItemLocation.get(stockKey(itemId, toLocationId))?.id
          );
          if (!destStockId) {
            const newStockId = randomUUID();
            const createResult = await dispatchCommand(
              "create",
              {
                // create id travels in the body, NOT instanceId.
                id: newStockId,
                tenantId,
                itemId,
                storageLocationId: toLocationId,
                quantityOnHand: 0,
                // same item → same unit; transfer item unitId is a string, stock
                // unitId is int → copy the source row's int unitId.
                unitId: asFiniteNumber(sourceStock.unitId) ?? 0,
              },
              {
                entityName: "InventoryStock",
                correlationId: transferId,
                causationId: event.name,
                idempotencyKey: `transfer-stock-create:${tenantId}:${transferId}:${toLocationId}:${itemId}`,
              }
            );
            if (createResult.emittedEvents) {
              ctx.emittedEvents.push(...createResult.emittedEvents);
            }
            if (!createResult.success) {
              onDiagnostic({
                stage: "destination",
                reason: `destination InventoryStock.create failed: ${createResult.error ?? "unknown"}`,
                eventName: event.name,
                transferId,
                tenantId,
                itemId,
                locationId: toLocationId,
                detail: {
                  quantity,
                  note: "source already decremented; destination not credited",
                },
              });
              continue;
            }
            destStockId = newStockId;
          }

          const inResult = await dispatchCommand(
            "adjust",
            {
              delta: quantity,
              reason: `Transfer ${transferId} received from ${fromLocationId}`,
            },
            {
              entityName: "InventoryStock",
              instanceId: destStockId,
              correlationId: transferId,
              causationId: event.name,
              idempotencyKey: `transfer-stock-in:${tenantId}:${transferId}:${toLocationId}:${itemId}`,
            }
          );
          if (inResult.emittedEvents) {
            ctx.emittedEvents.push(...inResult.emittedEvents);
          }
          if (!inResult.success) {
            onDiagnostic({
              stage: "destination",
              reason: `destination InventoryStock.adjust failed: ${inResult.error ?? "unknown"}`,
              eventName: event.name,
              transferId,
              tenantId,
              itemId,
              locationId: toLocationId,
              detail: {
                quantity,
                note: "source already decremented; destination not credited",
              },
            });
            continue;
          }

          onDiagnostic({
            stage: "done",
            reason: `moved ${quantity} of item ${itemId}: ${fromLocationId} → ${toLocationId}`,
            eventName: event.name,
            transferId,
            tenantId,
            itemId,
          });
        }
      }

      return {};
    },
  };
}

function stockKey(itemId: string, locationId: string): string {
  return `${itemId}::${locationId}`;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asPositiveNumber(value: unknown): number | undefined {
  const n = asFiniteNumber(value);
  return n !== undefined && n > 0 ? n : undefined;
}

/** Coerce numbers, numeric strings, and Decimal-like objects to a number. */
function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
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
