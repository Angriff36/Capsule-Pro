Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/waste/entries/[id]
 * Get a waste entry by ID
 */
async function GET(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id } = await params;
    const wasteEntry = await database_1.database.$queryRaw`
      SELECT
        we.*,
        i.name AS ingredient_name,
        i.category AS ingredient_category,
        u.name AS user_name,
        e.title AS event_name
      FROM tenant_kitchen.waste_entries we
      JOIN tenant_inventory.ingredients i ON we.ingredient_id = i.id
      LEFT JOIN platform.users u ON we.created_by = u.id
      LEFT JOIN tenant_events.events e ON we.event_id = e.id
      WHERE we.tenant_id = ${tenantId}
        AND we.id = ${id}
        AND we.deleted_at IS NULL
    `;
    if (wasteEntry.length === 0) {
      return server_2.NextResponse.json(
        { error: "Waste entry not found" },
        { status: 404 }
      );
    }
    return server_2.NextResponse.json(wasteEntry[0]);
  } catch (error) {
    console.error("Error getting waste entry:", error);
    return server_2.NextResponse.json(
      { error: "Failed to get waste entry" },
      { status: 500 }
    );
  }
}
/**
 * PUT /api/kitchen/waste/entries/[id]
 * Update a waste entry
 */
async function PUT(request, { params }) {
  try {
    const { orgId, userId } = await (0, server_1.auth)();
    if (!(orgId && userId)) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id } = await params;
    const body = await request.json();
    const { ingredientId, quantity, unit, reason, notes, eventId } = body;
    // Validate required fields
    if (!(ingredientId && quantity && unit && reason)) {
      return server_2.NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    // Check if the entry exists and belongs to the tenant
    const existingEntry = await database_1.database.$queryRaw`
      SELECT id FROM tenant_kitchen.waste_entries
      WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
    `;
    if (existingEntry.length === 0) {
      return server_2.NextResponse.json(
        { error: "Waste entry not found" },
        { status: 404 }
      );
    }
    // Update the waste entry
    await database_1.database.$queryRaw`
      UPDATE tenant_kitchen.waste_entries
      SET
        ingredient_id = ${ingredientId},
        quantity = ${quantity},
        unit = ${unit},
        reason = ${reason},
        notes = ${notes || null},
        event_id = ${eventId || null},
        updated_at = NOW(),
        updated_by = ${userId}
      WHERE tenant_id = ${tenantId} AND id = ${id}
    `;
    return server_2.NextResponse.json({
      message: "Waste entry updated successfully",
    });
  } catch (error) {
    console.error("Error updating waste entry:", error);
    return server_2.NextResponse.json(
      { error: "Failed to update waste entry" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/kitchen/waste/entries/[id]
 * Delete a waste entry (soft delete)
 */
async function DELETE(request, { params }) {
  try {
    const { orgId } = await (0, server_1.auth)();
    if (!orgId) {
      return server_2.NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
    const { id } = await params;
    await database_1.database.$executeRaw`
      UPDATE tenant_kitchen.waste_entries
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
    `;
    return server_2.NextResponse.json({
      message: "Waste entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting waste entry:", error);
    return server_2.NextResponse.json(
      { error: "Failed to delete waste entry" },
      { status: 500 }
    );
  }
}
