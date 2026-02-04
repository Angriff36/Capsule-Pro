import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface WasteEntryDetail {
  id: string;
  tenant_id: string;
  ingredient_id: string;
  quantity: string;
  unit: string;
  reason: string;
  notes: string | null;
  event_id: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  ingredient_name: string | null;
  ingredient_category: string | null;
  user_name: string | null;
  event_name: string | null;
}

/**
 * GET /api/kitchen/waste/entries/[id]
 * Get a waste entry by ID
 */
export async function GET(
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

    const wasteEntry = await database.$queryRaw<WasteEntryDetail[]>`
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
      return NextResponse.json(
        { error: "Waste entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(wasteEntry[0]);
  } catch (error) {
    console.error("Error getting waste entry:", error);
    return NextResponse.json(
      { error: "Failed to get waste entry" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/kitchen/waste/entries/[id]
 * Update a waste entry
 */
export async function PUT(
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
    const { ingredientId, quantity, unit, reason, notes, eventId } = body;

    // Validate required fields
    if (!(ingredientId && quantity && unit && reason)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the entry exists and belongs to the tenant
    const existingEntry = await database.$queryRaw<{ id: string }[]>`
      SELECT id FROM tenant_kitchen.waste_entries
      WHERE tenant_id = ${tenantId} AND id = ${id} AND deleted_at IS NULL
    `;

    if (existingEntry.length === 0) {
      return NextResponse.json(
        { error: "Waste entry not found" },
        { status: 404 }
      );
    }

    // Update the waste entry
    await database.$queryRaw`
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

    return NextResponse.json({
      message: "Waste entry updated successfully",
    });
  } catch (error) {
    console.error("Error updating waste entry:", error);
    return NextResponse.json(
      { error: "Failed to update waste entry" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/kitchen/waste/entries/[id]
 * Delete a waste entry (soft delete)
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
      UPDATE tenant_kitchen.waste_entries
      SET deleted_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${id}
        AND deleted_at IS NULL
    `;

    return NextResponse.json({
      message: "Waste entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting waste entry:", error);
    return NextResponse.json(
      { error: "Failed to delete waste entry" },
      { status: 500 }
    );
  }
}
