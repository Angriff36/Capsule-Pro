/**
 * Inter-Location Transfers API
 *
 * Handles inventory transfers between locations within a tenant
 *
 * GET    /api/inventory/transfers           - List transfers with filters
 * POST   /api/inventory/transfers           - Create new transfer request
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { validateLocationForTenant } from "@/app/lib/location";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface TransferListFilters {
  status?: string;
  fromLocationId?: string;
  toLocationId?: string;
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Parse transfer list filters from URL search params
 */
function parseTransferFilters(
  searchParams: URLSearchParams
): TransferListFilters {
  const filters: TransferListFilters = {};

  const status = searchParams.get("status");
  if (status) {
    filters.status = status;
  }

  const fromLocationId = searchParams.get("fromLocationId");
  if (fromLocationId) {
    filters.fromLocationId = fromLocationId;
  }

  const toLocationId = searchParams.get("toLocationId");
  if (toLocationId) {
    filters.toLocationId = toLocationId;
  }

  const search = searchParams.get("search");
  if (search) {
    filters.search = search;
  }

  return filters;
}

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
 * GET /api/inventory/transfers - List transfers with filters
 */
export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
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
    const filters = parseTransferFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {
      AND: [{ tenantId }, { deletedAt: null }],
    };

    if (filters.status) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { status: filters.status },
      ];
    }

    if (filters.fromLocationId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { fromLocationId: filters.fromLocationId },
      ];
    }

    if (filters.toLocationId) {
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { toLocationId: filters.toLocationId },
      ];
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      whereClause.AND = [
        ...(whereClause.AND as Record<string, unknown>[]),
        { transferNumber: { contains: searchLower, mode: "insensitive" } },
      ];
    }

    // Fetch transfers with related data
    const transfers = await database.interLocationTransfer.findMany({
      where: whereClause,
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
              select: { id: true, name: true, itemNumber: true },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await database.interLocationTransfer.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: transfers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/transfers - Create new transfer request
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!(body.fromLocationId && body.toLocationId)) {
      return NextResponse.json(
        { message: "From and To locations are required" },
        { status: 400 }
      );
    }

    if (body.fromLocationId === body.toLocationId) {
      return NextResponse.json(
        { message: "Source and destination locations cannot be the same" },
        { status: 400 }
      );
    }

    if (!(body.items && Array.isArray(body.items)) || body.items.length === 0) {
      return NextResponse.json(
        { message: "At least one item is required" },
        { status: 400 }
      );
    }

    // Validate locations belong to tenant
    const [fromValid, toValid] = await Promise.all([
      validateLocationForTenant(tenantId, body.fromLocationId),
      validateLocationForTenant(tenantId, body.toLocationId),
    ]);

    if (!fromValid) {
      return NextResponse.json(
        { message: "Invalid source location" },
        { status: 400 }
      );
    }

    if (!toValid) {
      return NextResponse.json(
        { message: "Invalid destination location" },
        { status: 400 }
      );
    }

    // Generate transfer number
    const transferCount = await database.interLocationTransfer.count({
      where: { tenantId },
    });
    const transferNumber = `TRF-${String(transferCount + 1).padStart(6, "0")}`;

    // Create transfer with items
    const transfer = await database.interLocationTransfer.create({
      data: {
        tenantId,
        transferNumber,
        fromLocationId: body.fromLocationId,
        toLocationId: body.toLocationId,
        status: body.requiresApproval ? "pending_approval" : "approved",
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        requestedBy: userId,
        reason: body.reason ?? null,
        notes: body.notes ?? null,
        items: {
          create: await Promise.all(
            body.items.map(async (item: any) => {
              // Validate item exists
              const inventoryItem = await database.inventoryItem.findFirst({
                where: {
                  tenantId,
                  id: item.itemId,
                  deletedAt: null,
                },
                select: { id: true },
              });

              if (!inventoryItem) {
                throw new Error(`Invalid item: ${item.itemId}`);
              }

              return {
                tenantId,
                itemId: item.itemId,
                quantityRequested: item.quantity,
                unitCost: item.unitCost ?? null,
                unitId: item.unitId ?? null,
                notes: item.notes ?? null,
              };
            })
          ),
        },
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
              select: { id: true, name: true, itemNumber: true },
            },
          },
        },
      },
    });

    // Auto-approve if no approval required
    if (!body.requiresApproval) {
      await database.interLocationTransfer.update({
        where: { tenantId_id: { tenantId, id: transfer.id } },
        data: {
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ data: transfer }, { status: 201 });
  } catch (error) {
    captureException(error);
    console.error("Failed to create transfer:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
