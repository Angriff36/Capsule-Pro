/**
 * EventFinalized → inventory reservation-release middleware.
 *
 * The close-out (event-driven) counterpart of
 * `prep-list-cancelled-release-reservation`. The `prep-inventory-demand`
 * middleware RESERVES ingredient quantities when a prep list is FINALIZED
 * (`InventoryItem.reserve`, bumping `quantityReserved`); completion
 * releases+consumes them and explicit cancellation releases them. But a prep
 * list that was finalized (reserved) and then NEITHER completed NOR cancelled
 * before the EVENT itself was finalized stranded its reserved stock forever:
 * `quantityReserved` only ever grew, so `quantityAvailable` (= onHand −
 * reserved) bled down and items looked perpetually unavailable. That is the same
 * leak class the consume/cancel middleware fixed, on the event-finalize path —
 * and it is the `release reserved inventory` leg of IMPLEMENTATION_PLAN P1's
 * `EventFinalized → finance/inventory/followup` item (sibling of the already-
 * shipped ClientInteraction + EventFollowup legs).
 *
 * On `EventFinalized` it loads every PrepList linked to the finalized event and
 * dispatches a governed `InventoryItem.releaseReservation(quantity =
 * scaledQuantity, eventId, userId)` per PrepListItem whose linked inventory item
 * still holds a reservation. The `quantityReserved > 0` precondition makes it
 * naturally safe against the other release paths: an already-completed prep list
 * (consume zeroed its reserved) or an already-cancelled one (cancel released it)
 * has nothing left to release, so this is a clean no-op for them — it only
 * recovers the genuinely-stranded reservations. An event is finalized XOR
 * cancelled, so there is no overlap with the EventCancelled cascade.
 *
 * WHY middleware and not a reaction:
 *  1. It is a 1:N fan-out: one finalized Event → many PrepLists → many
 *     PrepListItems (a reaction resolves only one target).
 *  2. The PrepListItem rows and their `scaledQuantity`/inventory FK are reachable
 *     only via store loads keyed off the event — not from the `EventFinalized`
 *     payload (the engine payload is `{ ...commandInput, result }`; `finalize`
 *     takes only `userId`).
 *
 * `eventId` (required by `releaseReservation`'s guard) is the finalized event's
 * OWN id, read directly from `event.subject?.id`.
 *
 * Every skip path reports through `onDiagnostic` (default console.warn) rather
 * than silently returning.
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

export interface EventFinalizedReleaseReservationDiagnostic {
  detail?: Record<string, unknown>;
  eventId?: string;
  prepListId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface EventFinalizedReleaseReservationMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: EventFinalizedReleaseReservationDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
  /** Optional system actor used in the reservation-release payload. */
  systemUserId?: string;
}

interface EventPayload {
  tenantId?: unknown;
}

interface PrepListLike {
  deletedAt?: unknown;
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

const defaultDiagnostic = (
  diag: EventFinalizedReleaseReservationDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[event-finalized-release:${diag.stage}] ${diag.reason}`, {
    eventId: diag.eventId,
    prepListId: diag.prepListId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createEventFinalizedReleaseReservationMiddleware(
  options: EventFinalizedReleaseReservationMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    systemUserId = "system:event-finalized-release",
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const finalizedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "EventFinalized" &&
          ctx.entityName === "Event" &&
          ctx.command.name === "finalize"
      );

      for (const event of finalizedEvents) {
        const payload = event.payload as EventPayload | undefined;
        const eventId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        if (!eventId) {
          onDiagnostic({
            stage: "resolve",
            reason: "EventFinalized carried no resolvable eventId",
          });
          continue;
        }

        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!tenantId) {
          onDiagnostic({
            stage: "resolve",
            reason: "missing tenantId for finalized event",
            eventId,
          });
          continue;
        }

        const prepListStore = storeProvider("PrepList");
        const prepListItemStore = storeProvider("PrepListItem");
        const inventoryStore = storeProvider("InventoryItem");
        if (!(prepListStore && prepListItemStore && inventoryStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "PrepList, PrepListItem, or InventoryItem store unavailable",
            eventId,
            tenantId,
          });
          continue;
        }

        // 1:N: every prep list linked to the finalized event (skip soft-deleted).
        const prepLists = (await prepListStore.getAll())
          .map((row) => row as PrepListLike)
          .filter(
            (row) =>
              asNonEmptyString(row.tenantId) === tenantId &&
              asNonEmptyString(row.eventId) === eventId &&
              row.deletedAt == null
          );
        if (prepLists.length === 0) {
          // No prep lists for this event → nothing was ever reserved. Common for
          // events that never reached prep; not an error.
          continue;
        }

        const allItems = (await prepListItemStore.getAll()).map(
          (row) => row as PrepListItemLike
        );

        for (const prepList of prepLists) {
          const prepListId = asNonEmptyString(prepList.id);
          if (!prepListId) {
            continue;
          }

          const prepItems = allItems.filter(
            (item) =>
              asNonEmptyString(item.tenantId) === tenantId &&
              asNonEmptyString(item.prepListId) === prepListId
          );

          for (const item of prepItems) {
            const inventoryItemId = asNonEmptyString(item.ingredientId);
            const quantity = asPositiveNumber(item.scaledQuantity);
            if (!inventoryItemId || quantity === undefined) {
              continue;
            }

            // Only release when the inventory item actually holds a reservation.
            // Completed lists (consume zeroed reserved), cancelled lists (already
            // released), and draft lists (never reserved) all skip here — this is
            // a clean no-op for them and recovers only stranded reservations.
            const inventoryItem = (await inventoryStore.getById(
              inventoryItemId
            )) as InventoryItemLike | undefined;
            if (asNumber(inventoryItem?.quantityReserved) <= 0) {
              continue;
            }

            const releaseResult = await dispatchCommand(
              "releaseReservation",
              {
                quantity,
                eventId,
                userId: systemUserId,
              },
              {
                entityName: "InventoryItem",
                instanceId: inventoryItemId,
                correlationId: eventId,
                causationId: event.name,
                idempotencyKey: `event-finalized-release:${tenantId}:${eventId}:${prepListId}:${inventoryItemId}`,
              }
            );

            if (releaseResult.emittedEvents) {
              ctx.emittedEvents.push(...releaseResult.emittedEvents);
            }
            if (!releaseResult.success) {
              onDiagnostic({
                stage: "release",
                reason: `InventoryItem.releaseReservation failed for ${inventoryItemId}: ${releaseResult.error ?? "unknown"}`,
                eventId,
                prepListId,
                tenantId,
                detail: {
                  quantity,
                  ingredientName: asNonEmptyString(item.ingredientName),
                },
              });
            }
          }
        }
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return;
  }
  return value;
}
