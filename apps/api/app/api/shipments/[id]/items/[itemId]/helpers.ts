/**
 * Helper functions for shipment item route handlers
 */

import { database } from "@repo/database";
import { InvariantError } from "@/app/lib/invariant";

export interface ShipmentItemUpdateInput {
  quantity_shipped?: number;
  quantity_received?: number;
  quantity_damaged?: number;
  unit_id?: number;
  unit_cost?: number | null;
  condition?: string | null;
  condition_notes?: string | null;
  lot_number?: string | null;
  expiration_date?: string | null;
}

export interface ShipmentItemUpdateData {
  quantityShipped?: string;
  quantityReceived?: string;
  quantityDamaged?: string;
  unitId?: number;
  unitCost?: string | null;
  totalCost: string;
  condition?: string | null;
  conditionNotes?: string | null;
  lotNumber?: string | null;
  expirationDate?: Date | null;
}

export interface ExistingShipmentItem {
  id: string;
  quantityShipped: string;
  unitCost: string | null;
}

/**
 * Validates shipment item update input
 */
export function validateShipmentItemUpdate(
  item: ShipmentItemUpdateInput
): void {
  if (item.quantity_shipped !== undefined && item.quantity_shipped <= 0) {
    throw new InvariantError("quantity_shipped must be greater than 0");
  }
  if (item.quantity_received !== undefined && item.quantity_received < 0) {
    throw new InvariantError("quantity_received cannot be negative");
  }
  if (item.quantity_damaged !== undefined && item.quantity_damaged < 0) {
    throw new InvariantError("quantity_damaged cannot be negative");
  }
}

/**
 * Fetches an existing shipment item by ID and tenant
 */
export async function fetchExistingShipmentItem(
  tenantId: string,
  itemId: string,
  shipmentId: string
): Promise<ExistingShipmentItem | null> {
  const existing = await database.shipmentItem.findFirst({
    where: {
      tenantId,
      id: itemId,
      shipmentId,
      deletedAt: null,
    },
  });

  if (!existing) {
    return null;
  }

  return {
    id: existing.id,
    quantityShipped: existing.quantityShipped.toString(),
    unitCost: existing.unitCost?.toString() ?? null,
  };
}

/**
 * Builds update data object from request body and existing item
 */
export function buildShipmentItemUpdateData(
  body: ShipmentItemUpdateInput,
  existing: ExistingShipmentItem
): ShipmentItemUpdateData {
  const updateData: ShipmentItemUpdateData = {
    totalCost: "",
  };

  if (body.quantity_shipped !== undefined) {
    updateData.quantityShipped = body.quantity_shipped.toString();
  }
  if (body.quantity_received !== undefined) {
    updateData.quantityReceived = body.quantity_received.toString();
  }
  if (body.quantity_damaged !== undefined) {
    updateData.quantityDamaged = body.quantity_damaged.toString();
  }
  if (body.unit_id !== undefined) {
    updateData.unitId = body.unit_id;
  }
  if (body.unit_cost !== undefined) {
    updateData.unitCost = body.unit_cost ? body.unit_cost.toString() : null;
  }
  if (body.condition !== undefined) {
    updateData.condition = body.condition;
  }
  if (body.condition_notes !== undefined) {
    updateData.conditionNotes = body.condition_notes;
  }
  if (body.lot_number !== undefined) {
    updateData.lotNumber = body.lot_number;
  }
  if (body.expiration_date !== undefined) {
    updateData.expirationDate = body.expiration_date
      ? new Date(body.expiration_date)
      : null;
  }

  // Recalculate total cost if quantities or unit cost changed
  const newQuantityShipped =
    body.quantity_shipped ?? Number(existing.quantityShipped);
  const newUnitCost =
    body.unit_cost ?? (existing.unitCost ? Number(existing.unitCost) : 0);
  updateData.totalCost = (newQuantityShipped * newUnitCost).toString();

  return updateData;
}

/**
 * Executes raw SQL update for shipment item
 */
export async function updateShipmentItemRaw(
  tenantId: string,
  itemId: string,
  updateData: ShipmentItemUpdateData
): Promise<void> {
  await database.$executeRaw`
    UPDATE "tenant_inventory"."shipment_items"
    SET
      "quantity_shipped" = COALESCE(${updateData.quantityShipped}::numeric, "quantity_shipped"),
      "quantity_received" = COALESCE(${updateData.quantityReceived}::numeric, "quantity_received"),
      "quantity_damaged" = COALESCE(${updateData.quantityDamaged}::numeric, "quantity_damaged"),
      "unit_id" = COALESCE(${updateData.unitId}::smallint, "unit_id"),
      "unit_cost" = COALESCE(${updateData.unitCost}::numeric, "unit_cost"),
      "total_cost" = ${updateData.totalCost}::numeric,
      "condition" = COALESCE(${updateData.condition}, "condition"),
      "condition_notes" = COALESCE(${updateData.conditionNotes}, "condition_notes"),
      "lot_number" = COALESCE(${updateData.lotNumber}, "lot_number"),
      "expiration_date" = COALESCE(${updateData.expirationDate}::timestamptz, "expiration_date"),
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${itemId}::uuid
  `;
}

/**
 * Updates shipment totals after item modification
 */
export async function updateShipmentTotals(
  tenantId: string,
  shipmentId: string
): Promise<void> {
  const allItems = await database.shipmentItem.findMany({
    where: { tenantId, shipmentId, deletedAt: null },
  });

  const totalItems = allItems.reduce(
    (sum, i) => sum + Number(i.quantityShipped),
    0
  );
  const totalValue = allItems.reduce((sum, i) => sum + Number(i.totalCost), 0);

  await database.$executeRaw`
    UPDATE "tenant_inventory"."shipments"
    SET "total_items" = ${totalItems}::integer,
        "total_value" = ${totalValue}::numeric,
        "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${shipmentId}::uuid
  `;
}

/**
 * Formats shipment item response
 */
export async function fetchUpdatedShipmentItem(
  tenantId: string,
  itemId: string
) {
  const updated = await database.shipmentItem.findFirst({
    where: { tenantId, id: itemId, deletedAt: null },
    include: { item: true },
  });

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    tenant_id: updated.tenantId,
    shipment_id: updated.shipmentId,
    item_id: updated.itemId,
    quantity_shipped: Number(updated.quantityShipped),
    quantity_received: Number(updated.quantityReceived),
    quantity_damaged: Number(updated.quantityDamaged),
    unit_id: updated.unitId,
    unit_cost: updated.unitCost ? Number(updated.unitCost) : null,
    total_cost: Number(updated.totalCost),
    condition: updated.condition,
    condition_notes: updated.conditionNotes,
    lot_number: updated.lotNumber,
    expiration_date: updated.expirationDate,
    created_at: updated.createdAt,
    updated_at: updated.updatedAt,
    item: updated.item
      ? {
          id: updated.item.id,
          name: updated.item.name,
          item_number: updated.item.item_number,
        }
      : null,
  };
}
