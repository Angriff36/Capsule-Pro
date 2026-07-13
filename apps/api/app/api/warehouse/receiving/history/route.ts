/**
 * Warehouse Receiving History Endpoint
 *
 * GET /api/warehouse/receiving/history - View receiving records with details
 *
 * Returns purchase orders with status "received" or "partial", including
 * computed completion metrics and vendor name lookups.
 */

import { auth } from "@repo/auth/server";
import { database, type Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/** Statuses that indicate receiving activity has occurred */
const RECEIVING_STATUSES = ["received", "partial"] as const;

interface ReceivingHistoryRecord {
  completionPercentage: number;
  id: string;
  poNumber: string;
  receivedAt: string | null;
  receivedBy: string | null;
  receivedItems: number;
  status: string;
  totalItems: number;
  vendorName: string | null;
}

interface ReceivingHistoryResponse {
  page: number;
  records: ReceivingHistoryRecord[];
  total: number;
  totalPages: number;
}

function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(
    Number.parseInt(searchParams.get("page") || "1", 10),
    1
  );
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1),
    100
  );

  return { page, limit };
}

/**
 * GET /api/warehouse/receiving/history
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

    // Build where clause — only POs with receiving activity
    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
      deletedAt: null,
      status: { in: [...RECEIVING_STATUSES] },
    };

    // Search filter (PO number partial match)
    const search = searchParams.get("search");
    if (search) {
      where.poNumber = { contains: search, mode: "insensitive" };
    }

    // Specific status filter
    const status = searchParams.get("status");
    if (
      status &&
      RECEIVING_STATUSES.includes(status as (typeof RECEIVING_STATUSES)[number])
    ) {
      where.status = status;
    }

    // Date range filter (on receivedAt)
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      where.receivedAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    // Fetch POs + total count in parallel (count is data-independent, same
    // where) — collapses 2 serial round-trips into 1 concurrent batch (#23).
    // Vendor-name lookup depends on findMany results and stays serial after.
    const [orders, total] = await Promise.all([
      database.purchaseOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
        include: {
          items: {
            where: { deletedAt: null },
            select: {
              quantityOrdered: true,
              quantityReceived: true,
            },
          },
        },
      }),
      database.purchaseOrder.count({ where }),
    ]);

    // Batch-fetch vendor names for the returned POs
    const vendorIds = orders
      .map((order) => order.vendorId)
      .filter((id, index, self) => self.indexOf(id) === index);

    const vendors =
      vendorIds.length > 0
        ? await database.inventorySupplier.findMany({
            where: {
              id: { in: vendorIds },
              deletedAt: null,
            },
            select: { id: true, name: true },
          })
        : [];

    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

    // Map to response shape
    const records: ReceivingHistoryRecord[] = orders.map((order) => {
      const totalItems = order.items.length;
      const receivedItems = order.items.filter(
        (item) => Number(item.quantityReceived) >= Number(item.quantityOrdered)
      ).length;
      const completionPercentage =
        totalItems > 0 ? Math.round((receivedItems / totalItems) * 100) : 0;

      return {
        id: order.id,
        poNumber: order.poNumber,
        vendorName: vendorMap.get(order.vendorId) ?? null,
        status: order.status,
        receivedAt: order.receivedAt?.toISOString() ?? null,
        receivedBy: order.receivedBy ?? null,
        totalItems,
        receivedItems,
        completionPercentage,
      };
    });

    const response: ReceivingHistoryResponse = {
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };

    return NextResponse.json(response);
  } catch (error) {
    captureException(error);
    log.error("Failed to fetch receiving history:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
