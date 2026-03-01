import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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
  return executeManifestCommand(request, {
    entityName: "WasteEntry",
    commandName: "update",
    params: { id },
    transformBody: (body, ctx) => ({
      ...body,
      id,
      tenantId: ctx.tenantId,
    }),
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
  return executeManifestCommand(request, {
    entityName: "WasteEntry",
    commandName: "softDelete",
    params: { id },
    transformBody: (_body, ctx) => ({
      id,
      tenantId: ctx.tenantId,
    }),
  });
}
