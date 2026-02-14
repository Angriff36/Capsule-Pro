/**
 * Individual Shipment Item API Endpoints
 *
 * PUT    /api/shipments/[id]/items/[itemId]  - Update a shipment item
 * DELETE /api/shipments/[id]/items/[itemId]  - Delete a shipment item
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { ShipmentItemUpdateInput } from "./helpers";
import {
  buildShipmentItemUpdateData,
  fetchExistingShipmentItem,
  fetchUpdatedShipmentItem,
  updateShipmentItemRaw,
  updateShipmentTotals,
  validateShipmentItemUpdate,
} from "./helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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

    const { id, itemId } = await params;
    const body = (await request.json()) as ShipmentItemUpdateInput;
    validateShipmentItemUpdate(body);

    // Verify item exists and belongs to shipment
    const existing = await fetchExistingShipmentItem(tenantId, itemId, id);
    if (!existing) {
      return NextResponse.json(
        { message: "Shipment item not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData = buildShipmentItemUpdateData(body, existing);

    // Use raw SQL for composite key update
    await updateShipmentItemRaw(tenantId, itemId, updateData);

    // Update shipment totals
    await updateShipmentTotals(tenantId, id);

    // Fetch and format updated item
    const updated = await fetchUpdatedShipmentItem(tenantId, itemId);
    if (!updated) {
      return NextResponse.json(
        { message: "Shipment item not found after update" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update shipment item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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

    const { id, itemId } = await params;

    // Verify item exists and belongs to shipment
    const existing = await database.shipmentItem.findFirst({
      where: {
        tenantId,
        id: itemId,
        shipmentId: id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Shipment item not found" },
        { status: 404 }
      );
    }

    // Prevent deleting items from shipped/delivered shipments
    const shipment = await database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
      select: { status: true },
    });

    if (shipment && ["in_transit", "delivered"].includes(shipment.status)) {
      return NextResponse.json(
        {
          message: `Cannot modify items for shipments with status: ${shipment.status}`,
        },
        { status: 400 }
      );
    }

    // Soft delete using raw SQL for composite key
    await database.$executeRaw`
      UPDATE "tenant_inventory"."shipment_items"
      SET "deleted_at" = CURRENT_TIMESTAMP
      WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${itemId}::uuid
    `;

    // Update shipment totals
    await updateShipmentTotals(tenantId, id);

    return NextResponse.json(
      { message: "Shipment item deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete shipment item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
