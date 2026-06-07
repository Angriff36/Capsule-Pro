import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface WasteEntryDetail {
  id: string;
  tenant_id: string;
  inventory_item_id: string;
  quantity: string;
  unit_id: number | null;
  reason_id: number;
  notes: string | null;
  event_id: string | null;
  logged_by: string;
  logged_at: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  item_name: string | null;
  item_category: string | null;
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
        ii.name AS item_name,
        ii.category AS item_category,
        e_usr.first_name || ' ' || e_usr.last_name AS user_name,
        ev.title AS event_name
      FROM tenant_kitchen.waste_entries we
      JOIN tenant_inventory.inventory_items ii ON we.inventory_item_id = ii.id
      LEFT JOIN tenant_staff.employees e_usr ON we.logged_by = e_usr.id
      LEFT JOIN tenant_events.events ev ON we.event_id = ev.id
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
    captureException(error);
    return NextResponse.json(
      { error: "Failed to get waste entry" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/kitchen/waste/entries/[id]
 * Update a waste entry via manifest runtime
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

  return runManifestCommand({
    entity: "WasteEntry",
    command: "update",
    body: {
      ...rawBody,
      id,
      tenantId: user.tenantId,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/kitchen/waste/entries/[id]
 * Soft delete a waste entry via manifest runtime
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);

  return runManifestCommand({
    entity: "WasteEntry",
    command: "softDelete",
    body: {
      id,
      tenantId: user.tenantId,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
