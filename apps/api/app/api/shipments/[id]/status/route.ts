/**
 * Shipment Status API Endpoint
 *
 * POST   /api/shipments/[id]/status  - Update shipment status with validation
 */

import { auth } from "@repo/auth/server";
import type { Shipment } from "@repo/database";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Transaction types for inventory transactions
 * When a shipment is delivered, items are added to stock via "purchase" transaction
 * When a shipment is being prepared for delivery, items are reserved via "transfer" transaction
 */
const TRANSACTION_TYPE_PURCHASE = "purchase";
const TRANSACTION_TYPE_TRANSFER = "transfer";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["preparing", "cancelled"],
  preparing: ["in_transit", "cancelled"],
  in_transit: ["delivered"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
};

interface ShipmentStatusRequestBody {
  status: string;
  shipped_date?: string | null;
  actual_delivery_date?: string | null;
  delivered_by?: string | null;
  received_by?: string | null;
  signature?: string | null;
}

interface ShipmentUpdateData {
  status: string;
  shippedDate?: Date | null;
  actualDeliveryDate?: Date | null;
  deliveredBy?: string | null;
  receivedBy?: string | null;
  signature?: string | null;
}

interface ShipmentItem {
  id: string;
  item_id: string;
  quantity_shipped: number;
  quantity_received: number;
  quantity_damaged: number;
  unit_cost: number;
  lot_number: string | null;
  expiration_date: Date | null;
}

// ========== Helper Functions ==========

/**
 * Validates that the requested status transition is allowed
 */
function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): void {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new InvariantError(
      `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
    );
  }
}

/**
 * Validates delivery confirmation requirements
 */
function validateDeliveryConfirmation(
  status: string,
  body: ShipmentStatusRequestBody
): void {
  if (status === "delivered") {
    if (!body.actual_delivery_date) {
      throw new InvariantError(
        "actual_delivery_date is required when marking as delivered"
      );
    }
    if (!body.delivered_by) {
      throw new InvariantError(
        "delivered_by is required when marking as delivered"
      );
    }
  }
}

/**
 * Authenticates the request and retrieves tenant ID
 */
async function authenticateAndGetTenant(
  orgId: string | undefined
): Promise<{ tenantId: string } | NextResponse> {
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
  }

  return { tenantId };
}

/**
 * Fetches an existing shipment by ID
 */
async function fetchExistingShipment(
  tenantId: string,
  shipmentId: string
): Promise<Shipment | NextResponse> {
  const existing = await database.shipment.findFirst({
    where: { tenantId, id: shipmentId, deletedAt: null },
  });

  if (!existing) {
    return NextResponse.json(
      { message: "Shipment not found" },
      { status: 404 }
    );
  }

  return existing;
}

/**
 * Builds the update data object from request body
 */
function buildUpdateData(
  body: ShipmentStatusRequestBody,
  existingShipment: Shipment
): ShipmentUpdateData {
  const updateData: ShipmentUpdateData = { status: body.status };

  if (body.shipped_date !== undefined) {
    updateData.shippedDate = body.shipped_date
      ? new Date(body.shipped_date)
      : null;
  }
  if (body.actual_delivery_date !== undefined) {
    updateData.actualDeliveryDate = body.actual_delivery_date
      ? new Date(body.actual_delivery_date)
      : null;
  }
  if (body.delivered_by !== undefined) {
    updateData.deliveredBy = body.delivered_by;
  }
  if (body.received_by !== undefined) {
    updateData.receivedBy = body.received_by;
  }
  if (body.signature !== undefined) {
    updateData.signature = body.signature;
  }

  // Auto-set shipped_date when transitioning to in_transit
  if (body.status === "in_transit" && !existingShipment.shippedDate) {
    updateData.shippedDate = new Date();
  }

  return updateData;
}

/**
 * Executes the raw SQL update for shipment
 */
async function updateShipmentInDatabase(
  tenantId: string,
  shipmentId: string,
  updateData: ShipmentUpdateData
): Promise<void> {
  await database.$executeRaw`
    UPDATE "tenant_inventory"."shipments"
    SET
      "status" = ${updateData.status}::text,
      "shipped_date" = COALESCE(${updateData.shippedDate}::timestamptz, "shipped_date"),
      "actual_delivery_date" = COALESCE(${updateData.actualDeliveryDate}::timestamptz, "actual_delivery_date"),
      "delivered_by" = COALESCE(${updateData.deliveredBy}::uuid, "delivered_by"),
      "received_by" = COALESCE(${updateData.receivedBy}, "received_by"),
      "signature" = COALESCE(${updateData.signature}, "signature"),
      "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${shipmentId}::uuid
  `;
}

/**
 * Fetches the updated shipment after update
 */
async function fetchUpdatedShipment(
  tenantId: string,
  shipmentId: string
): Promise<Shipment | NextResponse> {
  const updated = await database.shipment.findFirst({
    where: { tenantId, id: shipmentId, deletedAt: null },
  });

  if (!updated) {
    return NextResponse.json(
      { message: "Shipment not found after update" },
      { status: 404 }
    );
  }

  return updated;
}

/**
 * Maps a Shipment Prisma model to the API response format
 */
function mapShipmentToResponse(shipment: Shipment) {
  return {
    id: shipment.id,
    tenant_id: shipment.tenantId,
    shipment_number: shipment.shipmentNumber,
    status: shipment.status,
    event_id: shipment.eventId,
    supplier_id: shipment.supplierId,
    location_id: shipment.locationId,
    scheduled_date: shipment.scheduledDate,
    shipped_date: shipment.shippedDate,
    estimated_delivery_date: shipment.estimatedDeliveryDate,
    actual_delivery_date: shipment.actualDeliveryDate,
    total_items: shipment.totalItems,
    shipping_cost: shipment.shippingCost ? Number(shipment.shippingCost) : null,
    total_value: shipment.totalValue ? Number(shipment.totalValue) : null,
    tracking_number: shipment.trackingNumber,
    carrier: shipment.carrier,
    shipping_method: shipment.shippingMethod,
    delivered_by: shipment.deliveredBy,
    received_by: shipment.receivedBy,
    signature: shipment.signature,
    notes: shipment.notes,
    internal_notes: shipment.internalNotes,
    reference: shipment.reference,
    created_at: shipment.createdAt,
    updated_at: shipment.updatedAt,
    deleted_at: shipment.deletedAt,
  };
}

/**
 * Fetches shipment items for inventory processing
 */
async function fetchShipmentItems(shipmentId: string): Promise<ShipmentItem[]> {
  return await database.$queryRaw<ShipmentItem[]>`
    SELECT si.id,
           si.item_id,
           si.quantity_shipped,
           si.quantity_received,
           si.quantity_damaged,
           si.unit_cost,
           si.lot_number,
           si.expiration_date
    FROM "tenant_inventory"."shipment_items" AS si
    WHERE si.shipment_id = ${shipmentId}::uuid
      AND si.deleted_at IS NULL
  `;
}

/**
 * Creates an inventory transaction for a received shipment item
 */
async function createInventoryTransaction(
  tenantId: string,
  shipmentId: string,
  item: ShipmentItem,
  goodQuantity: number,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null
): Promise<void> {
  await database.$executeRaw`
    INSERT INTO "tenant_inventory"."inventory_transactions"
      (tenant_id, item_id, transaction_type, quantity, unit_cost, total_cost,
       reference, notes, transaction_date, employee_id, reference_type, reference_id,
       storage_location_id, reason)
    VALUES (
      ${tenantId}::uuid,
      ${item.item_id}::uuid,
      ${TRANSACTION_TYPE_PURCHASE}::text,
      ${goodQuantity}::numeric,
      ${item.unit_cost}::numeric,
      ${goodQuantity * Number(item.unit_cost)}::numeric,
      ${shipmentNumber}::text,
      ${
        `Received from shipment ${shipmentNumber}` +
        (item.lot_number ? ` (Lot: ${item.lot_number})` : "") +
        (item.expiration_date
          ? ` (Expires: ${item.expiration_date.toISOString().split("T")[0]})`
          : "")
      }::text,
      CURRENT_TIMESTAMP,
      ${userId}::uuid,
      ${"shipment"}::text,
      ${shipmentId}::uuid,
      ${locationId || "00000000-0000-0000-0000-000000000000"}::uuid,
      ${"shipment_receipt"}::text
    )
  `;
}

/**
 * Updates inventory item quantity on hand
 */
async function updateInventoryQuantity(
  tenantId: string,
  itemId: string,
  goodQuantity: number
): Promise<void> {
  await database.$executeRaw`
    UPDATE "tenant_inventory"."inventory_items"
    SET "quantity_on_hand" = "quantity_on_hand" + ${goodQuantity}::numeric,
        "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = ${tenantId}::uuid
      AND "id" = ${itemId}::uuid
      AND "deleted_at" IS NULL
  `;
}

/**
 * Creates an inventory reservation transaction for an outgoing shipment item
 */
async function createReservationTransaction(
  tenantId: string,
  shipmentId: string,
  item: ShipmentItem,
  quantity: number,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null
): Promise<void> {
  await database.$executeRaw`
    INSERT INTO "tenant_inventory"."inventory_transactions"
      (tenant_id, item_id, transaction_type, quantity, unit_cost, total_cost,
       reference, notes, transaction_date, employee_id, reference_type, reference_id,
       storage_location_id, reason)
    VALUES (
      ${tenantId}::uuid,
      ${item.item_id}::uuid,
      ${TRANSACTION_TYPE_TRANSFER}::text,
      ${-quantity}::numeric,
      ${item.unit_cost}::numeric,
      ${-quantity * Number(item.unit_cost)}::numeric,
      ${shipmentNumber}::text,
      ${
        `Reserved for outgoing shipment ${shipmentNumber}` +
        (item.lot_number ? ` (Lot: ${item.lot_number})` : "")
      }::text,
      CURRENT_TIMESTAMP,
      ${userId}::uuid,
      ${"shipment"}::text,
      ${shipmentId}::uuid,
      ${locationId || "00000000-0000-0000-0000-000000000000"}::uuid,
      ${"shipment_preparation"}::text
    )
  `;
}

/**
 * Reduces inventory item quantity on hand for outgoing shipments
 */
async function reduceInventoryQuantity(
  tenantId: string,
  itemId: string,
  quantity: number
): Promise<void> {
  await database.$executeRaw`
    UPDATE "tenant_inventory"."inventory_items"
    SET "quantity_on_hand" = "quantity_on_hand" - ${quantity}::numeric,
        "updated_at" = CURRENT_TIMESTAMP
    WHERE "tenant_id" = ${tenantId}::uuid
      AND "id" = ${itemId}::uuid
      AND "deleted_at" IS NULL
  `;
}

/**
 * Processes inventory reservation when a shipment enters "preparing" status
 * This is for OUTGOING shipments (to events) - items are removed from inventory
 */
async function processPreparationInventory(
  tenantId: string,
  shipmentId: string,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null
): Promise<void> {
  const shipmentItems = await fetchShipmentItems(shipmentId);

  for (const item of shipmentItems) {
    const quantityToReserve = Number(item.quantity_shipped);

    if (quantityToReserve <= 0) {
      continue;
    }

    await createReservationTransaction(
      tenantId,
      shipmentId,
      item,
      quantityToReserve,
      shipmentNumber,
      locationId,
      userId
    );

    await reduceInventoryQuantity(tenantId, item.item_id, quantityToReserve);
  }
}

/**
 * Creates a reversal transaction when a shipment is cancelled during preparation
 */
async function createReversalTransaction(
  tenantId: string,
  shipmentId: string,
  item: ShipmentItem,
  quantity: number,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null
): Promise<void> {
  await database.$executeRaw`
    INSERT INTO "tenant_inventory"."inventory_transactions"
      (tenant_id, item_id, transaction_type, quantity, unit_cost, total_cost,
       reference, notes, transaction_date, employee_id, reference_type, reference_id,
       storage_location_id, reason)
    VALUES (
      ${tenantId}::uuid,
      ${item.item_id}::uuid,
      ${TRANSACTION_TYPE_TRANSFER}::text,
      ${quantity}::numeric,
      ${item.unit_cost}::numeric,
      ${quantity * Number(item.unit_cost)}::numeric,
      ${shipmentNumber}::text,
      ${`Reversal: Cancelled shipment ${shipmentNumber}`}::text,
      CURRENT_TIMESTAMP,
      ${userId}::uuid,
      ${"shipment"}::text,
      ${shipmentId}::uuid,
      ${locationId || "00000000-0000-0000-0000-000000000000"}::uuid,
      ${"shipment_cancellation"}::text
    )
  `;
}

/**
 * Processes inventory reversal when a shipment is cancelled during preparation
 * This returns the reserved items back to inventory
 */
async function processCancellationInventory(
  tenantId: string,
  shipmentId: string,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null
): Promise<void> {
  const shipmentItems = await fetchShipmentItems(shipmentId);

  for (const item of shipmentItems) {
    const quantityToRestore = Number(item.quantity_shipped);

    if (quantityToRestore <= 0) {
      continue;
    }

    await createReversalTransaction(
      tenantId,
      shipmentId,
      item,
      quantityToRestore,
      shipmentNumber,
      locationId,
      userId
    );

    await updateInventoryQuantity(tenantId, item.item_id, quantityToRestore);
  }
}

/**
 * Processes inventory updates when a shipment is delivered
 */
async function processDeliveryInventory(
  tenantId: string,
  shipmentId: string,
  shipmentNumber: string,
  locationId: string | null,
  userId: string | null
): Promise<void> {
  const shipmentItems = await fetchShipmentItems(shipmentId);

  for (const item of shipmentItems) {
    const receivedQuantity =
      Number(item.quantity_received) > 0
        ? Number(item.quantity_received)
        : Number(item.quantity_shipped);

    const damagedQuantity = Number(item.quantity_damaged) || 0;
    const goodQuantity = receivedQuantity - damagedQuantity;

    if (goodQuantity <= 0) {
      continue;
    }

    await createInventoryTransaction(
      tenantId,
      shipmentId,
      item,
      goodQuantity,
      shipmentNumber,
      locationId,
      userId
    );

    await updateInventoryQuantity(tenantId, item.item_id, goodQuantity);
  }
}

/**
 * Handles inventory updates for delivered shipments
 */
async function handleInventoryOnDelivery(
  updated: Shipment,
  previousStatus: string,
  tenantId: string,
  shipmentId: string
): Promise<void> {
  if (updated.status !== "delivered" || previousStatus === "delivered") {
    return;
  }

  try {
    await processDeliveryInventory(
      tenantId,
      shipmentId,
      updated.shipmentNumber,
      updated.locationId,
      updated.deliveredBy ?? updated.receivedBy ?? null
    );
  } catch (inventoryError) {
    console.error(
      "Failed to update inventory for delivered shipment:",
      inventoryError
    );
    // Continue with the response even if inventory update fails
  }
}

/**
 * Handles inventory reservation for shipments entering "preparing" status
 * Only applies to OUTGOING shipments (those with an event_id set)
 */
async function handleInventoryOnPreparation(
  updated: Shipment,
  previousStatus: string,
  tenantId: string,
  shipmentId: string,
  userId: string | null
): Promise<void> {
  // Only process when entering "preparing" status
  if (updated.status !== "preparing" || previousStatus === "preparing") {
    return;
  }

  // Only process OUTGOING shipments (to events)
  if (!updated.eventId) {
    return;
  }

  try {
    await processPreparationInventory(
      tenantId,
      shipmentId,
      updated.shipmentNumber,
      updated.locationId,
      userId
    );
  } catch (inventoryError) {
    console.error(
      "Failed to reserve inventory for preparing shipment:",
      inventoryError
    );
    // Continue with the response even if inventory update fails
  }
}

/**
 * Handles inventory reversal for shipments cancelled during preparation
 * Only applies to OUTGOING shipments that were in "preparing" status
 */
async function handleInventoryOnCancellation(
  updated: Shipment,
  previousStatus: string,
  tenantId: string,
  shipmentId: string,
  userId: string | null
): Promise<void> {
  // Only process when entering "cancelled" status
  if (updated.status !== "cancelled") {
    return;
  }

  // Only process if was in preparing or scheduled status (had reserved inventory)
  if (previousStatus !== "preparing" && previousStatus !== "scheduled") {
    return;
  }

  // Only process OUTGOING shipments (to events)
  if (!updated.eventId) {
    return;
  }

  try {
    await processCancellationInventory(
      tenantId,
      shipmentId,
      updated.shipmentNumber,
      updated.locationId,
      userId
    );
  } catch (inventoryError) {
    console.error(
      "Failed to reverse inventory for cancelled shipment:",
      inventoryError
    );
    // Continue with the response even if inventory update fails
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate and get tenant
    const { orgId } = await auth();
    const authResult = await authenticateAndGetTenant(orgId ?? undefined);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { tenantId } = authResult;

    // Parse request
    const { id } = await params;
    const body = (await request.json()) as ShipmentStatusRequestBody;

    if (!body.status) {
      throw new InvariantError("status is required");
    }

    // Fetch existing shipment
    const existingResult = await fetchExistingShipment(tenantId, id);
    if (existingResult instanceof NextResponse) {
      return existingResult;
    }
    const existing = existingResult;

    // Validate status transition
    validateStatusTransition(existing.status, body.status);
    validateDeliveryConfirmation(body.status, body);

    // Build and execute update
    const updateData = buildUpdateData(body, existing);
    await updateShipmentInDatabase(tenantId, id, updateData);

    // Fetch updated shipment
    const updatedResult = await fetchUpdatedShipment(tenantId, id);
    if (updatedResult instanceof NextResponse) {
      return updatedResult;
    }
    const updated = updatedResult;

    // Handle inventory updates on delivery
    await handleInventoryOnDelivery(updated, existing.status, tenantId, id);

    // Handle inventory reservation on preparation (outgoing shipments)
    await handleInventoryOnPreparation(
      updated,
      existing.status,
      tenantId,
      id,
      orgId ?? null
    );

    // Handle inventory reversal on cancellation
    await handleInventoryOnCancellation(
      updated,
      existing.status,
      tenantId,
      id,
      orgId ?? null
    );

    return NextResponse.json(mapShipmentToResponse(updated));
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update shipment status:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
