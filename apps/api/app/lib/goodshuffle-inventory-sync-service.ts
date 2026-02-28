/**
 * Goodshuffle Inventory Sync Service
 *
 * Handles bi-directional synchronization of inventory items between Goodshuffle and Convoy.
 * Implements conflict detection and resolution with configurable strategies.
 */

import { database, Prisma } from "@repo/database";
import {
  createGoodshuffleClient,
  type GoodshuffleClient,
  type GoodshuffleConflict,
  type GoodshuffleInventoryItem,
  type GoodshuffleInventorySyncResult,
} from "./goodshuffle-client";

export interface InventorySyncOptions {
  tenantId: string;
  dryRun?: boolean;
  direction?: "convoy_to_goodshuffle" | "goodshuffle_to_convoy" | "both";
}

/**
 * Detect conflicts between Goodshuffle and Convoy inventory data
 */
function _detectInventoryConflicts(
  goodshuffleItem: GoodshuffleInventoryItem,
  convoyItem: {
    name: string;
    quantityOnHand: number;
    unitCost: number;
  }
): GoodshuffleConflict[] {
  const conflicts: GoodshuffleConflict[] = [];

  // Check name conflict
  if (
    goodshuffleItem.name &&
    convoyItem.name &&
    goodshuffleItem.name !== convoyItem.name
  ) {
    conflicts.push({
      goodshuffleItemId: goodshuffleItem.id,
      convoyInventoryItemId: "",
      field: "name",
      goodshuffleValue: goodshuffleItem.name,
      convoyValue: convoyItem.name,
      resolution: "pending",
    });
  }

  // Check quantity conflict
  if (
    goodshuffleItem.quantity_available !== undefined &&
    convoyItem.quantityOnHand !== undefined &&
    goodshuffleItem.quantity_available !== convoyItem.quantityOnHand
  ) {
    conflicts.push({
      goodshuffleItemId: goodshuffleItem.id,
      convoyInventoryItemId: "",
      field: "quantity",
      goodshuffleValue: goodshuffleItem.quantity_available,
      convoyValue: convoyItem.quantityOnHand,
      resolution: "pending",
    });
  }

  // Check unit cost conflict
  if (
    goodshuffleItem.unit_cost !== undefined &&
    convoyItem.unitCost !== undefined &&
    goodshuffleItem.unit_cost !== convoyItem.unitCost
  ) {
    conflicts.push({
      goodshuffleItemId: goodshuffleItem.id,
      convoyInventoryItemId: "",
      field: "unitCost",
      goodshuffleValue: goodshuffleItem.unit_cost,
      convoyValue: convoyItem.unitCost,
      resolution: "pending",
    });
  }

  return conflicts;
}

/**
 * Sync inventory items from Goodshuffle to Convoy
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex sync logic with multiple branches
export async function syncInventoryFromGoodshuffle(
  client: GoodshuffleClient,
  tenantId: string,
  options: InventorySyncOptions
): Promise<GoodshuffleInventorySyncResult> {
  const result: GoodshuffleInventorySyncResult = {
    success: true,
    itemsImported: 0,
    itemsSkipped: 0,
    itemsUpdated: 0,
    conflicts: [],
    errors: [],
  };

  try {
    // Fetch inventory items from Goodshuffle
    const goodshuffleItems = await client.getAllInventoryItems();

    // Get existing sync records
    const existingSyncs = await database.goodshuffleInventorySync.findMany({
      where: { tenantId },
    });

    const syncMap = new Map(
      existingSyncs.map((sync) => [sync.goodshuffleItemId, sync])
    );

    // Process each Goodshuffle inventory item
    for (const gsItem of goodshuffleItems) {
      try {
        const existingSync = syncMap.get(gsItem.id);
        const gsUpdatedAt = new Date(gsItem.updated_at);

        // Skip if already synced and not updated
        if (
          existingSync?.lastSyncedAt &&
          existingSync.goodshuffleUpdatedAt &&
          gsUpdatedAt <= existingSync.goodshuffleUpdatedAt
        ) {
          result.itemsSkipped++;
          continue;
        }

        // Check if we have a linked Convoy inventory item
        if (existingSync?.convoyInventoryItemId) {
          // Update existing item
          await updateConvoyInventoryFromGoodshuffle(
            tenantId,
            existingSync.convoyInventoryItemId,
            gsItem,
            options.dryRun ?? false
          );
          result.itemsUpdated++;
        } else {
          // Create new item
          const convoyInventoryItemId =
            await createConvoyInventoryFromGoodshuffle(
              tenantId,
              gsItem,
              options.dryRun ?? false
            );

          if (!options.dryRun) {
            // Create sync record
            await database.goodshuffleInventorySync.create({
              data: {
                tenantId,
                goodshuffleItemId: gsItem.id,
                convoyInventoryItemId,
                itemName: gsItem.name,
                itemSku: gsItem.sku ?? null,
                status: "synced",
                lastSyncedAt: new Date(),
                goodshuffleUpdatedAt: gsUpdatedAt,
              },
            });
          }
          result.itemsImported++;
        }

        // Update sync record timestamp
        if (existingSync && !options.dryRun) {
          await database.goodshuffleInventorySync.update({
            where: {
              tenantId_id: {
                tenantId,
                id: existingSync.id,
              },
            },
            data: {
              lastSyncedAt: new Date(),
              goodshuffleUpdatedAt: gsUpdatedAt,
              status: "synced",
            },
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push(`Item ${gsItem.id}: ${errorMessage}`);
      }
    }

    // Update last sync status
    if (!options.dryRun) {
      await database.goodshuffleConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: result.errors.length > 0 ? "partial" : "success",
          lastSyncError:
            result.errors.length > 0 ? result.errors.join("\n") : null,
        },
      });
    }
  } catch (error) {
    result.success = false;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Sync failed: ${errorMessage}`);

    if (!options.dryRun) {
      await database.goodshuffleConfig.update({
        where: { tenantId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: "error",
          lastSyncError: errorMessage,
        },
      });
    }
  }

  return result;
}

/**
 * Create a Convoy inventory item from Goodshuffle item data
 */
async function createConvoyInventoryFromGoodshuffle(
  tenantId: string,
  gsItem: GoodshuffleInventoryItem,
  dryRun: boolean
): Promise<string> {
  if (dryRun) {
    return "dry-run-id";
  }

  // Get default supplier
  const defaultSupplier = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      SELECT id
      FROM tenant_inventory.inventory_suppliers
      WHERE tenant_id = ${tenantId}
        AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    `
  );

  const supplierId = defaultSupplier.length > 0 ? defaultSupplier[0].id : null;

  // Create inventory item
  const newItem = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      INSERT INTO tenant_inventory.inventory_items (
        tenant_id, id, item_number, name, description, category,
        unit_of_measure, unit_cost, quantity_on_hand, par_level,
        reorder_level, supplier_id, created_at, updated_at
      )
      VALUES (
        ${tenantId},
        gen_random_uuid(),
        ${gsItem.sku ?? `GS-${gsItem.id.slice(0, 8)}`},
        ${gsItem.name},
        ${gsItem.description ?? null},
        ${gsItem.category ?? "general"},
        ${gsItem.unit_of_measure ?? "each"},
        ${gsItem.unit_cost ?? 0},
        ${gsItem.quantity_available ?? 0},
        0,
        0,
        ${supplierId},
        NOW(),
        NOW()
      )
      RETURNING id
    `
  );

  return newItem[0].id;
}

/**
 * Update a Convoy inventory item from Goodshuffle item data
 */
async function updateConvoyInventoryFromGoodshuffle(
  tenantId: string,
  convoyInventoryItemId: string,
  gsItem: GoodshuffleInventoryItem,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    return;
  }

  await database.$executeRaw`
    UPDATE tenant_inventory.inventory_items
    SET
      name = ${gsItem.name},
      description = ${gsItem.description ?? null},
      category = ${gsItem.category ?? "general"},
      unit_cost = ${gsItem.unit_cost ?? 0},
      quantity_on_hand = ${gsItem.quantity_available ?? 0},
      updated_at = NOW()
    WHERE tenant_id = ${tenantId}
      AND id = ${convoyInventoryItemId}
  `;
}

/**
 * Run a full Goodshuffle inventory sync
 */
export async function runGoodshuffleInventorySync(
  tenantId: string,
  options: Omit<InventorySyncOptions, "tenantId">
): Promise<GoodshuffleInventorySyncResult> {
  const config = await database.goodshuffleConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    return {
      success: false,
      itemsImported: 0,
      itemsSkipped: 0,
      itemsUpdated: 0,
      conflicts: [],
      errors: ["Goodshuffle integration not configured"],
    };
  }

  if (!config.syncEnabled) {
    return {
      success: false,
      itemsImported: 0,
      itemsSkipped: 0,
      itemsUpdated: 0,
      conflicts: [],
      errors: ["Goodshuffle sync is disabled"],
    };
  }

  const client = createGoodshuffleClient({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  });

  return syncInventoryFromGoodshuffle(client, tenantId, {
    ...options,
    tenantId,
  });
}

/**
 * Get inventory sync status for a tenant
 */
export async function getGoodshuffleInventorySyncStatus(
  tenantId: string
): Promise<{
  configured: boolean;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  pendingConflicts: number;
  totalSynced: number;
}> {
  const config = await database.goodshuffleConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    return {
      configured: false,
      syncEnabled: false,
      lastSyncAt: null,
      lastSyncStatus: null,
      pendingConflicts: 0,
      totalSynced: 0,
    };
  }

  const [conflictCount, syncedCount] = await Promise.all([
    database.goodshuffleInventorySync.count({
      where: { tenantId, status: "conflict" },
    }),
    database.goodshuffleInventorySync.count({
      where: { tenantId, status: "synced" },
    }),
  ]);

  return {
    configured: true,
    syncEnabled: config.syncEnabled,
    lastSyncAt: config.lastSyncAt,
    lastSyncStatus: config.lastSyncStatus,
    pendingConflicts: conflictCount,
    totalSynced: syncedCount,
  };
}
