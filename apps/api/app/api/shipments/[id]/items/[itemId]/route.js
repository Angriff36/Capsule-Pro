/**
 * Individual Shipment Item API Endpoints
 *
 * PUT    /api/shipments/[id]/items/[itemId]  - Update a shipment item
 * DELETE /api/shipments/[id]/items/[itemId]  - Delete a shipment item
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const invariant_1 = require("@/app/lib/invariant");
const tenant_1 = require("@/app/lib/tenant");
function validateShipmentItemUpdate(item) {
  if (item.quantity_shipped !== undefined && item.quantity_shipped <= 0) {
    throw new invariant_1.InvariantError(
      "quantity_shipped must be greater than 0"
    );
  }
  if (item.quantity_received !== undefined && item.quantity_received < 0) {
    throw new invariant_1.InvariantError(
      "quantity_received cannot be negative"
    );
  }
  if (item.quantity_damaged !== undefined && item.quantity_damaged < 0) {
    throw new invariant_1.InvariantError("quantity_damaged cannot be negative");
  }
}
async function PUT(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const { id, itemId } = await params;
    const body = await request.json();
    validateShipmentItemUpdate(body);
    // Verify item exists and belongs to shipment
    const existing = await database_1.database.shipmentItem.findFirst({
      where: {
        tenantId,
        id: itemId,
        shipmentId: id,
        deletedAt: null,
      },
    });
    if (!existing) {
      return server_2.NextResponse.json(
        { message: "Shipment item not found" },
        { status: 404 }
      );
    }
    // Build update data
    const updateData = {};
    if (body.quantity_shipped !== undefined)
      updateData.quantityShipped = body.quantity_shipped.toString();
    if (body.quantity_received !== undefined)
      updateData.quantityReceived = body.quantity_received.toString();
    if (body.quantity_damaged !== undefined)
      updateData.quantityDamaged = body.quantity_damaged.toString();
    if (body.unit_id !== undefined) updateData.unitId = body.unit_id;
    if (body.unit_cost !== undefined)
      updateData.unitCost = body.unit_cost ? body.unit_cost.toString() : null;
    if (body.condition !== undefined) updateData.condition = body.condition;
    if (body.condition_notes !== undefined)
      updateData.conditionNotes = body.condition_notes;
    if (body.lot_number !== undefined) updateData.lotNumber = body.lot_number;
    if (body.expiration_date !== undefined)
      updateData.expirationDate = body.expiration_date
        ? new Date(body.expiration_date)
        : null;
    // Recalculate total cost if quantities or unit cost changed
    const newQuantityShipped =
      body.quantity_shipped ?? Number(existing.quantityShipped);
    const newUnitCost =
      body.unit_cost ?? (existing.unitCost ? Number(existing.unitCost) : 0);
    updateData.totalCost = (newQuantityShipped * newUnitCost).toString();
    // Use raw SQL for composite key update
    await database_1.database.$executeRaw`
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
    // Update shipment totals
    const allItems = await database_1.database.shipmentItem.findMany({
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
    await database_1.database.$executeRaw`
      UPDATE "tenant_inventory"."shipments"
      SET "total_items" = ${totalItems}::integer,
          "total_value" = ${totalValue}::numeric,
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${id}::uuid
    `;
    const updated = await database_1.database.shipmentItem.findFirst({
      where: { tenantId, id: itemId, deletedAt: null },
      include: { item: true },
    });
    if (!updated) {
      return server_2.NextResponse.json(
        { message: "Shipment item not found after update" },
        { status: 404 }
      );
    }
    const mappedItem = {
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
    return server_2.NextResponse.json(mappedItem);
  } catch (error) {
    if (error instanceof invariant_1.InvariantError) {
      return server_2.NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }
    console.error("Failed to update shipment item:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
async function DELETE(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    if (!tenantId) {
      return server_2.NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    const { id, itemId } = await params;
    // Verify item exists and belongs to shipment
    const existing = await database_1.database.shipmentItem.findFirst({
      where: {
        tenantId,
        id: itemId,
        shipmentId: id,
        deletedAt: null,
      },
    });
    if (!existing) {
      return server_2.NextResponse.json(
        { message: "Shipment item not found" },
        { status: 404 }
      );
    }
    // Prevent deleting items from shipped/delivered shipments
    const shipment = await database_1.database.shipment.findFirst({
      where: { tenantId, id, deletedAt: null },
      select: { status: true },
    });
    if (shipment && ["in_transit", "delivered"].includes(shipment.status)) {
      return server_2.NextResponse.json(
        {
          message:
            "Cannot modify items for shipments with status: " + shipment.status,
        },
        { status: 400 }
      );
    }
    // Soft delete using raw SQL for composite key
    await database_1.database.$executeRaw`
      UPDATE "tenant_inventory"."shipment_items"
      SET "deleted_at" = CURRENT_TIMESTAMP
      WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${itemId}::uuid
    `;
    // Update shipment totals
    const allItems = await database_1.database.shipmentItem.findMany({
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
    await database_1.database.$executeRaw`
      UPDATE "tenant_inventory"."shipments"
      SET "total_items" = ${totalItems}::integer,
          "total_value" = ${totalValue}::numeric,
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "tenant_id" = ${tenantId}::uuid AND "id" = ${id}::uuid
    `;
    return server_2.NextResponse.json(
      { message: "Shipment item deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete shipment item:", error);
    return server_2.NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
