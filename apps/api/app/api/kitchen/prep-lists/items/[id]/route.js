Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
exports.DELETE = DELETE;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * PATCH /api/kitchen/prep-lists/items/[id]
 * Update a prep list item (quantities, completion, etc.)
 */
async function PATCH(request, { params }) {
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
    const { scaledQuantity, isCompleted, preparationNotes, isOptional } = body;
    const updates = [];
    const values = [];
    if (scaledQuantity !== undefined) {
      updates.push(`scaled_quantity = $${values.length + 1}`);
      values.push(scaledQuantity);
    }
    if (isCompleted !== undefined) {
      updates.push(`is_completed = $${values.length + 1}`);
      values.push(isCompleted);
      if (isCompleted) {
        updates.push(`completed_at = $${values.length + 1}`);
        values.push(new Date());
        updates.push(`completed_by = $${values.length + 1}`);
        values.push(userId);
      } else {
        updates.push("completed_at = NULL");
        updates.push("completed_by = NULL");
      }
    }
    if (preparationNotes !== undefined) {
      updates.push(`preparation_notes = $${values.length + 1}`);
      values.push(preparationNotes);
    }
    if (isOptional !== undefined) {
      updates.push(`is_optional = $${values.length + 1}`);
      values.push(isOptional);
    }
    if (updates.length === 0) {
      return server_2.NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }
    // Build dynamic SQL for updates
    const updateClause = updates
      .map((u, i) => u.replace(/\$\d+/, `$${i + 1}`))
      .join(", ");
    const valuesArray = [...values, tenantId, id];
    const sql = `UPDATE tenant_kitchen.prep_list_items SET ${updateClause} WHERE tenant_id = $${updates.length + 1} AND id = $${updates.length + 2} AND deleted_at IS NULL`;
    await database_1.database.$queryRawUnsafe(sql, valuesArray);
    return server_2.NextResponse.json({
      message: "Prep list item updated successfully",
    });
  } catch (error) {
    console.error("Error updating prep list item:", error);
    return server_2.NextResponse.json(
      { error: "Failed to update prep list item" },
      { status: 500 }
    );
  }
}
/**
 * DELETE /api/kitchen/prep-lists/items/[id]
 * Delete a prep list item (soft delete)
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
      UPDATE tenant_kitchen.prep_list_items
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
    `;
    return server_2.NextResponse.json({
      message: "Prep list item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting prep list item:", error);
    return server_2.NextResponse.json(
      { error: "Failed to delete prep list item" },
      { status: 500 }
    );
  }
}
