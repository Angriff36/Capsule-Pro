/**
 * Async reaction handler for shipment receiving → inventory restock.
 *
 * Deferred counterpart of {@link createShipmentItemReceivedInventoryRestockMiddleware}.
 * When `ShipmentItemReceived` fires, the middleware (with async enabled)
 * ENQUEUES a job; this handler runs LATER in the worker, loads the received
 * ShipmentItem + the linked InventoryItem, and dispatches the governed
 * `InventoryItem.restock`.
 *
 * Per-received-line idempotency (forwarded via `idempotencyKey`) is preserved:
 * re-running the same job must NOT double-count stock. This is critical because
 * the worker provides at-least-once delivery (a crash before markDelivered
 * redelivers the job).
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const SHIPMENT_ITEM_RECEIVED_INVENTORY_RESTOCK_REACTION =
  "shipmentItemReceivedInventoryRestock";

interface ShipmentItemLike {
  itemId?: unknown;
  unitCost?: unknown;
}

interface InventoryItemLike {
  unitCost?: unknown;
}

interface ShipmentItemReceivedPayload {
  quantityReceived?: unknown;
  tenantId?: unknown;
  userId?: unknown;
}

interface ManifestStore {
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const shipmentItemReceivedInventoryRestockHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const shipmentItemId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;
    const payload = job.triggeringEvent.payload as
      | ShipmentItemReceivedPayload
      | undefined;

    if (!shipmentItemId) {
      log.warn?.("shipmentRestock: missing subjectId — skipping", {
        jobId: job.id,
      });
      return;
    }

    // `restock` guards `quantity > 0`. Receiving zero is a legitimate no-op.
    const quantity = asFiniteNumber(payload?.quantityReceived);
    if (!(quantity && quantity > 0)) {
      log.warn?.("shipmentRestock: zero/absent quantity — nothing to restock", {
        jobId: job.id,
        shipmentItemId,
      });
      return;
    }

    const shipmentItemStore = storeProvider("ShipmentItem") as
      | ManifestStore
      | undefined;
    const inventoryItemStore = storeProvider("InventoryItem") as
      | ManifestStore
      | undefined;
    if (!(shipmentItemStore && inventoryItemStore)) {
      throw new Error("ShipmentItem/InventoryItem store unavailable");
    }

    const shipmentItem = (await shipmentItemStore.getById(shipmentItemId)) as
      | ShipmentItemLike
      | undefined;
    if (!shipmentItem) {
      throw new Error(`ShipmentItem not found in store: ${shipmentItemId}`);
    }

    const itemId = asNonEmptyString(shipmentItem.itemId);
    if (!itemId) {
      log.warn?.("shipmentRestock: ShipmentItem has no itemId — skipping", {
        jobId: job.id,
        shipmentItemId,
      });
      return;
    }

    const inventoryItem = (await inventoryItemStore.getById(itemId)) as
      | InventoryItemLike
      | undefined;
    if (!inventoryItem) {
      throw new Error(`linked InventoryItem not found: ${itemId}`);
    }

    // Use the ShipmentItem's real unitCost; PRESERVE the item's existing cost
    // when the shipment line carries none (mirrors the synchronous middleware).
    const shipmentUnitCost = asFiniteNumber(shipmentItem.unitCost) ?? 0;
    const existingUnitCost = asFiniteNumber(inventoryItem.unitCost) ?? 0;
    const costPerUnit =
      shipmentUnitCost > 0 ? shipmentUnitCost : existingUnitCost;

    const userId = asNonEmptyString(payload?.userId) ?? "system";

    const result = await dispatchCommand(
      "restock",
      {
        id: itemId,
        tenantId,
        quantity,
        costPerUnit,
        userId,
      },
      {
        entityName: "InventoryItem",
        instanceId: itemId,
        correlationId: shipmentItemId,
        causationId: "ShipmentItemReceived",
        // Per received line — re-receiving the same line must not double-count.
        // The worker is at-least-once, so this key is load-bearing.
        idempotencyKey:
          job.idempotencyKey ?? `shipment-restock:${tenantId}:${shipmentItemId}`,
      }
    );

    if (!result.success) {
      throw new Error(
        `InventoryItem.restock failed for ${itemId}: ${result.error ?? "unknown"}`
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
