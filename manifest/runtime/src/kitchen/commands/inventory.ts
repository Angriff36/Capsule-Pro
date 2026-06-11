/**
 * Inventory Commands
 *
 * Commands for managing inventory:
 * - reserve, consume, waste, adjust, restock, releaseReservation, create
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import type { OverrideRequest } from "@angriff36/manifest/ir";
import type { InventoryCommandResult } from "../types";

/**
 * Reserve inventory
 */
export async function reserveInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  eventId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "reserve",
    { quantity, eventId, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Consume inventory
 */
export async function consumeInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  lotId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "consume",
    { quantity, lotId, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Record inventory waste
 */
export async function wasteInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  reason: string,
  lotId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "waste",
    { quantity, reason, lotId, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Adjust inventory
 */
export async function adjustInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  reason: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "adjust",
    { quantity, reason, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Restock inventory
 */
export async function restockInventory(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  costPerUnit: number,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "restock",
    { quantity, costPerUnit, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Release inventory reservation
 */
export async function releaseInventoryReservation(
  engine: RuntimeEngine,
  itemId: string,
  quantity: number,
  eventId: string,
  userId: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "releaseReservation",
    { quantity, eventId, userId },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}

/**
 * Create a new inventory item via Manifest command pipeline
 */
export async function createInventoryItem(
  engine: RuntimeEngine,
  itemId: string,
  name: string,
  itemType: string,
  category: string,
  baseUnit: string,
  parLevel: number,
  reorderPoint: number,
  reorderQuantity: number,
  costPerUnit: number,
  supplierId: string,
  locationId: string,
  allergens: string,
  overrideRequests?: OverrideRequest[]
): Promise<InventoryCommandResult> {
  const result = await engine.runCommand(
    "create",
    {
      name,
      itemType,
      category,
      baseUnit,
      parLevel,
      reorderPoint,
      reorderQuantity,
      costPerUnit,
      supplierId,
      locationId,
      allergens,
    },
    {
      entityName: "InventoryItem",
      instanceId: itemId,
      overrideRequests,
    }
  );

  const instance = await engine.getInstance("InventoryItem", itemId);
  return {
    ...result,
    itemId,
    quantityOnHand: instance?.quantityOnHand as number | undefined,
    quantityReserved: instance?.quantityReserved as number | undefined,
    quantityAvailable: instance?.quantityAvailable as number | undefined,
  };
}
