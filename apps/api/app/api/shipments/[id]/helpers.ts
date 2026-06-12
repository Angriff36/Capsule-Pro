/**
 * Helper functions for shipment route handlers
 */

import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { createManifestRuntime } from "@/lib/manifest-runtime";

export interface ShipmentUpdateInput {
  actual_delivery_date?: string | null;
  carrier?: string | null;
  delivered_by?: string | null;
  estimated_delivery_date?: string | null;
  event_id?: string | null;
  internal_notes?: string | null;
  location_id?: string | null;
  notes?: string | null;
  received_by?: string | null;
  reference?: string | null;
  scheduled_date?: string | null;
  shipment_number?: string;
  shipped_date?: string | null;
  shipping_cost?: number | null;
  shipping_method?: string | null;
  signature?: string | null;
  status?: string;
  supplier_id?: string | null;
  total_value?: number | null;
  tracking_number?: string | null;
}

export interface ShipmentUpdateData {
  actualDeliveryDate?: Date | null;
  carrier?: string | null;
  deliveredBy?: string | null;
  estimatedDeliveryDate?: Date | null;
  eventId?: string | null;
  internalNotes?: string | null;
  locationId?: string | null;
  notes?: string | null;
  receivedBy?: string | null;
  reference?: string | null;
  scheduledDate?: Date | null;
  shipmentNumber?: string;
  shippedDate?: Date | null;
  shippingCost?: string | null;
  shippingMethod?: string | null;
  signature?: string | null;
  status?: string;
  supplierId?: string | null;
  totalValue?: string | null;
  trackingNumber?: string | null;
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

function parseNumericField(numValue: number | null | undefined): string | null {
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
      setFieldIfDefined(
        updateData,
        targetKey as keyof ShipmentUpdateData,
        body[field]
      );
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

export async function updateShipmentRaw(
  tenantId: string,
  shipmentId: string,
  updateData: ShipmentUpdateData,
  user: { id: string; tenantId: string; role: string } = {
    id: "system",
    tenantId,
    role: "admin",
  }
): Promise<void> {
  await runManifestCommandCore(
    {
      createRuntime: ({ user: u, entityName }) =>
        createManifestRuntime({
          user: { id: u.id, tenantId: u.tenantId, role: u.role },
          entityName,
        }),
    },
    {
      entity: "Shipment",
      command: "update",
      instanceId: shipmentId,
      user,
      body: {
        id: shipmentId,
        tenantId,
        trackingNumber: updateData.trackingNumber ?? "",
        carrier: updateData.carrier ?? "",
        shippingMethod: updateData.shippingMethod ?? "",
        estimatedDeliveryDate: updateData.estimatedDeliveryDate,
        shippingCost:
          updateData.shippingCost == null ? 0 : Number(updateData.shippingCost),
        notes: updateData.notes ?? "",
        // Fields below are NOT declared in the Shipment "update" command params,
        // so the runtime ignores them. They are included for completeness so that
        // if the command spec is extended later, they'll flow through automatically.
        shipmentNumber: updateData.shipmentNumber,
        status: updateData.status,
        eventId: updateData.eventId,
        supplierId: updateData.supplierId,
        locationId: updateData.locationId,
        scheduledDate: updateData.scheduledDate,
        shippedDate: updateData.shippedDate,
        actualDeliveryDate: updateData.actualDeliveryDate,
        totalValue:
          updateData.totalValue == null ? 0 : Number(updateData.totalValue),
        deliveredBy: updateData.deliveredBy,
        receivedBy: updateData.receivedBy,
        signature: updateData.signature,
        internalNotes: updateData.internalNotes,
        reference: updateData.reference,
      },
    }
  );
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
