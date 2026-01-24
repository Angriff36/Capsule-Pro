Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/prep-lists/[id]
 * Get a prep list by ID with all items
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
    // Get the prep list header
    const prepListResult = await database_1.database.$queryRaw`
      SELECT
        pl.id,
        pl.name,
        pl.event_id AS event_id,
        e.title AS event_title,
        e.event_date,
        pl.batch_multiplier,
        pl.dietary_restrictions,
        pl.status,
        pl.total_items,
        pl.total_estimated_time,
        pl.notes,
        pl.generated_at,
        pl.finalized_at,
        pl.created_at,
        pl.updated_at
      FROM tenant_kitchen.prep_lists pl
      JOIN tenant_events.events e
        ON e.tenant_id = pl.tenant_id
        AND e.id = pl.event_id
        AND e.deleted_at IS NULL
      WHERE pl.tenant_id = ${tenantId}
        AND pl.id = ${id}
        AND pl.deleted_at IS NULL
    `;
    if (prepListResult.length === 0) {
      return server_2.NextResponse.json(
        { error: "Prep list not found" },
        { status: 404 }
      );
    }
    const prepList = prepListResult[0];
    // Get all prep list items grouped by station
    const itemsResult = await database_1.database.$queryRaw`
      SELECT
        id,
        station_id AS station_id,
        station_name,
        ingredient_id AS ingredient_id,
        ingredient_name,
        category,
        base_quantity,
        base_unit,
        scaled_quantity,
        scaled_unit,
        is_optional,
        preparation_notes,
        allergens,
        dietary_substitutions,
        dish_id,
        dish_name,
        recipe_version_id,
        sort_order,
        is_completed,
        completed_at,
        completed_by
      FROM tenant_kitchen.prep_list_items
      WHERE tenant_id = ${tenantId}
        AND prep_list_id = ${id}
        AND deleted_at IS NULL
      ORDER BY station_name, sort_order
    `;
    // Group items by station
    const stationsMap = new Map();
    for (const item of itemsResult) {
      const stationId = item.stationId;
      if (!stationsMap.has(stationId)) {
        stationsMap.set(stationId, {
          stationId,
          stationName: item.stationName,
          items: [],
        });
      }
      stationsMap.get(stationId).items.push(item);
    }
    const stations = Array.from(stationsMap.values());
    return server_2.NextResponse.json({
      ...prepList,
      stations,
    });
  } catch (error) {
    console.error("Error getting prep list:", error);
    return server_2.NextResponse.json(
      { error: "Failed to get prep list" },
      { status: 500 }
    );
  }
}
/**
 * PATCH /api/kitchen/prep-lists/[id]
 * Update a prep list
 */
async function PATCH(request, { params }) {
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
    const body = await request.json();
    const { name, status, notes, batchMultiplier, dietaryRestrictions } = body;
    const updates = [];
    const values = [];
    if (name !== undefined) {
      updates.push(`name = $${values.length + 1}`);
      values.push(name);
    }
    if (status !== undefined) {
      updates.push(`status = $${values.length + 1}`);
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${values.length + 1}`);
      values.push(notes);
    }
    if (batchMultiplier !== undefined) {
      updates.push(`batch_multiplier = $${values.length + 1}`);
      values.push(batchMultiplier);
    }
    if (dietaryRestrictions !== undefined) {
      updates.push(`dietary_restrictions = $${values.length + 1}`);
      values.push(dietaryRestrictions);
    }
    if (updates.length === 0) {
      return server_2.NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }
    values.push(tenantId, id);
    // Build dynamic SQL for updates
    const updateClause = updates
      .map((u, i) => u.replace(/\$\d+/, `$${i + 1}`))
      .join(", ");
    const sql = `UPDATE tenant_kitchen.prep_lists SET ${updateClause} WHERE tenant_id = $${updates.length + 1} AND id = $${updates.length + 2} AND deleted_at IS NULL`;
    await database_1.database.$queryRawUnsafe(sql, values);
    return server_2.NextResponse.json({
      message: "Prep list updated successfully",
    });
  } catch (error) {
    console.error("Error updating prep list:", error);
    return server_2.NextResponse.json(
      { error: "Failed to update prep list" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/kitchen/prep-lists/[id]
 * Delete a prep list (soft delete)
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
    // Soft delete the prep list (items will be cascade deleted via FK or handled separately)
    await database_1.database.$executeRaw`
      UPDATE tenant_kitchen.prep_lists
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
    `;
    // Also soft delete the items
    await database_1.database.$executeRaw`
      UPDATE tenant_kitchen.prep_list_items
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND prep_list_id = ${id}
        AND deleted_at IS NULL
    `;
    return server_2.NextResponse.json({
      message: "Prep list deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting prep list:", error);
    return server_2.NextResponse.json(
      { error: "Failed to delete prep list" },
      { status: 500 }
    );
  }
}
