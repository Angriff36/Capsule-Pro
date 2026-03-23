import { NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/lib/auth";
import { prisma } from "@repo/database";

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { transferId, reason } = body;

    if (!transferId) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }

    const transfer = await prisma.inventoryTransfer.findFirst({
      where: { tenantId, id: transferId, deletedAt: null },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    if (!["pending", "approved"].includes(transfer.status)) {
      return NextResponse.json(
        { error: "Only pending or approved transfers can be cancelled" },
        { status: 400 }
      );
    }

    const updatedTransfer = await prisma.inventoryTransfer.update({
      where: { tenantId_id: { tenantId, id: transferId } },
      data: {
        status: "cancelled",
        notes: reason
          ? `${transfer.notes || ""}\nCancellation reason: ${reason}`.trim()
          : transfer.notes,
      },
    });

    return NextResponse.json({ success: true, transfer: updatedTransfer });
  } catch (error) {
    console.error("Error cancelling inventory transfer:", error);
    return NextResponse.json(
      { error: "Failed to cancel inventory transfer" },
      { status: 500 }
    );
  }
}
