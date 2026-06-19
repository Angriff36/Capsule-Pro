/**
 * Async reaction handler for event-location → CateringOrder venue snapshot sync.
 *
 * Deferred counterpart of {@link createEventLocationCateringSyncMiddleware}.
 * When `EventLocationUpdated` fires, the middleware (with async enabled)
 * ENQUEUES a job instead of dispatching synchronously; this handler runs LATER
 * in the worker, loads the just-updated Event for its authoritative venue, and
 * fans out `CateringOrder.syncVenue` per linked active (non-terminal) order.
 *
 * Structurally identical to {@link eventUpdatedBoardSyncHandler} (same load +
 * same fan-out + same partial-failure policy), differing only in the target
 * entity (CateringOrder vs BattleBoard) and the eligibility filter (active
 * orders only — terminal orders are physical history whose venue must NOT be
 * rewritten).
 *
 * Idempotency: `syncVenue` overwrites the order's venue with the Event's
 * current values, so re-execution is harmless (no idempotency key — same as
 * the synchronous middleware and the board-sync pilot).
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const EVENT_LOCATION_CATERING_SYNC_REACTION =
  "eventLocationCateringSync";

interface EventRow {
  id?: unknown;
  tenantId?: unknown;
  venueAddress?: unknown;
  venueName?: unknown;
}

interface CateringOrderRow {
  deletedAt?: unknown;
  eventId?: unknown;
  id?: unknown;
  orderStatus?: unknown;
  tenantId?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
  getById(id: string): Promise<unknown | undefined>;
}

const TERMINAL_ORDER_STATUSES = new Set([
  "delivered",
  "completed",
  "cancelled",
]);

/**
 * Handler implementation. Exposed for direct unit testing.
 */
export const eventLocationCateringSyncHandler: AsyncReactionHandler = async (
  ctx: AsyncReactionHandlerContext
): Promise<void> => {
  const { job, dispatchCommand, storeProvider, log } = ctx;
  const eventId = job.triggeringEvent.subjectId;
  const tenantId = job.tenantId;
  if (!eventId) {
    log.warn?.("eventLocationCateringSync: missing subjectId — skipping", {
      jobId: job.id,
    });
    return;
  }

  const eventStore = storeProvider("Event") as ManifestStore | undefined;
  if (!eventStore) {
    throw new Error("Event store unavailable");
  }

  const eventRow = await loadUpdatedEventRow(eventStore, eventId, tenantId);
  if (!eventRow) {
    log.warn?.("eventLocationCateringSync: Event row not found — skipping", {
      jobId: job.id,
      eventId,
    });
    return;
  }

  const orderStore = storeProvider("CateringOrder") as ManifestStore | undefined;
  if (!orderStore) {
    throw new Error("CateringOrder store unavailable");
  }

  const orders = (await orderStore.getAll())
    .map((row) => row as CateringOrderRow)
    .filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.eventId) === eventId &&
        row.deletedAt == null &&
        !TERMINAL_ORDER_STATUSES.has(asString(row.orderStatus))
    );

  if (orders.length === 0) {
    return;
  }

  const syncInput: Record<string, unknown> = {
    venueName: asString(eventRow.venueName),
    venueAddress: asString(eventRow.venueAddress),
  };

  let failures = 0;
  for (const order of orders) {
    const orderId = asNonEmptyString(order.id);
    if (!orderId) continue;

    const result = await dispatchCommand("syncVenue", syncInput, {
      entityName: "CateringOrder",
      instanceId: orderId,
      correlationId: eventId,
      causationId: job.triggeringEvent.name,
    });
    if (!result.success) {
      failures++;
      log.warn?.("eventLocationCateringSync: order dispatch failed", {
        jobId: job.id,
        orderId,
        error: result.error ?? "unknown",
      });
    }
  }

  if (failures > 0 && failures === orders.length) {
    throw new Error(
      `CateringOrder.syncVenue failed for all ${failures} order(s): ${job.id}`
    );
  }
};

async function loadUpdatedEventRow(
  eventStore: ManifestStore,
  eventId: string,
  tenantId: string
): Promise<EventRow | undefined> {
  const byId = (await eventStore.getById(eventId)) as EventRow | undefined;
  if (
    byId &&
    asNonEmptyString(byId.id) === eventId &&
    asNonEmptyString(byId.tenantId) === tenantId
  ) {
    return byId;
  }
  return (await eventStore.getAll())
    .map((row) => row as EventRow)
    .find(
      (row) =>
        asNonEmptyString(row.id) === eventId &&
        asNonEmptyString(row.tenantId) === tenantId
    );
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
