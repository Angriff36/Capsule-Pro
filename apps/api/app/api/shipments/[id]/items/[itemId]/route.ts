/**
 * Individual Shipment Item API Endpoints
 *
 * PUT    /api/shipments/[id]/items/[itemId]  - Update a shipment item
 * DELETE /api/shipments/[id]/items/[itemId]  - Delete a shipment item
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { updateShipmentTotals } from "./helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const result = await runManifestCommand({
    entity: "ShipmentItem",
    command: "update",
    body: {
      ...rawBody,
      id: itemId,
      tenantId: user.tenantId,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  // Recalculate parent shipment totals after successful update
  if (result.status >= 200 && result.status < 300) {
    await updateShipmentTotals(user.tenantId, id).catch((err) => {
      log.error("Failed to update shipment totals after item update:", err);
    });
  }

  return result;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const user = await resolveCurrentUser(request);

  // Cross-entity guard: prevent deleting items from shipped/delivered shipments.
  // This involves checking the parent Shipment's status, which is not expressible
  // as a ShipmentItem-level manifest guard.
  const shipment = await database.shipment.findFirst({
    where: { tenantId: user.tenantId, id, deletedAt: null },
    select: { status: true },
  });

  if (shipment && ["in_transit", "delivered"].includes(shipment.status)) {
    return NextResponse.json(
      {
        message: `Cannot modify items for shipments with status: ${shipment.status}`,
      },
      { status: 400 }
    );
  }

  const result = await runManifestCommand({
    entity: "ShipmentItem",
    command: "softDelete",
    body: {
      id: itemId,
      tenantId: user.tenantId,
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  // Recalculate parent shipment totals after successful delete
  if (result.status >= 200 && result.status < 300) {
    await updateShipmentTotals(user.tenantId, id).catch((err) => {
      log.error("Failed to update shipment totals after item delete:", err);
    });
  }

  return result;
}
