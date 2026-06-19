/**
 * Async reaction handler for inventory transfer received → stock movement.
 *
 * Deferred counterpart of {@link createInventoryTransferReceivedStockMovementMiddleware}.
 * When `TransferReceived` fires (from `InventoryTransfer.receive`), the
 * middleware (with async enabled) ENQUEUES a job; this handler runs LATER in
 * the worker, loads the received transfer + its line items, and books the
 * per-location stock movement: `InventoryStock.adjust(-qty)` on the source
 * row and `InventoryStock.adjust(+qty)` on the destination row for each
 * `InventoryTransferItem`.
 *
 * When the destination has no existing stock row, one is bootstrapped at
 * quantity 0 before the increment so the +qty rides an `adjust` (which is
 * mirrored onto the aggregate item total by the sibling stock-sync middleware),
 * keeping the aggregate net-zero. The source leg runs first; if it fails the
 * destination leg is skipped so phantom stock is never created.
 *
 * The location ids (`fromLocationId`/`toLocationId`) are the transfer's OWN
 * fields (not `receive` params), so the handler loads the transfer instance to
 * resolve them — the same structural reason this was middleware, not a
 * reaction, in the synchronous path.
 *
 * Idempotency: deterministic per (tenant, transfer, item, location, leg) so a
 * re-delivered job dedups each movement leg rather than double-moving stock.
 *
 * Partial failures: if at least one item movement completes fully the job is
 * treated as delivered (succeeded legs are not retried); failed items are
 * surfaced via `log.warn`. Only when every attempted movement fails does the
 * handler throw so the retry/DLQ path engages.
 */

import { randomUUID } from "node:crypto";
import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const INVENTORY_TRANSFER_RECEIVED_STOCK_MOVEMENT_REACTION =
  "inventoryTransferReceivedStockMovement";

interface TransferLike {
  fromLocationId?: unknown;
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

interface ManifestStore {
  getAll(): Promise<unknown[]>;
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing (the registry
 * registers a thin wrapper around it).
 */
export const inventoryTransferReceivedStockMovementHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const transferId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;

    if (!transferId) {
      log.warn?.(
        "transferStockMovement: missing subjectId — skipping",
        { jobId: job.id }
      );
      return;
    }

    const transferStore = storeProvider("InventoryTransfer") as
      | ManifestStore
      | undefined;
    const transferItemStore = storeProvider("InventoryTransferItem") as
      | ManifestStore
      | undefined;
    const stockStore = storeProvider("InventoryStock") as
      | ManifestStore
      | undefined;
    if (!(transferStore && transferItemStore && stockStore)) {
      throw new Error(
        "InventoryTransfer/InventoryTransferItem/InventoryStock store unavailable"
      );
    }

    const transfer = (await transferStore.getById(transferId)) as
      | TransferLike
      | undefined;
    if (!transfer) {
      log.warn?.(
        "transferStockMovement: received InventoryTransfer not found in store — skipping",
        { jobId: job.id, transferId }
      );
      return;
    }

    const fromLocationId = asNonEmptyString(transfer.fromLocationId);
    const toLocationId = asNonEmptyString(transfer.toLocationId);
    if (!(fromLocationId && toLocationId)) {
      log.warn?.(
        "transferStockMovement: transfer missing fromLocationId/toLocationId — skipping",
        { jobId: job.id, transferId }
      );
      return;
    }
    if (fromLocationId === toLocationId) {
      log.warn?.(
        "transferStockMovement: source and destination locations are identical — skipping",
        { jobId: job.id, transferId }
      );
      return;
    }

    const lineItems = (
      (await transferItemStore.getAll()) as TransferItemLike[]
    ).filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.transferId) === transferId
    );
    if (lineItems.length === 0) {
      log.info?.(
        "transferStockMovement: transfer has no line items — nothing to move",
        { jobId: job.id, transferId }
      );
      return;
    }

    const stockByItemLocation = new Map<string, StockLike>();
    for (const row of (await stockStore.getAll()) as StockLike[]) {
      if (asNonEmptyString(row.tenantId) !== tenantId) {
        continue;
      }
      const itemId = asNonEmptyString(row.itemId);
      const locationId = asNonEmptyString(row.storageLocationId);
      if (itemId && locationId) {
        stockByItemLocation.set(stockKey(itemId, locationId), row);
      }
    }

    const eventName = job.triggeringEvent.name;
    let itemSuccesses = 0;
    let itemFailures = 0;

    for (const line of lineItems) {
      const itemId = asNonEmptyString(line.itemId);
      const quantity = asPositiveNumber(line.quantity);
      if (!itemId || quantity === undefined) {
        log.warn?.(
          "transferStockMovement: line skipped — missing itemId or non-positive quantity",
          { jobId: job.id, transferId, detail: { itemId, quantity: line.quantity } }
        );
        continue;
      }

      const sourceStock = stockByItemLocation.get(
        stockKey(itemId, fromLocationId)
      );
      const sourceStockId = asNonEmptyString(sourceStock?.id);
      if (!(sourceStock && sourceStockId)) {
        log.warn?.(
          "transferStockMovement: no source InventoryStock row — move skipped",
          { jobId: job.id, transferId, itemId, locationId: fromLocationId }
        );
        continue;
      }

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
          causationId: eventName,
          idempotencyKey: `transfer-received:${tenantId}:${transferId}:${itemId}:${fromLocationId}:out`,
        }
      );
      if (!outResult.success) {
        itemFailures++;
        log.warn?.(
          "transferStockMovement: source adjust failed — destination skipped",
          {
            jobId: job.id,
            transferId,
            itemId,
            locationId: fromLocationId,
            quantity,
            error: outResult.error ?? "unknown",
          }
        );
        continue;
      }

      let destStockId = asNonEmptyString(
        stockByItemLocation.get(stockKey(itemId, toLocationId))?.id
      );
      if (!destStockId) {
        const newStockId = randomUUID();
        const createResult = await dispatchCommand(
          "create",
          {
            id: newStockId,
            tenantId,
            itemId,
            storageLocationId: toLocationId,
            quantityOnHand: 0,
            unitId: asFiniteNumber(sourceStock.unitId) ?? 0,
          },
          {
            entityName: "InventoryStock",
            correlationId: transferId,
            causationId: eventName,
            idempotencyKey: `transfer-received:${tenantId}:${transferId}:${itemId}:${toLocationId}:create`,
          }
        );
        if (!createResult.success) {
          itemFailures++;
          log.warn?.(
            "transferStockMovement: destination create failed — source already decremented, destination not credited",
            {
              jobId: job.id,
              transferId,
              itemId,
              locationId: toLocationId,
              quantity,
              error: createResult.error ?? "unknown",
            }
          );
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
          causationId: eventName,
          idempotencyKey: `transfer-received:${tenantId}:${transferId}:${itemId}:${toLocationId}:in`,
        }
      );
      if (!inResult.success) {
        itemFailures++;
        log.warn?.(
          "transferStockMovement: destination adjust failed — source already decremented, destination not credited",
          {
            jobId: job.id,
            transferId,
            itemId,
            locationId: toLocationId,
            quantity,
            error: inResult.error ?? "unknown",
          }
        );
        continue;
      }

      itemSuccesses++;
    }

    if (itemFailures > 0 && itemSuccesses === 0) {
      throw new Error(
        `InventoryStock movement failed for all ${itemFailures} item(s): ${job.id}`
      );
    }
  };

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
