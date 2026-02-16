/**
 * Shipment Items API Endpoints
 *
 * GET    /api/shipments/[id]/items  - List items for a shipment
 * POST   /api/shipments/[id]/items  - Add items to a shipment (manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  console.log("[ShipmentItem/POST] Delegating to manifest create command", {
    shipmentId: id,
  });
  return executeManifestCommand(request, {
    entityName: "ShipmentItem",
    commandName: "create",
    params: { id },
    transformBody: (body) => ({ ...body, shipmentId: id }),
  });
}
