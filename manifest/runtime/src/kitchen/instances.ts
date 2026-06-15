/**
 * Instance Creation Helpers
 *
 * Helper functions for creating kitchen operations entity instances
 */

import type { RuntimeEngine } from "@angriff36/manifest";

/**
 * Create a prep task instance
 *
 * D15/U12: Removed hardcoded defaults that duplicate IR property defaults
 * (taskType="prep", status="open", priority=5, claimedBy="", claimedAt=null,
 * quantityCompleted=0, quantityTotal=0, quantityUnitId=0, servingsTotal=0).
 * These are now left unset so the entity's own .manifest defaults apply,
 * preventing drift if the spec defaults change.
 * Also fixed quantityUnitId type from string to number (entity declares int).
 */
export async function createPrepTaskInstance(
  engine: RuntimeEngine,
  data: {
    id: string;
    tenantId: string;
    eventId: string;
    name: string;
    taskType?: string;
    quantityTotal?: number;
    quantityUnitId?: number;
    servingsTotal?: number;
    startByDate?: number;
    dueByDate?: number;
    priority?: number;
    stationId?: string;
  }
) {
  return await engine.createInstance("PrepTask", {
    id: data.id,
    tenantId: data.tenantId,
    eventId: data.eventId,
    name: data.name,
    taskType: data.taskType,
    quantityTotal: data.quantityTotal,
    quantityUnitId: data.quantityUnitId,
    servingsTotal: data.servingsTotal,
    startByDate: data.startByDate,
    dueByDate: data.dueByDate,
    priority: data.priority,
    stationId: data.stationId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

/**
 * Create a station instance
 */
export async function createStationInstance(
  engine: RuntimeEngine,
  data: {
    id: string;
    tenantId: string;
    locationId: string;
    name: string;
    stationType?: string;
    capacitySimultaneousTasks?: number;
    equipmentList?: string;
  }
) {
  return await engine.createInstance("Station", {
    id: data.id,
    tenantId: data.tenantId,
    locationId: data.locationId,
    name: data.name,
    stationType: data.stationType || "prep-station",
    capacitySimultaneousTasks: data.capacitySimultaneousTasks || 1,
    equipmentList: data.equipmentList || "",
    isActive: true,
    currentTaskCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

/**
 * Create an inventory item instance
 *
 * D15/U12: Fixed multiple divergences from the InventoryItem .manifest entity:
 * - Removed `quantityAvailable` — it's a computed property
 *   (computed quantityAvailable = self.quantityOnHand - self.quantityReserved).
 *   Storing it as a static field produced stale/wrong values.
 * - Removed phantom fields not on the entity: `itemType`, `reorderQuantity`,
 *   `locationId`, `isActive`.
 * - Renamed phantom fields to their real entity counterparts:
 *   baseUnit → unitOfMeasure, costPerUnit → unitCost, reorderPoint → reorder_level.
 * - Added `item_number` (required property on the entity, was missing).
 * - Removed `qtyOnHand` local var (was only used for the now-removed quantityAvailable).
 */
export async function createInventoryItemInstance(
  engine: RuntimeEngine,
  data: {
    id: string;
    tenantId: string;
    name: string;
    itemNumber?: string;
    category?: string;
    unitOfMeasure?: string;
    quantityOnHand?: number;
    parLevel?: number;
    unitCost?: number;
    reorderLevel?: number;
    supplierId?: string;
  }
) {
  return await engine.createInstance("InventoryItem", {
    id: data.id,
    tenantId: data.tenantId,
    item_number: data.itemNumber || data.id,
    name: data.name,
    category: data.category || "",
    unitOfMeasure: data.unitOfMeasure || "each",
    quantityOnHand: data.quantityOnHand || 0,
    quantityReserved: 0,
    parLevel: data.parLevel || 0,
    reorder_level: data.reorderLevel || 0,
    unitCost: data.unitCost || 0,
    supplierId: data.supplierId || "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
