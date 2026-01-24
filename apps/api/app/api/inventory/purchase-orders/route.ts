/**
 * Purchase Orders API Endpoints
 *
 * GET    /api/inventory/purchase-orders      - List purchase orders with pagination and filters
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  PurchaseOrderListFilters,
  PurchaseOrderWithDetails,
} from "./types";
import { PO_STATUSES } from "./types";

type PaginationParams = {
  page: number;
  limit: number;
};

/**
 * Parse pagination parameters from URL search params
 */
function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

/**
 * Parse purchase order list filters from URL search params
 */
function parsePurchaseOrderFilters(
  searchParams: URLSearchParams
): PurchaseOrderListFilters {
  const filters: PurchaseOrderListFilters = {};

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  const poNumber = searchParams.get("po_number");
  if (poNumber) {
    filters.po_number = poNumber;
  }

  const status = searchParams.get("status");
  if (status && PO_STATUSES.includes(status as any)) {
    filters.status = status as any;
  }

  const vendorId = searchParams.get("vendor_id");
  if (vendorId) {
    filters.vendor_id = vendorId;
  }

  const locationId = searchParams.get("location_id");
  if (locationId) {
    filters.location_id = locationId;
  }

  return filters;
}

/**
 * Calculate receiving progress for a purchase order
 */
function calculateProgress(items: Array<{ quantity_ordered: number; quantity_received: number }>) {
  const totalItems = items.length;
  const receivedItems = items.filter(
    (item) => Number(item.quantity_received) >= Number(item.quantity_ordered)
  ).length;
  const percentage = totalItems > 0 ? (receivedItems / totalItems) * 100 : 0;

  return {
    total_items: totalItems,
    received_items: receivedItems,
    percentage: Math.round(percentage),
  };
}

/**
 * GET /api/inventory/purchase-orders - List purchase orders with pagination and filters
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);
    const filters = parsePurchaseOrderFilters(searchParams);

    // Build where clause
    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // PO number filter (exact match)
    if (filters.po_number) {
      where.poNumber = {
        equals: filters.po_number,
        mode: "insensitive",
      };
    }

    // Search filter (po_number only - primary use case for receiving)
    if (filters.search && !filters.po_number) {
      where.poNumber = {
        contains: filters.search,
        mode: "insensitive",
      };
    }

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Vendor filter
    if (filters.vendor_id) {
      where.vendorId = filters.vendor_id;
    }

    // Location filter
    if (filters.location_id) {
      where.locationId = filters.location_id;
    }

    // Get total count for pagination
    const total = await database.purchaseOrder.count({ where });

    // Get purchase orders with pagination
    const orders = await database.purchaseOrder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      include: {
        items: {
          where: { deletedAt: null },
        },
      },
    });

    // Get all inventory items for details
    const itemIds = orders
      .flatMap((order) => order.items.map((item) => item.itemId))
      .filter((id, index, self) => self.indexOf(id) === index);

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

    // Map orders to response format with details
    const mappedOrders: PurchaseOrderWithDetails[] = orders.map((order) => {
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

      const progress = calculateProgress(itemsWithDetails);

      return {
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
    });

    return NextResponse.json({
      data: mappedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list purchase orders:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
