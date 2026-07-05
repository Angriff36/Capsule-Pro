/**
 * Shared PrepListItem.ingredientId → InventoryItem.id resolution.
 *
 * PrepListItem.ingredientId references tenant_kitchen.ingredients (the
 * kitchen Ingredient catalog), NOT tenant_inventory.inventory_items. The
 * inventory linkage is Ingredient.inventoryItemId, set explicitly via the
 * governed Ingredient.linkInventoryItem command (nullable — an unlinked
 * ingredient is "not orderable yet").
 *
 * Every prep-lifecycle middleware that touches stock (reserve on finalize,
 * consume on complete, release on cancel) must resolve through this mapping
 * or the whole flow silently misses: reservations land nowhere, demand goes
 * "unmapped", consumption dispatches against nonexistent inventory instances.
 *
 * Back-compat: ids that directly hit an InventoryItem row map to themselves
 * (older prep data and some runtime tests seed inventory ids into
 * ingredientId).
 */

import type { Store } from "@angriff36/manifest";

interface IngredientLike {
  inventoryItemId?: unknown;
  tenantId?: unknown;
}

interface TenantScopedLike {
  tenantId?: unknown;
}

interface HasIngredientId {
  ingredientId?: unknown;
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Map each distinct `ingredientId` among `items` to the tenant InventoryItem
 * it refers to. Ids with no resolvable inventory item are absent from the map.
 */
export async function resolveIngredientInventoryIds(
  storeProvider: (entityName: string) => Store | undefined,
  tenantId: string,
  items: readonly HasIngredientId[]
): Promise<Map<string, string>> {
  const mapping = new Map<string, string>();
  const ingredientStore = storeProvider("Ingredient");
  const inventoryStore = storeProvider("InventoryItem");

  const distinctIds = new Set(
    items
      .map((item) => asNonEmptyString(item.ingredientId))
      .filter((id): id is string => id !== undefined)
  );

  for (const id of distinctIds) {
    const inventoryItemId = await resolveOneInventoryId(
      id,
      tenantId,
      ingredientStore,
      inventoryStore
    );
    if (inventoryItemId) {
      mapping.set(id, inventoryItemId);
    }
  }

  return mapping;
}

async function resolveOneInventoryId(
  id: string,
  tenantId: string,
  ingredientStore: Store | undefined,
  inventoryStore: Store | undefined
): Promise<string | undefined> {
  if (ingredientStore) {
    const ingredient = (await ingredientStore.getById(id)) as
      | IngredientLike
      | undefined;
    if (ingredient && asNonEmptyString(ingredient.tenantId) === tenantId) {
      // A kitchen Ingredient row wins even when unlinked — its (empty)
      // inventoryItemId means "not orderable yet", not "fall through".
      return asNonEmptyString(ingredient.inventoryItemId);
    }
  }
  if (inventoryStore) {
    const direct = (await inventoryStore.getById(id)) as
      | TenantScopedLike
      | undefined;
    if (direct && asNonEmptyString(direct.tenantId) === tenantId) {
      return id;
    }
  }
  return undefined;
}
