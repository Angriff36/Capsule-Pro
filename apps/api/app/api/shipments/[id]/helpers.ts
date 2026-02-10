/**
 * Helper functions for shipment route handlers
 */

import { database } from "@repo/database";

export interface ShipmentUpdateInput {
  shipment_number?: string;
  status?: string;
  event_id?: string | null;
  supplier_id?: string | null;
  location_id?: string | null;
  scheduled_date?: string | null;
  shipped_date?: string | null;
  estimated_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  shipping_cost?: number | null;
  total_value?: number | null;
  tracking_number?: string | null;
  carrier?: string | null;
  shipping_method?: string | null;
  delivered_by?: string | null;
  received_by?: string | null;
  signature?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  reference?: string | null;
}

export interface ShipmentUpdateData {
  shipmentNumber?: string;
  status?: string;
  eventId?: string | null;
  supplierId?: string | null;
  locationId?: string | null;
  scheduledDate?: Date | null;
  shippedDate?: Date | null;
  estimatedDeliveryDate?: Date | null;
  actualDeliveryDate?: Date | null;
  shippingCost?: string | null;
  totalValue?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  shippingMethod?: string | null;
  deliveredBy?: string | null;
  receivedBy?: string | null;
  signature?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  reference?: string | null;
}

export interface ExistingShipment {
  id: string;
  shipmentNumber: string;
  status: string;
}

/**
 * Fetches an existing shipment by ID and tenant
 */
export async function fetchExistingShipment(
  tenantId: string,
  shipmentId: string
): Promise<ExistingShipment | null> {
  const existing = await database.shipment.findFirst({
    where: { tenantId, id: shipmentId, deletedAt: null },
  });

  if (!existing) {
    return null;
  }

  return {
    id: existing.id,
    shipmentNumber: existing.shipmentNumber,
    status: existing.status,
  };
}

/**
 * Checks for duplicate shipment number
 */
export async function checkDuplicateShipmentNumber(
  tenantId: string,
  shipmentNumber: string,
  excludeId: string
): Promise<boolean> {
  const duplicate = await database.shipment.findFirst({
    where: {
      tenantId,
      shipmentNumber,
      deletedAt: null,
      id: { not: excludeId },
    },
  });

  return duplicate !== null;
}

function parseDateField(dateValue: string | null | undefined): Date | null {
  return dateValue ? new Date(dateValue) : null;
}

function parseNumericField(
  numValue: number | null | undefined
): string | null {
  return numValue !== null && numValue !== undefined
    ? numValue.toString()
    : null;
}

function setFieldIfDefined<T>(
  updateData: T,
  key: keyof T,
  value: unknown
): void {
  if (value !== undefined) {
    updateData[key] = value as T[keyof T];
  }
}

/**
 * Builds update data object from request body
 */
export function buildShipmentUpdateData(
  body: ShipmentUpdateInput
): ShipmentUpdateData {
  const updateData: ShipmentUpdateData = {};

  // String fields (direct assignment)
  const stringFields: Array<keyof ShipmentUpdateInput> = [
    "shipment_number",
    "status",
    "event_id",
    "supplier_id",
    "location_id",
    "tracking_number",
    "carrier",
    "shipping_method",
    "delivered_by",
    "received_by",
    "signature",
    "notes",
    "internal_notes",
    "reference",
  ];

  const fieldMapping: Record<string, keyof ShipmentUpdateData> = {
    shipment_number: "shipmentNumber",
    event_id: "eventId",
    supplier_id: "supplierId",
    location_id: "locationId",
    tracking_number: "trackingNumber",
    shipping_method: "shippingMethod",
    delivered_by: "deliveredBy",
    received_by: "receivedBy",
    internal_notes: "internalNotes",
  };

  for (const field of stringFields) {
    if (body[field] !== undefined) {
      const targetKey = fieldMapping[field] || field;
      setFieldIfDefined(updateData, targetKey as keyof ShipmentUpdateData, body[field]);
    }
  }

  // Date fields
  if (body.scheduled_date !== undefined) {
    updateData.scheduledDate = parseDateField(body.scheduled_date);
  }
  if (body.shipped_date !== undefined) {
    updateData.shippedDate = parseDateField(body.shipped_date);
  }
  if (body.estimated_delivery_date !== undefined) {
    updateData.estimatedDeliveryDate = parseDateField(
      body.estimated_delivery_date
    );
  }
  if (body.actual_delivery_date !== undefined) {
    updateData.actualDeliveryDate = parseDateField(body.actual_delivery_date);
  }

  // Numeric fields
  if (body.shipping_cost !== undefined) {
    updateData.shippingCost = parseNumericField(body.shipping_cost);
  }
  if (body.total_value !== undefined) {
    updateData.totalValue = parseNumericField(body.total_value);
  }

  return updateData;
}

/**
 * Executes raw SQL update for shipment
 */
export async function updateShipmentRaw(
  tenantId: string,
  shipmentId: string,
  updateData: ShipmentUpdateData
): Promise<void> {
  await database.$executeRaw`
    UPDATE "tenant_inventory"."shipments"
    SET
      "shipment_number" = COALESCE(${updateData.shipmentNumber}, "shipment_number"),
      "status" = COALESCE(${updateData.status}, "status"),
      "event_id" = COALESCE(${updateData.eventId}::uuid, "event_id"),
      "supplier_id" = COALESCE(${updateData.supplierId}::uuid, "supplier_id"),
      "location_id" = COALESCE(${updateData.locationId}::uuid, "location_id"),
      "scheduled_date" = COALESCE(${updateData.scheduledDate}::timestamptz, "scheduled_date"),
      "shipped_date" = COALESCE(${updateData.shippedDate}::timestamptz, "shipped_date"),
      "estimated_delivery_date" = COALESCE(${updateData.estimatedDeliveryDate}::timestamptz, "estimated_delivery_date"),
      "actual_delivery_date" = COALESCE(${updateData.actualDeliveryDate}::timestamptz, "actual_delivery_date"),
      "shipping_cost" = COALESCE(${updateData.shippingCost}::numeric, "shipping_cost"),
      "total_value" = COALESCE(${updateData.totalValue}::numeric, "total_value"),
      "tracking_number" = COALESCE(${updateData.trackingNumber}, "tracking_number"),
      "carrier" = COALESCE(${updateData.carrier}, "carrier"),
      "shipping_method" = COALESCE(${updateData.shippingMethod}, "shipping_method"),
      "delivered_by" = COALESCE(${updateData.deliveredBy}::uuid, "delivered_by"),
      "received_by" = COALESCE(${updateData.receivedBy}, "received_by"),
      "signature" = COALESCE(${updateData.signature}, "signature"),
      "notes" = COALESCE(${updateData.notes}, "notes"),
      "internal_notes" = COALESCE(${updateData.internalNotes}, "internal_notes"),
      "reference" = COALESCE(${updateData.reference}, "reference"),
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${shipmentId}::uuid
  `;
}

/**
 * Formats shipment response
 */
export async function fetchUpdatedShipment(
  tenantId: string,
  shipmentId: string
) {
  const updated = await database.shipment.findFirst({
    where: { tenantId, id: shipmentId, deletedAt: null },
  });

  if (!updated) {
    return null;
  }

  return {
    id: updated.id,
    tenant_id: updated.tenantId,
    shipment_number: updated.shipmentNumber,
    status: updated.status,
    event_id: updated.eventId,
    supplier_id: updated.supplierId,
    location_id: updated.locationId,
    scheduled_date: updated.scheduledDate,
    shipped_date: updated.shippedDate,
    estimated_delivery_date: updated.estimatedDeliveryDate,
    actual_delivery_date: updated.actualDeliveryDate,
    total_items: updated.totalItems,
    shipping_cost: updated.shippingCost ? Number(updated.shippingCost) : null,
    total_value: updated.totalValue ? Number(updated.totalValue) : null,
    tracking_number: updated.trackingNumber,
    carrier: updated.carrier,
    shipping_method: updated.shippingMethod,
    delivered_by: updated.deliveredBy,
    received_by: updated.receivedBy,
    signature: updated.signature,
    notes: updated.notes,
    internal_notes: updated.internalNotes,
    reference: updated.reference,
    created_at: updated.createdAt,
    updated_at: updated.updatedAt,
    deleted_at: updated.deletedAt,
  };
}
