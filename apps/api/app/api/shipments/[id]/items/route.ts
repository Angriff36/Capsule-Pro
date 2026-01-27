/**
 * Shipment Items API Endpoints
 *
 * GET    /api/shipments/[id]/items  - List items for a shipment
 * POST   /api/shipments/[id]/items  - Add items to a shipment
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

function validateShipmentItemData(item: any) {
  if (!item.item_id) {
    throw new InvariantError("item_id is required");
  }
  if (!item.quantity_shipped || item.quantity_shipped <= 0) {
    throw new InvariantError("quantity_shipped must be greater than 0");
  }
}

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

    // Verify shipment exists
    const shipment = await database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!shipment) {
      return NextResponse.json(
        { message: "Shipment not found" },
        { status: 404 }
      );
    }

    const items = await database.shipmentItem.findMany({
      where: {
        tenantId,
        shipmentId: id,
        deletedAt: null,
      },
      include: {
        item: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const mappedItems = items.map((item) => ({
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
    }));

    return NextResponse.json({ data: mappedItems });
  } catch (error) {
    console.error("Failed to list shipment items:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
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
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verify shipment exists
    const shipment = await database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!shipment) {
      return NextResponse.json(
        { message: "Shipment not found" },
        { status: 404 }
      );
    }

    const items = Array.isArray(body) ? body : [body];
    const createdItems = [];

    for (const item of items) {
      validateShipmentItemData(item);

      // Verify inventory item exists
      const inventoryItem = await database.inventoryItem.findFirst({
        where: { tenantId, id: item.item_id, deletedAt: null },
      });

      if (!inventoryItem) {
        throw new InvariantError(`Inventory item not found: ${item.item_id}`);
      }

      // Calculate total cost
      const unitCost = item.unit_cost || inventoryItem.unitCost;
      const quantityShipped = item.quantity_shipped;
      const totalCost = (unitCost || 0) * quantityShipped;

      const created = await database.shipmentItem.create({
        data: {
          tenantId,
          shipmentId: id,
          itemId: item.item_id,
          quantityShipped: quantityShipped.toString(),
          quantityReceived: item.quantity_received?.toString() || "0",
          quantityDamaged: item.quantity_damaged?.toString() || "0",
          unitId: item.unit_id,
          unitCost: unitCost?.toString(),
          totalCost: totalCost.toString(),
          condition: item.condition || "good",
          conditionNotes: item.condition_notes,
          lotNumber: item.lot_number,
          expirationDate: item.expiration_date
            ? new Date(item.expiration_date)
            : null,
        },
      });

      // Update shipment total items and value
      const allItems = await database.shipmentItem.findMany({
        where: { tenantId, shipmentId: id, deletedAt: null },
      });

      const totalItems = allItems.reduce(
        (sum, i) => sum + Number(i.quantityShipped),
        0
      );
      const totalValue = allItems.reduce(
        (sum, i) => sum + Number(i.totalCost),
        0
      );

      await database.$executeRaw`
        UPDATE "tenant_inventory"."shipments"
        SET "total_items" = ${totalItems}::integer,
            "total_value" = ${totalValue}::numeric,
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${id}::uuid
      `;

      createdItems.push({
        id: created.id,
        tenant_id: created.tenantId,
        shipment_id: created.shipmentId,
        item_id: created.itemId,
        quantity_shipped: Number(created.quantityShipped),
        quantity_received: Number(created.quantityReceived),
        quantity_damaged: Number(created.quantityDamaged),
        unit_id: created.unitId,
        unit_cost: created.unitCost ? Number(created.unitCost) : null,
        total_cost: Number(created.totalCost),
        condition: created.condition,
        condition_notes: created.conditionNotes,
        lot_number: created.lotNumber,
        expiration_date: created.expirationDate,
        created_at: created.createdAt,
        updated_at: created.updatedAt,
      });
    }

    return NextResponse.json({ data: createdItems }, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create shipment items:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
