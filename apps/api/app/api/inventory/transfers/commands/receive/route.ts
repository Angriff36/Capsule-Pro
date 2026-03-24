import { NextRequest, NextResponse } from "next/server";
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database, Prisma } from "@repo/database";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body = await request.json();
    const { transferId, receivedItems } = body;

    if (!transferId) {
      return NextResponse.json(
        { error: "Transfer ID is required" },
        { status: 400 }
      );
    }

    const transfer = await database.inventoryTransfer.findFirst({
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

    await database.$transaction(async (tx: Prisma.TransactionClient) => {
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
          data: { receivedQuantity },
        });

        // Create inventory transaction (receipt)
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            itemId,
            transactionType: "transfer_in",
            quantity: receivedQuantity,
            unit_cost: 0,
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
            quantity: -receivedQuantity,
            unit_cost: 0,
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
