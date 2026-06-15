/**
 * Event location change → CateringOrder venue snapshot-sync middleware.
 *
 * Implements the Event-lifecycle propagation "when an event's LOCATION changes,
 * push the new venue to every active catering order linked to it"
 * (IMPLEMENTATION_PLAN P1, Event lifecycle → "Event update sync → CateringOrder
 * venue snapshot"). It is the deliberate sibling of
 * `event-updated-board-sync-middleware.ts` (the BattleBoard leg), split into its
 * own source/IR change per PR as the plan directs.
 *
 * WHY middleware and not a reaction (the crux, identical to the BattleBoard leg):
 * a catering order is 1:N by `eventId` (one Event can have many orders), so a
 * declarative `on EventLocationUpdated run CateringOrder.syncVenue` reaction —
 * which resolves exactly ONE target instance — structurally cannot reach the set.
 * The middleware loads the just-updated Event from the store (it runs
 * `after-emit`, so the row reflects the update) and fans out
 * `CateringOrder.syncVenue` per linked active order with the Event's current
 * venue.
 *
 * WHAT it syncs and WHY only two fields: the Event entity owns ONLY `venueName`
 * and `venueAddress` (plus `locationId`/`venueId`, which CateringOrder does not
 * carry). The order's `venueCity`/`venueState`/`venueZip`/`venueContactName`/
 * `venueContactPhone` are caller-supplied on the order — the Event has no such
 * fields (catering-order-rules.manifest documents this on the `create` command),
 * so syncing them is impossible without inventing data and would blank them. We
 * therefore sync exactly the two venue fields the Event authoritatively owns.
 *
 * WHY only ACTIVE orders (draft/confirmed/in_progress): a delivered, completed,
 * or cancelled order is a physical/historical fact — it was delivered to (or
 * cancelled against) the venue it then carried. Re-syncing its venue after the
 * event's location later changes would rewrite that history. This is the one
 * deliberate divergence from the BattleBoard leg, which has no terminal record
 * and so syncs every linked board.
 *
 * WHY only `EventLocationUpdated` (not the broader EventUpdated/EventDateUpdated
 * the board leg also listens to): venue is the location concern, and
 * `Event.updateLocation` is the dedicated path that mutates `venueName`/
 * `venueAddress` and emits `EventLocationUpdated`. Date/general updates do not
 * change the order's venue.
 *
 * NO idempotency key, by design: `syncVenue` MUST re-run on every location change
 * — a static `(tenant,event,order)` key would suppress all syncs after the first.
 * The command is naturally idempotent (it overwrites the order's venue with the
 * Event's current values), so re-execution is harmless.
 *
 * KNOWN LIMITATION (documented, not silent): each dispatched `syncVenue` runs as
 * the SAME actor who updated the event location, subject to CateringOrder's
 * default policy (`user.role in [event_coordinator, catering_manager, manager,
 * admin]`). Updating an event's location is an event-coordinator/manager action,
 * so the common case passes; a lower-privilege actor's update yields a
 * policy-denied + skipped leg with a diagnostic (the runtime has no per-call
 * identity override). Every skip/failure reports through `onDiagnostic` (default
 * console.warn) — never silently.
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

export interface EventCateringVenueSyncDiagnostic {
  detail?: Record<string, unknown>;
  eventId?: string;
  orderId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventLocationCateringSyncMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: EventCateringVenueSyncDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

/** The Event-lifecycle event that re-syncs linked catering orders' venue. */
const TRIGGER_EVENTS = new Set(["EventLocationUpdated"]);

/**
 * Catering orders past their active life are physical history — their venue must
 * NOT be rewritten by a later event-location change.
 */
const TERMINAL_ORDER_STATUSES = new Set(["delivered", "completed", "cancelled"]);

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

const defaultDiagnostic = (diag: EventCateringVenueSyncDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-catering-venue-sync:${diag.stage}] ${diag.reason}`, {
    eventId: diag.eventId,
    tenantId: diag.tenantId,
    orderId: diag.orderId,
    ...diag.detail,
  });
};

export function createEventLocationCateringSyncMiddleware(
  options: EventLocationCateringSyncMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
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
      // several do (or re-emit), sync each order once per command invocation.
      const seen = new Set<string>();

      for (const event of triggers) {
        const payload = event.payload as { tenantId?: unknown } | undefined;

        // The event id is the engine-stamped source instance id — the declared
        // `eventId` event field is NOT auto-populated from self.* (mirrors how
        // the board-sync leg reads event.subject?.id, not payload.eventId).
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
        // location change). venueName/venueAddress are the Event's own fields —
        // although updateLocation's params DO ride the payload, we read the
        // persisted row so this leg stays structurally identical to the board
        // leg and authoritative regardless of payload shape.
        const eventStore = storeProvider("Event");
        if (!eventStore) {
          onDiagnostic({
            stage: "stores",
            reason: "Event store unavailable — venue sync skipped",
            eventId,
            tenantId,
          });
          continue;
        }
        const eventRow = (await eventStore.getAll())
          .map((row) => row as EventRow)
          .find(
            (row) =>
              asNonEmptyString(row.id) === eventId &&
              asNonEmptyString(row.tenantId) === tenantId
          );
        if (!eventRow) {
          onDiagnostic({
            stage: "load",
            reason: "updated Event row not found — venue sync skipped",
            eventId,
            tenantId,
          });
          continue;
        }

        const orderStore = storeProvider("CateringOrder");
        if (!orderStore) {
          onDiagnostic({
            stage: "stores",
            reason: "CateringOrder store unavailable — venue sync skipped",
            eventId,
            tenantId,
          });
          continue;
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
          // Common, not an error: many events have no (active) catering order.
          continue;
        }

        // The two venue fields the Event authoritatively owns. syncVenue mutates
        // both unconditionally; empty strings are valid (an event with no venue).
        const syncInput: Record<string, unknown> = {
          venueName: asString(eventRow.venueName),
          venueAddress: asString(eventRow.venueAddress),
        };

        for (const order of orders) {
          const orderId = asNonEmptyString(order.id);
          if (!orderId) {
            continue;
          }

          const result = await dispatchCommand("syncVenue", syncInput, {
            entityName: "CateringOrder",
            instanceId: orderId,
            correlationId: eventId,
            causationId: event.name,
          });

          if (result.emittedEvents) {
            ctx.emittedEvents.push(...result.emittedEvents);
          }
          if (!result.success) {
            onDiagnostic({
              stage: "dispatch",
              reason: `CateringOrder.syncVenue failed for ${orderId}: ${result.error ?? "unknown"}`,
              eventId,
              tenantId,
              orderId,
            });
            continue;
          }

          onDiagnostic({
            stage: "done",
            reason: "CateringOrder.syncVenue applied for relocated event",
            eventId,
            tenantId,
            orderId,
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

/** Coerce to a string, defaulting to "" (empty is a valid venue value). */
function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
