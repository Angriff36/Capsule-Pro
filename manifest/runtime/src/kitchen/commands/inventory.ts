/**
 * Inventory Commands
 *
 * Commands for managing inventory:
 * - reserve, consume, waste, adjust, restock, releaseReservation, create
 *
 * D15/U12: All `quantityAvailable` reads now use engine.evaluateComputed()
 * instead of reading a stale/undefined stored value from engine.getInstance().
 * The IR declares `computed quantityAvailable = self.quantityOnHand - self.quantityReserved`,
 * but getInstance() returns the raw stored row without evaluating computed properties.
 */

import type { RuntimeEngine } from "@angriff36/manifest";
import type { OverrideRequest } from "@angriff36/manifest/ir";
import type { InventoryCommandResult } from "../types";

/**
 * Helper: read the computed quantityAvailable for an inventory item.
 * Falls back to undefined if evaluation fails (e.g. instance not found).
 */
async function getQuantityAvailable(
  engine: RuntimeEngine,
  itemId: string
): Promise<number | undefined> {
  try {
    const value = await engine.evaluateComputed(
      "InventoryItem",
      itemId,
      "quantityAvailable"
    );
    return typeof value === "number" ? value : undefined;
  } catch {
    return undefined;
  }
}

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
    quantityAvailable: await getQuantityAvailable(engine, itemId),
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
    quantityAvailable: await getQuantityAvailable(engine, itemId),
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
    quantityAvailable: await getQuantityAvailable(engine, itemId),
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
    quantityAvailable: await getQuantityAvailable(engine, itemId),
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
    quantityAvailable: await getQuantityAvailable(engine, itemId),
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
    quantityAvailable: await getQuantityAvailable(engine, itemId),
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
    quantityAvailable: await getQuantityAvailable(engine, itemId),
  };
}
