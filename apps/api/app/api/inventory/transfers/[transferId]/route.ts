/**
 * Individual Transfer Operations
 *
 * GET    /api/inventory/transfers/[transferId] - Get transfer details
 * PATCH  /api/inventory/transfers/[transferId] - Update transfer (approve, ship, receive)
 * DELETE /api/inventory/transfers/[transferId] - Cancel transfer
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ transferId: string }>;
}

/**
 * GET /api/inventory/transfers/[transferId] - Get transfer details
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { transferId } = await context.params;
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const transfer = await database.interLocationTransfer.findFirst({
      where: {
        tenantId,
        id: transferId,
        deletedAt: null,
      },
      include: {
        fromLocation: {
          select: { id: true, name: true },
        },
        toLocation: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                itemNumber: true,
                unitOfMeasure: true,
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { message: "Transfer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: transfer });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inventory/transfers/[transferId] - Update transfer
 *
 * Supported actions:
 * - approve: Approve a pending transfer
 * - ship: Mark transfer as shipped (creates inventory transactions)
 * - receive: Receive transfer (updates stock at destination)
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { transferId } = await context.params;
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { message: "Action is required" },
        { status: 400 }
      );
    }

    // Get existing transfer
    const transfer = await database.interLocationTransfer.findFirst({
      where: {
        tenantId,
        id: transferId,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                itemNumber: true,
                quantityOnHand: true,
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json(
        { message: "Transfer not found" },
        { status: 404 }
      );
    }

    let updatedTransfer;

    switch (action) {
      case "approve":
        if (
          transfer.status !== "pending_approval" &&
          transfer.status !== "draft"
        ) {
          return NextResponse.json(
            {
              message:
                "Transfer can only be approved from draft or pending status",
            },
            { status: 400 }
          );
        }

        updatedTransfer = await database.interLocationTransfer.update({
          where: { tenantId_id: { tenantId, id: transferId } },
          data: {
            status: "approved",
            approvedBy: userId,
            approvedAt: new Date(),
          },
          include: {
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
            items: {
              include: {
                item: { select: { id: true, name: true, itemNumber: true } },
              },
            },
          },
        });
        break;

      case "ship":
        if (transfer.status !== "approved" && transfer.status !== "scheduled") {
          return NextResponse.json(
            { message: "Transfer must be approved before shipping" },
            { status: 400 }
          );
        }

        // Create inventory transactions for items being shipped
        await database.$transaction(
          transfer.items.map((item) =>
            database.inventoryTransaction.create({
              data: {
                tenantId,
                itemId: item.itemId,
                transactionType: "transfer_out",
                quantity: -Number(item.quantityRequested),
                unit_cost: item.unitCost ? Number(item.unitCost) : 0,
                reference: transfer.transferNumber,
                referenceType: "inter_location_transfer",
                referenceId: transferId,
                reason: `Transfer to ${transfer.toLocationId}`,
                employee_id: userId,
                storage_location_id: transfer.fromLocationId,
              },
            })
          )
        );

        // Update stock at source location
        for (const item of transfer.items) {
          await database.inventoryItem.update({
            where: {
              tenantId_id: { tenantId, id: item.itemId },
            },
            data: {
              quantityOnHand: {
                decrement: Number(item.quantityRequested),
              },
            },
          });
        }

        updatedTransfer = await database.interLocationTransfer.update({
          where: { tenantId_id: { tenantId, id: transferId } },
          data: {
            status: "in_transit",
            shippedDate: new Date(),
          },
          include: {
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
            items: {
              include: {
                item: { select: { id: true, name: true, itemNumber: true } },
              },
            },
          },
        });
        break;

      case "receive": {
        if (transfer.status !== "in_transit") {
          return NextResponse.json(
            { message: "Transfer must be in transit to receive" },
            { status: 400 }
          );
        }

        // Process received items
        const receivedItems = body.items ?? transfer.items;

        // Create inventory transactions for items being received
        await database.$transaction(
          receivedItems.map((item: any) => {
            const transferItem = transfer.items.find(
              (ti) => ti.itemId === item.itemId
            );
            const qty = item.quantityReceived
              ? Number(item.quantityReceived)
              : Number(transferItem?.quantityRequested ?? 0);

            return database.inventoryTransaction.create({
              data: {
                tenantId,
                itemId: item.itemId,
                transactionType: "transfer_in",
                quantity: qty,
                unit_cost: transferItem?.unitCost
                  ? Number(transferItem.unitCost)
                  : 0,
                reference: transfer.transferNumber,
                referenceType: "inter_location_transfer",
                referenceId: transferId,
                reason: `Transfer from ${transfer.fromLocationId}`,
                employee_id: userId,
                storage_location_id: transfer.toLocationId,
              },
            });
          })
        );

        // Update stock at destination and mark items received
        for (const receivedItem of receivedItems) {
          const transferItem = transfer.items.find(
            (ti) => ti.itemId === receivedItem.itemId
          );
          if (!transferItem) continue;

          const qty = receivedItem.quantityReceived
            ? Number(receivedItem.quantityReceived)
            : Number(transferItem.quantityRequested);

          await database.inventoryItem.update({
            where: {
              tenantId_id: { tenantId, id: receivedItem.itemId },
            },
            data: {
              quantityOnHand: {
                increment: qty,
              },
            },
          });

          await database.interLocationTransferItem.update({
            where: {
              tenantId_id: {
                tenantId,
                id: transferItem.id,
              },
            },
            data: {
              quantityReceived: qty,
              quantityShipped: qty,
            },
          });
        }

        // Check if all items are received
        const allReceived = receivedItems.every(
          (item: any) => item.quantityReceived > 0
        );

        updatedTransfer = await database.interLocationTransfer.update({
          where: { tenantId_id: { tenantId, id: transferId } },
          data: {
            status: allReceived ? "received" : "partially_received",
            receivedDate: new Date(),
          },
          include: {
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
            items: {
              include: {
                item: { select: { id: true, name: true, itemNumber: true } },
              },
            },
          },
        });
        break;
      }

      case "schedule":
        if (transfer.status !== "approved") {
          return NextResponse.json(
            { message: "Transfer must be approved to schedule" },
            { status: 400 }
          );
        }

        if (!body.scheduledDate) {
          return NextResponse.json(
            { message: "Scheduled date is required" },
            { status: 400 }
          );
        }

        updatedTransfer = await database.interLocationTransfer.update({
          where: { tenantId_id: { tenantId, id: transferId } },
          data: {
            status: "scheduled",
            scheduledDate: new Date(body.scheduledDate),
          },
          include: {
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
            items: {
              include: {
                item: { select: { id: true, name: true, itemNumber: true } },
              },
            },
          },
        });
        break;

      case "reject":
        if (
          transfer.status !== "pending_approval" &&
          transfer.status !== "draft"
        ) {
          return NextResponse.json(
            { message: "Can only reject pending or draft transfers" },
            { status: 400 }
          );
        }

        updatedTransfer = await database.interLocationTransfer.update({
          where: { tenantId_id: { tenantId, id: transferId } },
          data: {
            status: "rejected",
            notes: body.rejectionReason ?? transfer.notes,
          },
          include: {
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
            items: {
              include: {
                item: { select: { id: true, name: true, itemNumber: true } },
              },
            },
          },
        });
        break;

      case "cancel":
        if (
          !["draft", "pending_approval", "approved", "scheduled"].includes(
            transfer.status
          )
        ) {
          return NextResponse.json(
            {
              message: "Cannot cancel transfer that is in transit or received",
            },
            { status: 400 }
          );
        }

        updatedTransfer = await database.interLocationTransfer.update({
          where: { tenantId_id: { tenantId, id: transferId } },
          data: {
            status: "cancelled",
          },
          include: {
            fromLocation: { select: { id: true, name: true } },
            toLocation: { select: { id: true, name: true } },
            items: {
              include: {
                item: { select: { id: true, name: true, itemNumber: true } },
              },
            },
          },
        });
        break;

      default:
        return NextResponse.json(
          { message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ data: updatedTransfer });
  } catch (error) {
    captureException(error);
    console.error("Failed to update transfer:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/transfers/[transferId] - Soft delete transfer
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { transferId } = await context.params;
    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const transfer = await database.interLocationTransfer.findFirst({
      where: {
        tenantId,
        id: transferId,
        deletedAt: null,
      },
      select: { status: true },
    });

    if (!transfer) {
      return NextResponse.json(
        { message: "Transfer not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of certain statuses
    if (
      ["in_transit", "received", "partially_received"].includes(transfer.status)
    ) {
      return NextResponse.json(
        { message: "Cannot delete transfer that is in transit or received" },
        { status: 400 }
      );
    }

    await database.interLocationTransfer.update({
      where: { tenantId_id: { tenantId, id: transferId } },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Transfer deleted" });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
