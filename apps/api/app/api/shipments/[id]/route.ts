/**
 * Individual Shipment API Endpoints
 *
 * GET    /api/shipments/[id]  - Get a single shipment by ID
 * PUT    /api/shipments/[id]  - Update a shipment
 * DELETE /api/shipments/[id]  - Soft delete a shipment
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { message: "Shipment not found" },
        { status: 404 }
      );
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
      shipping_cost: shipment.shippingCost
        ? Number(shipment.shippingCost)
        : null,
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
        item: item.item
          ? {
              id: item.item.id,
              name: item.item.name,
              item_number: item.item.item_number,
            }
          : null,
      })),
    };

    return NextResponse.json(mappedShipment);
  } catch (error) {
    console.error("Failed to get shipment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "Shipment",
    commandName: "update",
    params: { id },
    transformBody: (body, ctx) => ({
      ...body,
      id,
      tenantId: ctx.tenantId,
    }),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "Shipment",
    commandName: "cancel",
    params: { id },
    transformBody: (_body, ctx) => ({
      id,
      tenantId: ctx.tenantId,
    }),
  });
}
