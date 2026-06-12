import type { Store } from "@angriff36/manifest";

/**
 * Create a PostgresStore provider for persistent entity storage.
 *
 * @param databaseUrl - PostgreSQL connection string
 * @param tenantId - Tenant ID for table namespacing (optional)
 * @returns A store provider function for RuntimeEngine
 */
export function createPostgresStoreProvider(
  databaseUrl: string,
  tenantId?: string
): (entityName: string) => Store | undefined {
  const tenantSuffix = tenantId ? `_${tenantId.replace(/-/g, "_")}` : "";

  return (entityName: string) => {
    // Map entity names to table names
    const tableNameMap: Record<string, string> = {
      PrepTask: `kitchen_prep_tasks${tenantSuffix}`,
      Station: `kitchen_stations${tenantSuffix}`,
      InventoryItem: `kitchen_inventory_items${tenantSuffix}`,
      Recipe: `kitchen_recipes${tenantSuffix}`,
      RecipeVersion: `kitchen_recipe_versions${tenantSuffix}`,
      Ingredient: `kitchen_ingredients${tenantSuffix}`,
      RecipeIngredient: `kitchen_recipe_ingredients${tenantSuffix}`,
      Dish: `kitchen_dishes${tenantSuffix}`,
      Menu: `kitchen_menus${tenantSuffix}`,
      MenuDish: `kitchen_menu_dishes${tenantSuffix}`,
      PrepList: `kitchen_prep_lists${tenantSuffix}`,
      PrepListItem: `kitchen_prep_list_items${tenantSuffix}`,
    };

    const tableName = tableNameMap[entityName];
    if (!tableName) {
      return; // Use default (memory) store for unknown entities
    }

    // Dynamically import PostgresStore only when databaseUrl is provided
    // This avoids requiring the pg package in environments that don't need it
    try {
      const {
        PostgresStore: PGStore,
      } = require(/* turbopackIgnore: true */ "@angriff36/manifest/stores");
      return new PGStore({
        connectionString: databaseUrl,
        tableName,
      }) as Store;
    } catch {
      return; // Fall back to memory store if PostgresStore is unavailable
    }
  };
}
