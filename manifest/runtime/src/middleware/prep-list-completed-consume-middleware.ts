/**
 * Prep-list completion → inventory consumption middleware.
 *
 * Runs inside the Manifest runtime lifecycle after `PrepListCompleted` is
 * emitted (PrepList.markCompleted). Its sibling `prep-inventory-demand`
 * middleware RESERVES ingredient quantities on `PrepListFinalized`
 * (`InventoryItem.reserve`, which bumps `quantityReserved`), but nothing ever
 * converted those reservations into actual consumption — so a finalized prep
 * list permanently stranded its reserved quantities (they never decremented
 * `quantityOnHand`, and `quantityReserved` only grew). This middleware closes
 * that leak: when the prep list is marked completed, it dispatches a governed
 * `InventoryItem.consume` per PrepListItem. `consume` decrements BOTH
 * `quantityOnHand` (physical drawdown) AND `quantityReserved` (reservation
 * release) in one command (inventory-rules.manifest: `consume` mutates), so a
 * single dispatch reverses the reserve and records the real usage — no
 * separate `releaseReservation` is needed.
 *
 * Every skip path reports through `onDiagnostic` (default: console.warn)
 * instead of silently returning, so "0 of 12 ingredients consumable" or
 * "consume blocked by insufficient stock" is visible in logs and tests.
 */

import type {
  CommandResult,
  Middleware,
  MiddlewareContext,
  MiddlewareResult,
  Store,
} from "@angriff36/manifest";
import { resolveIngredientInventoryIds } from "./ingredient-inventory-resolution";

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

export interface PrepConsumeDiagnostic {
  detail?: Record<string, unknown>;
  prepListId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface PrepListCompletedConsumeMiddlewareOptions {
  /** Dispatches a governed Manifest command, normally engine.runCommand. */
  dispatchCommand: DispatchCommand;
  /** Structured skip/outcome reporting. Default logs via console.warn. */
  onDiagnostic?: (diag: PrepConsumeDiagnostic) => void;
  /** Manifest store provider already bound to the runtime. */
  storeProvider: (entityName: string) => Store | undefined;
  /** Optional system actor used in inventory consumption payloads. */
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
  id?: unknown;
  tenantId?: unknown;
}

const defaultDiagnostic = (diag: PrepConsumeDiagnostic): void => {
  // eslint-disable-next-line no-console
  console.warn(`[prep-consume:${diag.stage}] ${diag.reason}`, {
    prepListId: diag.prepListId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

/**
 * Create middleware that consumes reserved inventory when a prep list is
 * marked completed. Store/provider based so tests and production use the same
 * Manifest runtime boundary.
 */
export function createPrepListCompletedConsumeMiddleware(
  options: PrepListCompletedConsumeMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    systemUserId = "system:prep-consume",
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const completedEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "PrepListCompleted" &&
          ctx.entityName === "PrepList" &&
          ctx.command.name === "markCompleted"
      );

      for (const event of completedEvents) {
        const payload = event.payload as EventPayload;
        const prepListId =
          asNonEmptyString(payload.prepListId) ??
          asNonEmptyString(ctx.instanceId) ??
          asNonEmptyString(event.subject?.id);
        if (!prepListId) {
          onDiagnostic({
            stage: "resolve",
            reason: "PrepListCompleted carried no resolvable prepListId",
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
            reason: "missing tenantId for completed prep list",
            prepListId,
          });
          continue;
        }

        const prepListItemStore = storeProvider("PrepListItem");
        if (!prepListItemStore) {
          onDiagnostic({
            stage: "stores",
            reason: "PrepListItem store unavailable",
            prepListId,
            tenantId,
          });
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
        if (sourceItems.length === 0) {
          onDiagnostic({
            stage: "consume",
            reason:
              "completed prep list has no PrepListItem rows — nothing to consume",
            prepListId,
            tenantId,
          });
          continue;
        }

        // PrepListItem.ingredientId is a KITCHEN Ingredient id; resolve to the
        // linked InventoryItem (Ingredient.inventoryItemId) before consuming.
        const inventoryIdByIngredient = await resolveIngredientInventoryIds(
          storeProvider,
          tenantId,
          sourceItems
        );

        for (const item of sourceItems) {
          const ingredientId = asNonEmptyString(item.ingredientId);
          const quantity = asPositiveNumber(item.scaledQuantity);
          if (!ingredientId || quantity === undefined) {
            onDiagnostic({
              stage: "consume",
              reason:
                "prep item skipped: missing ingredientId or non-positive scaledQuantity",
              prepListId,
              tenantId,
              detail: {
                prepItemId: asNonEmptyString(item.id),
                ingredientName: asNonEmptyString(item.ingredientName),
              },
            });
            continue;
          }
          const inventoryItemId = inventoryIdByIngredient.get(ingredientId);
          if (!inventoryItemId) {
            // Ingredient not linked to inventory — finalize never reserved it,
            // so there is nothing to consume either. Symmetric with reserve.
            continue;
          }

          const consumeResult = await dispatchCommand(
            "consume",
            {
              quantity,
              // lotId carries the prep list back-reference for the audit trail.
              lotId: prepListId,
              userId: systemUserId,
            },
            {
              entityName: "InventoryItem",
              instanceId: inventoryItemId,
              correlationId:
                asNonEmptyString(
                  (ctx as { correlationId?: unknown }).correlationId
                ) ??
                asNonEmptyString(event.subject?.id) ??
                prepListId,
              causationId: event.name,
              idempotencyKey: `prep-consume:${tenantId}:${prepListId}:consume:${inventoryItemId}`,
            }
          );

          if (consumeResult.emittedEvents) {
            ctx.emittedEvents.push(...consumeResult.emittedEvents);
          }
          if (!consumeResult.success) {
            // Insufficient on-hand stock (blockInsufficientStock) or a missing
            // inventory item — surfaced, not fatal. Other items still consume.
            onDiagnostic({
              stage: "consume",
              reason: `InventoryItem.consume failed for ${inventoryItemId}: ${consumeResult.error ?? "unknown"}`,
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

function asPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return;
  }
  return value;
}
