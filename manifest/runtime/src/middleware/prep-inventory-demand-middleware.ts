/**
 * Prep-list to inventory-demand middleware.
 *
 * Runs inside the Manifest runtime lifecycle after `PrepListFinalized` is
 * emitted. It derives ingredient demand from persisted PrepListItem rows and
 * dispatches governed InventoryItem.reserve commands.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";

interface RunCommandOptions {
  entityName?: string;
  instanceId?: string;
  correlationId?: string;
  causationId?: string;
  idempotencyKey?: string;
}

type DispatchCommand = (
  commandName: string,
  input: Record<string, unknown>,
  options: RunCommandOptions
) => Promise<CommandResult>;

export interface PrepInventoryDemandMiddlewareOptions {
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Optional system actor used in inventory reservation payloads. */
  systemUserId?: string;
}

interface EventPayload {
  prepListId?: unknown;
  tenantId?: unknown;
  eventId?: unknown;
}

interface PrepListItemLike {
  id?: unknown;
  tenantId?: unknown;
  prepListId?: unknown;
  ingredientId?: unknown;
  scaledQuantity?: unknown;
}

interface PrepListLike {
  id?: unknown;
  tenantId?: unknown;
  eventId?: unknown;
}

/**
 * Create middleware that derives inventory reservations when a prep list is
 * finalized. This is intentionally store/provider based so tests and
 * production use the same Manifest runtime boundary.
 */
export function createPrepInventoryDemandMiddleware(
  options: PrepInventoryDemandMiddlewareOptions
): Middleware {
  const { storeProvider, dispatchCommand, systemUserId = "system:prep-demand" } =
    options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const finalizedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PrepListFinalized" &&
          ctx.entityName === "PrepList" &&
          ctx.command.name === "finalize"
      );

      for (const event of finalizedEvents) {
        const payload = event.payload as EventPayload;
        const prepListId =
          asNonEmptyString(payload.prepListId) ??
          asNonEmptyString(ctx.instanceId) ??
          asNonEmptyString(event.subject?.id);
        if (!prepListId) {
          continue;
        }

        const prepListStore = storeProvider("PrepList");
        if (!prepListStore) {
          continue;
        }
        const prepList = (await prepListStore.getById(prepListId)) as
          | PrepListLike
          | undefined;
        const tenantId =
          asNonEmptyString(payload.tenantId) ??
          asNonEmptyString(prepList?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        const eventId =
          asNonEmptyString(payload.eventId) ?? asNonEmptyString(prepList?.eventId);

        if (!prepListId || !tenantId || !eventId) {
          continue;
        }

        const prepListItemStore = storeProvider("PrepListItem");
        if (!prepListItemStore) {
          continue;
        }
        const prepItems = await prepListItemStore.getAll();
        const sourceItems = prepItems
          .map((item) => item as PrepListItemLike)
          .filter(
            (item) =>
              asNonEmptyString(item.tenantId) === tenantId &&
              asNonEmptyString(item.prepListId) === prepListId
          );

        for (const item of sourceItems) {
          const inventoryItemId = asNonEmptyString(item.ingredientId);
          const quantity = asPositiveNumber(item.scaledQuantity);
          if (!inventoryItemId || quantity === undefined) {
            continue;
          }

          const reserveResult = await dispatchCommand(
            "reserve",
            {
              quantity,
              eventId,
              userId: systemUserId,
            },
            {
              entityName: "InventoryItem",
              instanceId: inventoryItemId,
              correlationId:
                asNonEmptyString((ctx as { correlationId?: unknown }).correlationId) ??
                asNonEmptyString(event.subject?.id) ??
                prepListId,
              causationId: event.name,
            }
          );

          if (reserveResult.emittedEvents) {
            ctx.emittedEvents.push(...reserveResult.emittedEvents);
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

function asPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}
