/**
 * PrepListCancelled → inventory reservation-release middleware.
 *
 * The symmetric counterpart of `prep-list-completed-consume`. The
 * `prep-inventory-demand` middleware RESERVES ingredient quantities when a prep
 * list is FINALIZED (`InventoryItem.reserve`, bumping `quantityReserved`).
 * Completion releases+consumes them (the consume middleware). But CANCELLATION
 * had no consumer — a finalized prep list that was later cancelled stranded its
 * reserved stock forever: `quantityReserved` only ever grew, so
 * `quantityAvailable` (= onHand − reserved) bled down and items looked
 * perpetually unavailable. That is the same leak class the consume middleware
 * fixed, on the cancel path.
 *
 * This middleware closes it: on `PrepListCancelled`, it dispatches a governed
 * `InventoryItem.releaseReservation(quantity = scaledQuantity, eventId, userId)`
 * per PrepListItem whose linked inventory item still holds a reservation. It
 * fixes the leak for EVERY prep-cancel path (standalone or event-driven), and it
 * is what releases the inventory held by an event's prep lists when
 * `EventCancelled` cascades `PrepList.cancel` (the dispatched cancel re-enters
 * runCommand, emits `PrepListCancelled`, and this middleware fires).
 *
 * WHY middleware and not a reaction: it is a 1:N fan-out over PrepListItem rows
 * (a reaction resolves only one target), AND `releaseReservation` needs the
 * prep list's `eventId` — a PrepList field, not a `cancel` param, so it is not
 * on the `PrepListCancelled` payload and only a store load can read it.
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
import type { AsyncDispatch } from "../async-reactions";
import {
  captureTriggeringEvents,
  PREP_LIST_CANCELLED_RELEASE_RESERVATION_REACTION,
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

export interface PrepReleaseReservationDiagnostic {
  detail?: Record<string, unknown>;
  prepListId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface PrepListCancelledReleaseReservationMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  asyncEnqueue?: AsyncDispatch;
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: PrepReleaseReservationDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
  /** Optional system actor used in the reservation-release payload. */
  systemUserId?: string;
}

interface EventPayload {
  prepListId?: unknown;
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

interface PrepListLike {
  eventId?: unknown;
  id?: unknown;
  tenantId?: unknown;
}

interface InventoryItemLike {
  quantityReserved?: unknown;
}

const defaultDiagnostic = (diag: PrepReleaseReservationDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[prep-release:${diag.stage}] ${diag.reason}`, {
    prepListId: diag.prepListId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createPrepListCancelledReleaseReservationMiddleware(
  options: PrepListCancelledReleaseReservationMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    systemUserId = "system:prep-release",
    onDiagnostic = defaultDiagnostic,
    asyncEnqueue,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const cancelledEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PrepListCancelled" &&
          ctx.entityName === "PrepList" &&
          ctx.command.name === "cancel"
      );

      if (asyncEnqueue && cancelledEvents.length > 0) {
        await captureTriggeringEvents({
          asyncEnqueue,
          ctx,
          events: cancelledEvents,
          reactionName: PREP_LIST_CANCELLED_RELEASE_RESERVATION_REACTION,
        });
        return {};
      }

      for (const event of cancelledEvents) {
        const payload = event.payload as EventPayload;
        const prepListId =
          asNonEmptyString(payload.prepListId) ??
          asNonEmptyString(ctx.instanceId) ??
          asNonEmptyString(event.subject?.id);
        if (!prepListId) {
          onDiagnostic({
            stage: "resolve",
            reason: "PrepListCancelled carried no resolvable prepListId",
          });
          continue;
        }

        const prepListStore = storeProvider("PrepList");
        const prepList = prepListStore
          ? ((await prepListStore.getById(prepListId)) as
              | PrepListLike
              | undefined)
          : undefined;
        const tenantId =
          asNonEmptyString(payload.tenantId) ??
          asNonEmptyString(prepList?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!tenantId) {
          onDiagnostic({
            stage: "resolve",
            reason: "missing tenantId for cancelled prep list",
            prepListId,
          });
          continue;
        }

        // releaseReservation requires a non-empty eventId (guard); it lives on the
        // PrepList, not on the cancel payload. No eventId → nothing to release
        // against (and the command would be guard-rejected anyway).
        const eventId = asNonEmptyString(prepList?.eventId);
        if (!eventId) {
          onDiagnostic({
            stage: "resolve",
            reason:
              "cancelled prep list has no eventId — cannot release reservations",
            prepListId,
            tenantId,
          });
          continue;
        }

        const prepListItemStore = storeProvider("PrepListItem");
        const inventoryStore = storeProvider("InventoryItem");
        if (!(prepListItemStore && inventoryStore)) {
          onDiagnostic({
            stage: "stores",
            reason: "PrepListItem or InventoryItem store unavailable",
            prepListId,
            tenantId,
          });
          continue;
        }

        const prepItems = (await prepListItemStore.getAll())
          .map((item) => item as PrepListItemLike)
          .filter(
            (item) =>
              asNonEmptyString(item.tenantId) === tenantId &&
              asNonEmptyString(item.prepListId) === prepListId
          );
        if (prepItems.length === 0) {
          onDiagnostic({
            stage: "release",
            reason:
              "cancelled prep list has no PrepListItem rows — nothing to release",
            prepListId,
            tenantId,
          });
          continue;
        }

        for (const item of prepItems) {
          const inventoryItemId = asNonEmptyString(item.ingredientId);
          const quantity = asPositiveNumber(item.scaledQuantity);
          if (!inventoryItemId || quantity === undefined) {
            continue;
          }

          // Only release when the inventory item actually holds a reservation.
          // Draft prep lists (never finalized) never reserved, so skipping here
          // avoids spurious InventoryReservationReleased events + no-op dispatches.
          const inventoryItem = (await inventoryStore.getById(
            inventoryItemId
          )) as InventoryItemLike | undefined;
          const reserved = asNumber(inventoryItem?.quantityReserved);
          if (reserved <= 0) {
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
              idempotencyKey: `prep-release:${tenantId}:${prepListId}:release:${inventoryItemId}`,
            }
          );

          if (releaseResult.emittedEvents) {
            ctx.emittedEvents.push(...releaseResult.emittedEvents);
          }
          if (!releaseResult.success) {
            onDiagnostic({
              stage: "release",
              reason: `InventoryItem.releaseReservation failed for ${inventoryItemId}: ${releaseResult.error ?? "unknown"}`,
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
