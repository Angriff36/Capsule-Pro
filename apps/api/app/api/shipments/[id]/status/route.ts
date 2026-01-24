/**
 * Shipment Status API Endpoint
 *
 * POST   /api/shipments/[id]/status  - Update shipment status with validation
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Transaction types for inventory transactions
 * When a shipment is delivered, items are added to stock via "purchase" transaction
 */
const TRANSACTION_TYPE_PURCHASE = "purchase";

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["preparing", "cancelled"],
  preparing: ["in_transit", "cancelled"],
  in_transit: ["delivered"],
  delivered: ["returned"],
  returned: [],
  cancelled: [],
};

function validateStatusTransition(currentStatus: string, newStatus: string) {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new InvariantError(
      `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
    );
  }
}

function validateDeliveryConfirmation(status: string, body: any) {
  if (status === "delivered") {
    if (!body.actual_delivery_date) {
      throw new InvariantError("actual_delivery_date is required when marking as delivered");
    }
    if (!body.delivered_by) {
      throw new InvariantError("delivered_by is required when marking as delivered");
    }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      throw new InvariantError("status is required");
    }

    // Verify shipment exists
    const existing = await database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ message: "Shipment not found" }, { status: 404 });
    }

    // Validate status transition
    validateStatusTransition(existing.status, body.status);

    // Validate delivery confirmation requirements
    validateDeliveryConfirmation(body.status, body);

    // Build update data
    const updateData: any = { status: body.status };

    if (body.shipped_date !== undefined) {
      updateData.shippedDate = body.shipped_date ? new Date(body.shipped_date) : null;
    }
    if (body.actual_delivery_date !== undefined) {
      updateData.actualDeliveryDate = body.actual_delivery_date ? new Date(body.actual_delivery_date) : null;
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
    if (body.status === "in_transit" && !existing.shippedDate) {
      updateData.shippedDate = new Date();
    }

    // Use raw SQL for composite key update
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
      WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${id}::uuid
    `;

    const updated = await database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!updated) {
      return NextResponse.json({ message: "Shipment not found after update" }, { status: 404 });
    }

    const mappedShipment = {
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

    // Integrate with inventory system to update stock when delivered
    if (updated.status === "delivered" && existing.status !== "delivered") {
      try {
        // Get shipment items to add to inventory
        const shipmentItems = await database.$queryRaw<
          Array<{
            id: string;
            item_id: string;
            quantity_shipped: number;
            quantity_received: number;
            quantity_damaged: number;
            unit_cost: number;
            lot_number: string | null;
            expiration_date: Date | null;
          }>
        >`
          SELECT si.id,
                 si.item_id,
                 si.quantity_shipped,
                 si.quantity_received,
                 si.quantity_damaged,
                 si.unit_cost,
                 si.lot_number,
                 si.expiration_date
          FROM "tenant_inventory"."shipment_items" AS si
          WHERE si.shipment_id = ${id}::uuid
            AND si.deleted_at IS NULL
        `;

        // Get user ID for transaction records
        const userId = updated.deliveredBy || updated.receivedBy;

        // Process each shipment item
        for (const item of shipmentItems) {
          const receivedQuantity = Number(item.quantity_received) > 0
            ? Number(item.quantity_received)
            : Number(item.quantity_shipped);

          const damagedQuantity = Number(item.quantity_damaged) || 0;
          const goodQuantity = receivedQuantity - damagedQuantity;

          if (goodQuantity <= 0) continue;

          // Create inventory transaction for received items
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
              ${updated.shipmentNumber}::text,
              ${`Received from shipment ${updated.shipmentNumber}` +
                (item.lot_number ? ` (Lot: ${item.lot_number})` : "") +
                (item.expiration_date ? ` (Expires: ${item.expiration_date.toISOString().split("T")[0]})` : "")}::text,
              CURRENT_TIMESTAMP,
              ${userId}::uuid,
              ${"shipment"}::text,
              ${id}::uuid,
              ${updated.locationId || "00000000-0000-0000-0000-000000000000"}::uuid,
              ${"shipment_receipt"}::text
            )
          `;

          // Update inventory item quantity on hand
          await database.$executeRaw`
            UPDATE "tenant_inventory"."inventory_items"
            SET "quantity_on_hand" = "quantity_on_hand" + ${goodQuantity}::numeric,
                "updated_at" = CURRENT_TIMESTAMP
            WHERE "tenant_id" = ${tenantId}::uuid
              AND "id" = ${item.item_id}::uuid
              AND "deleted_at" IS NULL
          `;
        }
      } catch (inventoryError) {
        console.error("Failed to update inventory for delivered shipment:", inventoryError);
        // Continue with the response even if inventory update fails
      }
    }

    return NextResponse.json(mappedShipment);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update shipment status:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
