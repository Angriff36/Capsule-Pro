/**
 * Async reaction handler for battle board sync.
 *
 * Deferred counterpart of {@link createEventUpdatedBoardSyncMiddleware}. When
 * `EventUpdated` / `EventDateUpdated` / `EventLocationUpdated` fire, the
 * middleware (with async enabled) ENQUEUES a job instead of dispatching
 * synchronously; this handler runs LATER in the worker, loads the just-updated
 * Event, and fans out `BattleBoard.syncFromEvent` per linked board.
 *
 * The dispatch logic is identical to the synchronous middleware (same load +
 * same input shape + same idempotency decision). It is duplicated here rather
 * than shared because the synchronous middleware has access to
 * `ctx.emittedEvents` / `ctx.instanceId` (the engine-stamped subject id), while
 * the async handler only has the {@link TriggeringEventPayload} captured at
 * enqueue time. Keeping the two paths independent means each can evolve
 * without coupling.
 *
 * Idempotency: `syncFromEvent` overwrites the board snapshot with the Event's
 * current values, so re-execution is harmless (no idempotency key — same as
 * the synchronous middleware).
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const EVENT_UPDATED_BOARD_SYNC_REACTION = "eventUpdatedBoardSync";

interface EventRow {
  clientId?: unknown;
  eventDate?: unknown;
  guestCount?: unknown;
  id?: unknown;
  locationId?: unknown;
  tenantId?: unknown;
  venueAddress?: unknown;
  venueName?: unknown;
}

interface BoardRow {
  deletedAt?: unknown;
  eventId?: unknown;
  id?: unknown;
  tenantId?: unknown;
}

interface ManifestStore {
  getAll(): Promise<unknown[]>;
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing (the registry
 * registers a thin wrapper around it).
 */
export const eventUpdatedBoardSyncHandler: AsyncReactionHandler = async (
  ctx: AsyncReactionHandlerContext
): Promise<void> => {
  const { job, dispatchCommand, storeProvider, log } = ctx;
  const eventId = job.triggeringEvent.subjectId;
  const tenantId = job.tenantId;
  if (!eventId) {
    log.warn?.("eventUpdatedBoardSync: missing subjectId — skipping", {
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
    log.warn?.("eventUpdatedBoardSync: Event row not found — skipping", {
      jobId: job.id,
      eventId,
    });
    return;
  }

  const boardStore = storeProvider("BattleBoard") as ManifestStore | undefined;
  if (!boardStore) {
    throw new Error("BattleBoard store unavailable");
  }

  const boards = (await boardStore.getAll())
    .map((row) => row as BoardRow)
    .filter(
      (row) =>
        asNonEmptyString(row.tenantId) === tenantId &&
        asNonEmptyString(row.eventId) === eventId &&
        row.deletedAt == null
    );

  if (boards.length === 0) {
    return;
  }

  const syncInput: Record<string, unknown> = {
    eventDate: eventRow.eventDate,
    clientId: asString(eventRow.clientId),
    guestCount: asInt(eventRow.guestCount),
    venueName: asString(eventRow.venueName),
    venueAddress: asString(eventRow.venueAddress),
    locationId: asString(eventRow.locationId),
  };

  let failures = 0;
  for (const board of boards) {
    const boardId = asNonEmptyString(board.id);
    if (!boardId) continue;

    const result = await dispatchCommand("syncFromEvent", syncInput, {
      entityName: "BattleBoard",
      instanceId: boardId,
      correlationId: eventId,
      causationId: job.triggeringEvent.name,
    });
    if (!result.success) {
      failures++;
      log.warn?.("eventUpdatedBoardSync: board dispatch failed", {
        jobId: job.id,
        boardId,
        error: result.error ?? "unknown",
      });
    }
  }

  // A partial failure (some boards synced, some failed) does NOT throw — the
  // boards that succeeded should not be retried (idempotent overwrite is
  // harmless, but it adds load + log noise). The failed boards are surfaced
  // via `log.warn` for ops to investigate. If ALL boards fail, surface as a
  // hard failure so the retry/DLQ path engages.
  if (failures > 0 && failures === boards.length) {
    throw new Error(
      `BattleBoard.syncFromEvent failed for all ${failures} board(s): ${job.id}`
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

function asInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }
  return 0;
}
