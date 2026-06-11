/**
 * Instance Creation Helpers
 *
 * Helper functions for creating kitchen operations entity instances
 */

import type { RuntimeEngine } from "@angriff36/manifest";

/**
 * Create a prep task instance
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
    quantityUnitId?: string;
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
    taskType: data.taskType || "prep",
    status: "open",
    quantityTotal: data.quantityTotal || 0,
    quantityCompleted: 0,
    quantityUnitId: data.quantityUnitId || "",
    servingsTotal: data.servingsTotal || 0,
    startByDate: data.startByDate || 0,
    dueByDate: data.dueByDate || 0,
    priority: data.priority || 5,
    stationId: data.stationId || "",
    claimedBy: "",
    claimedAt: 0,
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
 */
export async function createInventoryItemInstance(
  engine: RuntimeEngine,
  data: {
    id: string;
    tenantId: string;
    name: string;
    itemType?: string;
    category?: string;
    baseUnit?: string;
    quantityOnHand?: number;
    parLevel?: number;
    costPerUnit?: number;
    locationId?: string;
  }
) {
  const qtyOnHand = data.quantityOnHand || 0;
  return await engine.createInstance("InventoryItem", {
    id: data.id,
    tenantId: data.tenantId,
    name: data.name,
    itemType: data.itemType || "ingredient",
    category: data.category || "",
    baseUnit: data.baseUnit || "each",
    quantityOnHand: qtyOnHand,
    quantityReserved: 0,
    quantityAvailable: qtyOnHand,
    parLevel: data.parLevel || 0,
    reorderPoint: 0,
    reorderQuantity: 0,
    costPerUnit: data.costPerUnit || 0,
    locationId: data.locationId || "",
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
