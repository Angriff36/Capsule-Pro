/**
 * Individual Shipment API Endpoints
 *
 * GET    /api/shipments/[id]  - Get a single shipment by ID
 * PUT    /api/shipments/[id]  - Update a shipment
 * DELETE /api/shipments/[id]  - Soft delete a shipment
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { validateUpdateShipmentRequest } from "../validation";

export async function GET(
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
    const shipment = await database.shipment.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
          include: {
            item: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ message: "Shipment not found" }, { status: 404 });
    }

    const mappedShipment = {
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
      items: shipment.items.map((item) => ({
        id: item.id,
        tenant_id: item.tenantId,
        shipment_id: item.shipmentId,
        item_id: item.itemId,
        quantity_shipped: Number(item.quantityShipped),
        quantity_received: Number(item.quantityReceived),
        quantity_damaged: Number(item.quantityDamaged),
        unit_id: item.unitId,
        unit_cost: item.unitCost ? Number(item.unitCost) : null,
        total_cost: Number(item.totalCost),
        condition: item.condition,
        condition_notes: item.conditionNotes,
        lot_number: item.lotNumber,
        expiration_date: item.expirationDate,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt,
        item: item.item ? {
          id: item.item.id,
          name: item.item.name,
          item_number: item.item.item_number,
        } : null,
      })),
    };

    return NextResponse.json(mappedShipment);
  } catch (error) {
    console.error("Failed to get shipment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
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
    validateUpdateShipmentRequest(body);

    // Verify shipment exists and belongs to tenant
    const existing = await database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ message: "Shipment not found" }, { status: 404 });
    }

    // Check shipment number uniqueness if changed
    if (body.shipment_number && body.shipment_number !== existing.shipmentNumber) {
      const duplicate = await database.shipment.findFirst({
        where: {
          tenantId,
          shipmentNumber: body.shipment_number,
          deletedAt: null,
          id: { not: id },
        },
      });
      if (duplicate) {
        return NextResponse.json({ message: "Shipment number already exists" }, { status: 409 });
      }
    }

    // Build update data
    const updateData: any = {};
    if (body.shipment_number !== undefined) updateData.shipmentNumber = body.shipment_number;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.event_id !== undefined) updateData.eventId = body.event_id;
    if (body.supplier_id !== undefined) updateData.supplierId = body.supplier_id;
    if (body.location_id !== undefined) updateData.locationId = body.location_id;
    if (body.scheduled_date !== undefined) updateData.scheduledDate = body.scheduled_date ? new Date(body.scheduled_date) : null;
    if (body.shipped_date !== undefined) updateData.shippedDate = body.shipped_date ? new Date(body.shipped_date) : null;
    if (body.estimated_delivery_date !== undefined) updateData.estimatedDeliveryDate = body.estimated_delivery_date ? new Date(body.estimated_delivery_date) : null;
    if (body.actual_delivery_date !== undefined) updateData.actualDeliveryDate = body.actual_delivery_date ? new Date(body.actual_delivery_date) : null;
    if (body.shipping_cost !== undefined) updateData.shippingCost = body.shipping_cost ? body.shipping_cost.toString() : null;
    if (body.total_value !== undefined) updateData.totalValue = body.total_value ? body.total_value.toString() : null;
    if (body.tracking_number !== undefined) updateData.trackingNumber = body.tracking_number;
    if (body.carrier !== undefined) updateData.carrier = body.carrier;
    if (body.shipping_method !== undefined) updateData.shippingMethod = body.shipping_method;
    if (body.delivered_by !== undefined) updateData.deliveredBy = body.delivered_by;
    if (body.received_by !== undefined) updateData.receivedBy = body.received_by;
    if (body.signature !== undefined) updateData.signature = body.signature;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.internal_notes !== undefined) updateData.internalNotes = body.internal_notes;
    if (body.reference !== undefined) updateData.reference = body.reference;

    // Use raw SQL for composite key update
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

    return NextResponse.json(mappedShipment);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update shipment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    // Verify shipment exists and belongs to tenant
    const existing = await database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ message: "Shipment not found" }, { status: 404 });
    }

    // Prevent deletion of non-draft shipments
    if (existing.status !== "draft" && existing.status !== "cancelled") {
      return NextResponse.json(
        { message: "Cannot delete shipment with status: " + existing.status },
        { status: 400 }
      );
    }

    // Soft delete using raw SQL for composite key
    await database.$executeRaw`
      UPDATE "tenant_inventory"."shipments"
      SET "deleted_at" = CURRENT_TIMESTAMP
      WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${id}::uuid
    `;

    return NextResponse.json({ message: "Shipment deleted" }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete shipment:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
