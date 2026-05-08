import { database, type Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fromLocationId, toLocationId, items, notes } = body;

    if (!(fromLocationId && toLocationId)) {
      return NextResponse.json(
        { error: "From and to locations are required" },
        { status: 400 }
      );
    }

    if (!isValidUUID(fromLocationId)) {
      return NextResponse.json(
        { error: "From location ID is not a valid UUID" },
        { status: 400 }
      );
    }
    if (!isValidUUID(toLocationId)) {
      return NextResponse.json(
        { error: "To location ID is not a valid UUID" },
        { status: 400 }
      );
    }

    if (!(items && Array.isArray(items)) || items.length === 0) {
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

    for (const item of items) {
      if (item.itemId && !isValidUUID(item.itemId)) {
        return NextResponse.json(
          { error: `Item ID "${item.itemId}" is not a valid UUID` },
          { status: 400 }
        );
      }
    }

    // Create transfer and items in a transaction
    const transfer = await database.$transaction(
      async (tx: Prisma.TransactionClient) => {
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
      }
    );

    return NextResponse.json({ success: true, transfer });
  } catch (error) {
    captureException(error);
    log.error("Error creating inventory transfer:", error);
    return NextResponse.json(
      { error: "Failed to create inventory transfer" },
      { status: 500 }
    );
  }
}
