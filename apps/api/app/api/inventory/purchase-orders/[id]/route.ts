/**
 * Individual Purchase Order API Endpoints
 *
 * GET    /api/inventory/purchase-orders/[id]      - Get a single purchase order by ID
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { PurchaseOrderWithDetails } from "../types";
import { PO_STATUSES } from "../types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/inventory/purchase-orders/[id] - Get a single purchase order by ID
 */
export async function GET(request: Request, context: RouteContext) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "Purchase order ID is required" },
        { status: 400 }
      );
    }

    // Get purchase order with items
    const order = await database.purchaseOrder.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        items: {
          where: { deletedAt: null },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Get inventory items for details
    const itemIds = order.items.map((item) => item.itemId);
    const inventoryItems =
      itemIds.length > 0
        ? await database.inventoryItem.findMany({
            where: { id: { in: itemIds }, deletedAt: null },
            select: { id: true, item_number: true, name: true },
          })
        : [];

    const inventoryItemMap = new Map(
      inventoryItems.map((item) => [item.id, item])
    );

    // Calculate receiving progress
    const itemsWithDetails = order.items.map((item) => {
      const inventoryItem = inventoryItemMap.get(item.itemId);
      return {
        id: item.id,
        tenant_id: item.tenantId,
        purchase_order_id: item.purchaseOrderId,
        item_id: item.itemId,
        quantity_ordered: Number(item.quantityOrdered),
        quantity_received: Number(item.quantityReceived),
        unit_id: item.unitId,
        unit_cost: Number(item.unitCost),
        total_cost: Number(item.totalCost),
        quality_status: (item.qualityStatus ?? "pending") as any,
        discrepancy_type: item.discrepancyType as any | null,
        discrepancy_amount: item.discrepancyAmount
          ? Number(item.discrepancyAmount)
          : null,
        notes: item.notes,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        deleted_at: item.deletedAt,
        item_number: inventoryItem?.item_number,
        item_name: inventoryItem?.name,
      };
    });

    const totalItems = itemsWithDetails.length;
    const receivedItems = itemsWithDetails.filter(
      (item) => item.quantity_received >= item.quantity_ordered
    ).length;
    const percentage = totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;

    const progress = {
      total_items: totalItems,
      received_items: receivedItems,
      percentage: Math.round(percentage),
    };

    const orderWithDetails: PurchaseOrderWithDetails = {
      id: order.id,
      tenant_id: order.tenantId,
      po_number: order.poNumber,
      vendor_id: order.vendorId,
      location_id: order.locationId,
      order_date: order.orderDate,
      expected_delivery_date: order.expectedDeliveryDate,
      actual_delivery_date: order.actualDeliveryDate,
      status: order.status as any,
      subtotal: Number(order.subtotal),
      tax_amount: Number(order.taxAmount),
      shipping_amount: Number(order.shippingAmount),
      total: Number(order.total),
      notes: order.notes,
      submitted_by: order.submittedBy,
      submitted_at: order.submittedAt,
      received_by: order.receivedBy,
      received_at: order.receivedAt,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      deleted_at: order.deletedAt,
      items: itemsWithDetails,
      progress,
    };

    return NextResponse.json(orderWithDetails);
  } catch (error) {
    console.error("Failed to get purchase order:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
