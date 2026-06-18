/**
 * Event update → BattleBoard snapshot-sync middleware.
 *
 * Implements the Event-lifecycle propagation "when an event's details, date, or
 * location change, push the new snapshot to every battle board linked to it"
 * (IMPLEMENTATION_PLAN P1, Event lifecycle → "Event update sync → BattleBoard").
 *
 * WHAT it retires: a hand-written imperative workaround,
 * `apps/app/.../events/actions/sync-battle-boards.ts` (`syncBattleBoardsForEvent`),
 * which was called from server actions AFTER `Event.update`. That glue is
 * exactly the kind of "after a command, also touch related entities" propagation
 * the constitution says must live behind Manifest runtime, not in the transport
 * layer (constitution §4 routes/UI, §5 canonical write path). Moving it into a
 * lifecycle middleware makes the propagation governed and uniform across EVERY
 * caller (UI, API, future jobs) instead of only the two server actions that
 * remembered to call the helper — and it now also fires on `updateDate` /
 * `updateLocation`, which the imperative helper did not cover.
 *
 * WHY middleware and not a reaction (the crux): a battle board is 1:N by
 * `eventId` (one Event can have many boards), so a declarative
 * `on EventUpdated run BattleBoard.syncFromEvent` reaction — which resolves
 * exactly ONE target instance — structurally cannot reach the set (the same
 * blocker `sync-battle-boards.ts` documented, and the same reason the
 * EventCancelled cascade is middleware). Worse, the snapshot fields the board
 * needs (`eventDate`, `clientId`, `guestCount`, `venueName`, `venueAddress`,
 * `locationId`) are the EVENT's OWN fields, NOT the update commands' input
 * params, and the engine payload is `{ ...commandInput, result }` only (declared
 * event fields are never auto-populated from `self.*`) — so even the partial
 * `EventUpdated`/`EventDateUpdated`/`EventLocationUpdated` payloads cannot carry
 * the full snapshot. The middleware therefore LOADS the just-updated Event from
 * the store (it runs `after-emit`, so the row already reflects the update) and
 * fans out `BattleBoard.syncFromEvent` per linked board with the authoritative
 * current values.
 *
 * NO idempotency key, by design: `syncFromEvent` MUST re-run on every update — a
 * static `(tenant,event,board)` key would suppress all syncs after the first,
 * defeating the purpose. The command is naturally idempotent (it overwrites the
 * board snapshot with the Event's current values), so re-execution is harmless.
 *
 * Every skip/failure reports through `onDiagnostic` (default console.warn) —
 * never silently.
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

export interface EventBoardSyncDiagnostic {
  boardId?: string;
  detail?: Record<string, unknown>;
  eventId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventUpdatedBoardSyncMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  /** Indexed lookup — avoids scanning every battle board in the tenant. */
  findLinkedBoards?: (
    tenantId: string,
    eventId: string
  ) => Promise<BoardRow[]>;
  onDiagnostic?: (diag: EventBoardSyncDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

/** The Event-lifecycle events that should re-sync linked battle boards. */
const TRIGGER_EVENTS = new Set([
  "EventUpdated",
  "EventDateUpdated",
  "EventLocationUpdated",
]);

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

const defaultDiagnostic = (diag: EventBoardSyncDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-board-sync:${diag.stage}] ${diag.reason}`, {
    eventId: diag.eventId,
    tenantId: diag.tenantId,
    boardId: diag.boardId,
    ...diag.detail,
  });
};

export function createEventUpdatedBoardSyncMiddleware(
  options: EventUpdatedBoardSyncMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    findLinkedBoards,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      if (ctx.entityName !== "Event") {
        return {};
      }

      const triggers = ctx.emittedEvents.filter((event) =>
        TRIGGER_EVENTS.has(event.name)
      );
      if (triggers.length === 0) {
        return {};
      }

      // De-duplicate by eventId — normally one trigger fires per command, but if
      // several do (or re-emit), sync each board once per command invocation.
      const seen = new Set<string>();

      for (const event of triggers) {
        const payload = event.payload as { tenantId?: unknown } | undefined;

        // The event id is the engine-stamped source instance id — the declared
        // `eventId` event field is NOT auto-populated from self.* (mirrors how
        // EventCreated→BattleBoard reads payload.result.id, not payload.eventId).
        const eventId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(eventId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `${event.name} missing ${eventId ? "tenantId" : "eventId"}`,
            eventId,
            tenantId,
          });
          continue;
        }
        if (seen.has(eventId)) {
          continue;
        }
        seen.add(eventId);

        // Load the just-updated Event (we run after-emit, so the row reflects the
        // update). The snapshot the board needs lives on the Event, not in the
        // partial event payload. getAll().find mirrors the cascade's store usage
        // (tenant-scoped filter, no reliance on a tenant-aware getById).
        const eventStore = storeProvider("Event");
        if (!eventStore) {
          onDiagnostic({
            stage: "stores",
            reason: "Event store unavailable — board sync skipped",
            eventId,
            tenantId,
          });
          continue;
        }
        const eventRow = await loadUpdatedEventRow(
          eventStore,
          eventId,
          tenantId
        );
        if (!eventRow) {
          onDiagnostic({
            stage: "load",
            reason: "updated Event row not found — board sync skipped",
            eventId,
            tenantId,
          });
          continue;
        }

        const boardStore = storeProvider("BattleBoard");
        if (!boardStore) {
          onDiagnostic({
            stage: "stores",
            reason: "BattleBoard store unavailable — board sync skipped",
            eventId,
            tenantId,
          });
          continue;
        }
        const boards = findLinkedBoards
          ? await findLinkedBoards(tenantId, eventId)
          : (await boardStore.getAll())
              .map((row) => row as BoardRow)
              .filter(
                (row) =>
                  asNonEmptyString(row.tenantId) === tenantId &&
                  asNonEmptyString(row.eventId) === eventId &&
                  row.deletedAt == null
              );

        if (boards.length === 0) {
          // Common, not an error: many events have no battle board.
          continue;
        }

        // Build the authoritative snapshot from the Event's current values.
        // syncFromEvent mutates each field unconditionally, so pass all six;
        // empty strings / 0 are valid (they mirror an Event with no venue yet).
        const syncInput: Record<string, unknown> = {
          eventDate: eventRow.eventDate,
          clientId: asString(eventRow.clientId),
          guestCount: asInt(eventRow.guestCount),
          venueName: asString(eventRow.venueName),
          venueAddress: asString(eventRow.venueAddress),
          locationId: asString(eventRow.locationId),
        };

        for (const board of boards) {
          const boardId = asNonEmptyString(board.id);
          if (!boardId) {
            continue;
          }

          const result = await dispatchCommand("syncFromEvent", syncInput, {
            entityName: "BattleBoard",
            instanceId: boardId,
            correlationId: eventId,
            causationId: event.name,
          });

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "dispatch",
              reason: `BattleBoard.syncFromEvent failed for ${boardId}: ${result.error ?? "unknown"}`,
              eventId,
              tenantId,
              boardId,
            });
            continue;
          }

          onDiagnostic({
            stage: "done",
            reason: "BattleBoard.syncFromEvent applied for updated event",
            eventId,
            tenantId,
            boardId,
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

/** Coerce to a string, defaulting to "" (empty is a valid snapshot value). */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Coerce a guest-count-style field to a non-negative integer (default 0). */
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

async function loadUpdatedEventRow(
  eventStore: Store,
  eventId: string,
  tenantId: string
): Promise<EventRow | undefined> {
  const byId = await eventStore.getById(eventId);
  if (byId) {
    const row = byId as EventRow;
    if (
      asNonEmptyString(row.id) === eventId &&
      asNonEmptyString(row.tenantId) === tenantId
    ) {
      return row;
    }
  }

  return (await eventStore.getAll())
    .map((row) => row as EventRow)
    .find(
      (row) =>
        asNonEmptyString(row.id) === eventId &&
        asNonEmptyString(row.tenantId) === tenantId
    );
}
