/**
 * Ingredient-recalled → InventoryItem soft-delete (quarantine) middleware.
 *
 * Completes the propagation "when an ingredient is flagged recalled, pull its
 * linked inventory stock out of circulation" — the food-safety cascade that ties
 * a supplier recall to the physical inventory the kitchen draws from.
 *
 * THE GAP this closes:
 * `Ingredient.flagRecall(recallReason, userId)` (ingredient-rules.manifest:178)
 * flips the INGREDIENT row (`isRecalled = true`, `isActive = false`) and emits
 * `IngredientRecallFlagged` — but nothing touched the linked `InventoryItem`. So
 * the recalled item's physical stock stayed live and visible in inventory: it kept
 * appearing in "what do we have", par/reorder reads, and item lists, as if it were
 * safe to use or reorder. This middleware pulls that stock from inventory by
 * dispatching the governed `InventoryItem.softDelete` (the only availability-
 * removing command the entity declares — it sets `deletedAt`, after which inventory
 * reads filter the row out).
 *
 * WHY this is middleware and not a reaction (the crux):
 * `flagRecall` is a MUTATE command, so the engine's emitted payload is
 * `{ ...commandInput, result }` where `result` is the last mutate's scalar — NOT
 * the Ingredient instance. The InventoryItem to pull is identified by
 * `Ingredient.inventoryItemId` (ingredient-rules.manifest:19), which is the
 * ingredient's OWN field and NOT a `flagRecall` input param; declared event fields
 * (`IngredientRecallFlagged.*`) are NEVER auto-populated from `self.*`. So a
 * reaction has no way to read the FK — it must LOAD the recalled Ingredient from
 * the store and read `self.inventoryItemId`. (Same mechanism as the contract-signed
 * → event-confirm middleware.)
 *
 * Guard-safe + idempotent: `InventoryItem.softDelete` guards `self.deletedAt ==
 * null`, so an already-deleted item is skipped (rather than producing a swallowed
 * guard failure), and an ingredient with no inventory link is a clean no-op. Every
 * skip and failure reports through `onDiagnostic` — never silent.
 *
 * KNOWN LIMITATIONS (documented, not silent):
 *  - There is NO governed `InventoryItem.restore`/undelete command, so the
 *    symmetric `clearRecall → restore` leg cannot be wired yet. This is acceptable
 *    (and arguably correct) for a food-safety recall: hard-pulling contaminated
 *    stock is the conservative action, and re-stocking after a cleared recall is a
 *    deliberate manual act, not something to auto-restore. Deferred (needs IR).
 *  - `softDelete` removes the item from inventory READS (which filter `deletedAt`)
 *    but the `consume`/`reserve`/`waste` commands do not yet guard `deletedAt`, so
 *    a direct command could still mutate a pulled item. Hardening those guards is a
 *    separate IR change tracked in the plan; the realistic usage path is UI/route
 *    reads, which already hide the pulled item.
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

export interface IngredientRecalledQuarantineDiagnostic {
  detail?: Record<string, unknown>;
  ingredientId?: string;
  inventoryItemId?: string;
  reason: string;
  stage: string;
  tenantId?: string;
}

export interface IngredientRecalledQuarantineInventoryMiddlewareOptions {
  dispatchCommand: DispatchCommand;
  onDiagnostic?: (diag: IngredientRecalledQuarantineDiagnostic) => void;
  storeProvider: (entityName: string) => Store | undefined;
}

interface IngredientLike {
  inventoryItemId?: unknown;
  tenantId?: unknown;
}

interface InventoryItemLike {
  deletedAt?: unknown;
}

const defaultDiagnostic = (
  diag: IngredientRecalledQuarantineDiagnostic
): void => {
  // eslint-disable-next-line no-console
  console.warn(`[ingredient-recall:${diag.stage}] ${diag.reason}`, {
    ingredientId: diag.ingredientId,
    inventoryItemId: diag.inventoryItemId,
    tenantId: diag.tenantId,
    ...diag.detail,
  });
};

export function createIngredientRecalledQuarantineInventoryMiddleware(
  options: IngredientRecalledQuarantineInventoryMiddlewareOptions
): Middleware {
  const {
    storeProvider,
    dispatchCommand,
    onDiagnostic = defaultDiagnostic,
  } = options;

  return {
    hooks: ["after-emit"],

    async handler(ctx: MiddlewareContext): Promise<MiddlewareResult> {
      const recallEvents = ctx.emittedEvents.filter(
        (event) =>
          event.name === "IngredientRecallFlagged" &&
          ctx.entityName === "Ingredient" &&
          ctx.command.name === "flagRecall"
      );

      for (const event of recallEvents) {
        const payload = event.payload as { tenantId?: unknown } | undefined;
        const ingredientId =
          asNonEmptyString(event.subject?.id) ??
          asNonEmptyString(ctx.instanceId);
        const tenantId =
          asNonEmptyString(payload?.tenantId) ??
          asNonEmptyString(
            (ctx.runtimeContext.user as { tenantId?: unknown } | undefined)
              ?.tenantId
          );
        if (!(ingredientId && tenantId)) {
          onDiagnostic({
            stage: "resolve",
            reason: `IngredientRecallFlagged missing ${ingredientId ? "tenantId" : "ingredientId"}`,
            ingredientId,
            tenantId,
          });
          continue;
        }

        const ingredientStore = storeProvider("Ingredient");
        const inventoryStore = storeProvider("InventoryItem");
        if (!(ingredientStore && inventoryStore)) {
          onDiagnostic({
            stage: "stores",
            reason:
              "Ingredient or InventoryItem store unavailable — stock not pulled",
            ingredientId,
            tenantId,
            detail: {
              ingredient: !!ingredientStore,
              inventory: !!inventoryStore,
            },
          });
          continue;
        }

        const ingredient = (await ingredientStore.getById(ingredientId)) as
          | IngredientLike
          | undefined;
        if (!ingredient) {
          onDiagnostic({
            stage: "load",
            reason:
              "recalled ingredient not found in store — cannot resolve inventory item",
            ingredientId,
            tenantId,
          });
          continue;
        }

        const inventoryItemId = asNonEmptyString(ingredient.inventoryItemId);
        if (!inventoryItemId) {
          // Not every ingredient is linked to an inventory item (the entity even
          // carries a `warnNoInventoryItem` warning). Nothing to pull — clean no-op.
          onDiagnostic({
            stage: "no-link",
            reason:
              "recalled ingredient has no linked inventory item — nothing to pull",
            ingredientId,
            tenantId,
          });
          continue;
        }

        // Guard-safe + idempotent: InventoryItem.softDelete requires
        // `self.deletedAt == null`. If the item is already pulled (e.g. a
        // re-delivered event, or a manual delete), dispatching would only produce a
        // swallowed guard failure — skip cleanly instead.
        const inventoryRow = (await inventoryStore.getById(inventoryItemId)) as
          | InventoryItemLike
          | undefined;
        if (!inventoryRow) {
          onDiagnostic({
            stage: "inventory-load",
            reason:
              "linked inventory item not found in store — cannot pull stock",
            ingredientId,
            inventoryItemId,
            tenantId,
          });
          continue;
        }
        if (inventoryRow.deletedAt != null) {
          onDiagnostic({
            stage: "already",
            reason: "inventory item already deleted — skip soft-delete",
            ingredientId,
            inventoryItemId,
            tenantId,
          });
          continue;
        }

        const result = await dispatchCommand(
          "softDelete",
          {
            // softDelete takes NO params; the target id is supplied BOTH in the
            // body (`id`) AND as `instanceId` so the write-back persists to the
            // right row regardless of which the engine keys persistence on (the
            // established mutate-dispatch idiom — see contract-signed-event-confirm).
            id: inventoryItemId,
            tenantId,
            userId: "system",
          },
          {
            entityName: "InventoryItem",
            instanceId: inventoryItemId,
            correlationId:
              asNonEmptyString(
                (ctx as { correlationId?: unknown }).correlationId
              ) ?? ingredientId,
            causationId: "IngredientRecallFlagged",
            idempotencyKey: `ingredient-recall:${tenantId}:${ingredientId}:${inventoryItemId}:softDelete`,
          }
        );
        if (result.emittedEvents) {
          ctx.emittedEvents.push(...result.emittedEvents);
        }
        if (!result.success) {
          onDiagnostic({
            stage: "soft-delete",
            reason: `InventoryItem.softDelete failed: ${result.error ?? "unknown"}`,
            ingredientId,
            inventoryItemId,
            tenantId,
          });
          continue;
        }

        onDiagnostic({
          stage: "done",
          reason: "linked inventory item pulled from stock on recall",
          ingredientId,
          inventoryItemId,
          tenantId,
        });
      }

      return {};
    },
  };
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
