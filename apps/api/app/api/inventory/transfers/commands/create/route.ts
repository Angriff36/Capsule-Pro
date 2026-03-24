import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { database, Prisma } from "@repo/database";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fromLocationId, toLocationId, items, notes } = body;

    if (!fromLocationId || !toLocationId) {
      return NextResponse.json(
        { error: "From and to locations are required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Generate transfer number
    const transferCount = await database.inventoryTransfer.count({
      where: { tenantId: currentUser.tenantId },
    });
    const transferNumber = `TRF-${String(transferCount + 1).padStart(6, "0")}`;

    // Create transfer and items in a transaction
    const transfer = await database.$transaction(async (tx: Prisma.TransactionClient) => {
      const newTransfer = await tx.inventoryTransfer.create({
        data: {
          tenantId: currentUser.tenantId,
          transferNumber,
          fromLocationId,
          toLocationId,
          notes,
          status: "pending",
          requestedBy: currentUser.id,
        },
      });

      // Create transfer items
      for (const item of items) {
        await tx.inventoryTransferItem.create({
          data: {
            tenantId: currentUser.tenantId,
            transferId: newTransfer.id,
            itemId: item.itemId,
            quantity: item.quantity,
            notes: item.notes,
          },
        });
      }

      return newTransfer;
    });

    return NextResponse.json({ success: true, transfer });
  } catch (error) {
    console.error("Error creating inventory transfer:", error);
    return NextResponse.json(
      { error: "Failed to create inventory transfer" },
      { status: 500 }
    );
  }
}
