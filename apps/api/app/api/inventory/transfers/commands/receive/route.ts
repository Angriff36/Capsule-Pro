import { NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/lib/auth";
import { prisma } from "@repo/database";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { transferId, receivedItems } = body;

    if (!transferId) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }

    const transfer = await prisma.inventoryTransfer.findFirst({
      where: { tenantId, id: transferId, deletedAt: null },
      include: {
        tenant: true,
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    if (transfer.status !== "in_transit") {
      return NextResponse.json(
        { error: "Only in-transit transfers can be received" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Update transfer status
      await tx.inventoryTransfer.update({
        where: { tenantId_id: { tenantId, id: transferId } },
        data: {
          status: "completed",
          receivedAt: new Date(),
        },
      });

      // Update received quantities and create inventory transactions
      for (const receivedItem of receivedItems || []) {
        const { itemId, receivedQuantity } = receivedItem;

        // Update transfer item
        await tx.inventoryTransferItem.updateMany({
          where: { tenantId, transferId, itemId },
          data: { receivedQuantity: new Decimal(receivedQuantity) },
        });

        // Create inventory transaction (receipt)
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            itemId,
            transactionType: "transfer_in",
            quantity: new Decimal(receivedQuantity),
            unit_cost: new Decimal(0),
            reference: transfer.transferNumber,
            referenceType: "inventory_transfer",
            referenceId: transferId,
            storage_location_id: transfer.toLocationId,
            notes: `Received from transfer ${transfer.transferNumber}`,
          },
        });

        // Create inventory transaction (removal from source)
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            itemId,
            transactionType: "transfer_out",
            quantity: new Decimal(-receivedQuantity),
            unit_cost: new Decimal(0),
            reference: transfer.transferNumber,
            referenceType: "inventory_transfer",
            referenceId: transferId,
            storage_location_id: transfer.fromLocationId,
            notes: `Transferred via ${transfer.transferNumber}`,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error receiving inventory transfer:", error);
    return NextResponse.json(
      { error: "Failed to receive inventory transfer" },
      { status: 500 }
    );
  }
}
