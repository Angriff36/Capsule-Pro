/**
 * Async reaction handler: PrepListCancelled → InventoryItem.releaseReservation.
 *
 * Deferred counterpart of
 * {@link createPrepListCancelledReleaseReservationMiddleware}.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

export const PREP_LIST_CANCELLED_RELEASE_RESERVATION_REACTION =
  "prepListCancelledReleaseReservation";

interface PrepListLike {
  eventId?: unknown;
  id?: unknown;
  tenantId?: unknown;
}

interface PrepListItemLike {
  id?: unknown;
  ingredientId?: unknown;
  ingredientName?: unknown;
  prepListId?: unknown;
  scaledQuantity?: unknown;
  tenantId?: unknown;
}

interface InventoryItemLike {
  quantityReserved?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
  getById(id: string): Promise<unknown | undefined>;
}

const SYSTEM_USER_ID = "system:prep-release";

export const prepListCancelledReleaseReservationHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const prepListId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;
    if (!prepListId) {
      log.warn?.("prepListCancelledReleaseReservation: missing subjectId", {
        jobId: job.id,
      });
      return;
    }

    const prepListStore = storeProvider("PrepList") as ManifestStore | undefined;
    if (!prepListStore) throw new Error("PrepList store unavailable");

    const prepList = (await prepListStore.getById(prepListId)) as
      | PrepListLike
      | undefined;
    const eventId = asNonEmptyString(prepList?.eventId);
    if (!eventId) {
      log.warn?.(
        "prepListCancelledReleaseReservation: no eventId — skipping",
        { jobId: job.id, prepListId }
      );
      return;
    }

    const itemStore = storeProvider("PrepListItem") as ManifestStore | undefined;
    const inventoryStore = storeProvider("InventoryItem") as
      | ManifestStore
      | undefined;
    if (!(itemStore && inventoryStore)) {
      throw new Error("PrepListItem/InventoryItem store unavailable");
    }

    const items = (await itemStore.getAll())
      .map((item) => item as PrepListItemLike)
      .filter(
        (item) =>
          asNonEmptyString(item.tenantId) === tenantId &&
          asNonEmptyString(item.prepListId) === prepListId
      );

    if (items.length === 0) return;

    let failures = 0;
    let dispatched = 0;
    for (const item of items) {
      const inventoryItemId = asNonEmptyString(item.ingredientId);
      const quantity = asPositiveNumber(item.scaledQuantity);
      if (!inventoryItemId || quantity === undefined) continue;

      const inventoryItem = (await inventoryStore.getById(inventoryItemId)) as
        | InventoryItemLike
        | undefined;
      const reserved = asNumber(inventoryItem?.quantityReserved);
      if (reserved <= 0) continue;

      dispatched++;
      const result = await dispatchCommand(
        "releaseReservation",
        {
          quantity,
          eventId,
          userId: SYSTEM_USER_ID,
        },
        {
          entityName: "InventoryItem",
          instanceId: inventoryItemId,
          correlationId: eventId,
          causationId: job.triggeringEvent.name,
          idempotencyKey: `prep-release:${tenantId}:${prepListId}:release:${inventoryItemId}`,
        }
      );

      if (!result.success) {
        failures++;
        log.warn?.(
          "prepListCancelledReleaseReservation: release failed",
          {
            jobId: job.id,
            inventoryItemId,
            error: result.error ?? "unknown",
          }
        );
      }
    }

    if (dispatched > 0 && failures === dispatched) {
      throw new Error(
        `InventoryItem.releaseReservation failed for all ${failures} item(s): ${job.id}`
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}
