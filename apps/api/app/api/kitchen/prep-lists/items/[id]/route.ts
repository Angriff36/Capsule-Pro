import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * PATCH /api/kitchen/prep-lists/items/[id]
 * Update a prep list item (quantities, completion, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    const body = await request.json();
    const { scaledQuantity, isCompleted, preparationNotes, isOptional } = body;

    const updates: string[] = [];
    const values: any[] = [];

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
      return NextResponse.json(
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

    await database.$queryRawUnsafe(sql, valuesArray);

    return NextResponse.json({
      message: "Prep list item updated successfully",
    });
  } catch (error) {
    console.error("Error updating prep list item:", error);
    return NextResponse.json(
      { error: "Failed to update prep list item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kitchen/prep-lists/items/[id]
 * Delete a prep list item (soft delete)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;

    await database.$executeRaw`
      UPDATE tenant_kitchen.prep_list_items
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
    `;

    return NextResponse.json({
      message: "Prep list item deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting prep list item:", error);
    return NextResponse.json(
      { error: "Failed to delete prep list item" },
      { status: 500 }
    );
  }
}
