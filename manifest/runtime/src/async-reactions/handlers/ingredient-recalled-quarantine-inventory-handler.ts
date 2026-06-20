/**
 * Async reaction handler for ingredient recall → inventory quarantine.
 *
 * Deferred counterpart of {@link createIngredientRecalledQuarantineInventoryMiddleware}.
 * When `IngredientRecallFlagged` fires (from `Ingredient.flagRecall`), the
 * middleware (with async enabled) ENQUEUES a job instead of dispatching
 * synchronously; this handler runs LATER in the worker, loads the recalled
 * Ingredient, reads its `inventoryItemId`, and dispatches the governed
 * `InventoryItem.softDelete` to pull the linked stock out of circulation.
 *
 * The ingredient's `inventoryItemId` is the ingredient's OWN field (not a
 * `flagRecall` param), so it is not carried in the event payload — the handler
 * must load the Ingredient from the store to resolve the link, exactly as the
 * synchronous middleware does.
 *
 * Guard-safe + idempotent: `InventoryItem.softDelete` guards `self.deletedAt ==
 * null`, so an already-deleted item is skipped cleanly. An ingredient with no
 * inventory link is a clean no-op. The dispatch carries a per-(tenant,
 * ingredient) idempotency key so a re-delivered job does not produce a
 * swallowed guard failure.
 */

import type {
  AsyncReactionHandler,
  AsyncReactionHandlerContext,
} from "..";

/** Reaction name registered with {@link asyncReactionRegistry}. */
export const INGREDIENT_RECALLED_QUARANTINE_INVENTORY_REACTION =
  "ingredientRecalledQuarantineInventory";

interface IngredientLike {
  inventoryItemId?: unknown;
}

interface InventoryItemLike {
  deletedAt?: unknown;
}

interface ManifestStore {
  getById(id: string): Promise<unknown | undefined>;
}

/**
 * Handler implementation. Exposed for direct unit testing (the registry
 * registers a thin wrapper around it).
 */
export const ingredientRecalledQuarantineInventoryHandler: AsyncReactionHandler =
  async (ctx: AsyncReactionHandlerContext): Promise<void> => {
    const { job, dispatchCommand, storeProvider, log } = ctx;
    const ingredientId = job.triggeringEvent.subjectId;
    const tenantId = job.tenantId;

    if (!ingredientId) {
      log.warn?.(
        "ingredientRecallQuarantine: missing subjectId — skipping",
        { jobId: job.id }
      );
      return;
    }

    const ingredientStore = storeProvider("Ingredient") as
      | ManifestStore
      | undefined;
    const inventoryStore = storeProvider("InventoryItem") as
      | ManifestStore
      | undefined;
    if (!(ingredientStore && inventoryStore)) {
      throw new Error("Ingredient/InventoryItem store unavailable");
    }

    const ingredient = (await ingredientStore.getById(ingredientId)) as
      | IngredientLike
      | undefined;
    if (!ingredient) {
      log.warn?.(
        "ingredientRecallQuarantine: recalled Ingredient not found in store — skipping",
        { jobId: job.id, ingredientId }
      );
      return;
    }

    const inventoryItemId = asNonEmptyString(ingredient.inventoryItemId);
    if (!inventoryItemId) {
      log.info?.(
        "ingredientRecallQuarantine: Ingredient has no linked inventory item — nothing to pull",
        { jobId: job.id, ingredientId }
      );
      return;
    }

    const inventoryRow = (await inventoryStore.getById(inventoryItemId)) as
      | InventoryItemLike
      | undefined;
    if (!inventoryRow) {
      log.warn?.(
        "ingredientRecallQuarantine: linked InventoryItem not found in store — cannot pull stock",
        { jobId: job.id, ingredientId, inventoryItemId }
      );
      return;
    }
    if (inventoryRow.deletedAt != null) {
      log.info?.(
        "ingredientRecallQuarantine: InventoryItem already deleted — skip soft-delete",
        { jobId: job.id, ingredientId, inventoryItemId }
      );
      return;
    }

    const result = await dispatchCommand(
      "softDelete",
      {
        id: inventoryItemId,
        tenantId,
        userId: "system",
      },
      {
        entityName: "InventoryItem",
        instanceId: inventoryItemId,
        correlationId: ingredientId,
        causationId: job.triggeringEvent.name,
        idempotencyKey:
          job.idempotencyKey ??
          `ingredient-recalled:${tenantId}:${ingredientId}`,
      }
    );

    if (!result.success) {
      throw new Error(
        `InventoryItem.softDelete failed for ${inventoryItemId}: ${result.error ?? "unknown"}`
      );
    }
  };

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
