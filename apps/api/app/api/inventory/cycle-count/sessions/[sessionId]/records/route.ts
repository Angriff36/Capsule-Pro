/**
 * Cycle Count Records API Endpoints
 *
 * GET    /api/inventory/cycle-count/sessions/[sessionId]/records      - List records for a session
 * POST   /api/inventory/cycle-count/sessions/[sessionId]/records      - Create a new record
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type SyncStatus = "synced" | "pending" | "failed" | "conflict";

type PaginationParams = {
  page: number;
  limit: number;
};

function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Number.parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get("limit") || "100", 10), 1),
    500
  );
  return { page, limit };
}

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

/**
 * GET /api/inventory/cycle-count/sessions/[sessionId]/records - List records for a session
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

    const { sessionId } = await context.params;
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePaginationParams(searchParams);

    // Verify session exists
    const session = await database.cycleCountSession.findFirst({
      where: {
        tenantId,
        sessionId,
        deletedAt: null,
      },
    });

    if (!session) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 }
      );
    }

    // Parse filters
    const isVerified = searchParams.get("isVerified");
    const syncStatus = searchParams.get("syncStatus");

    const where: Record<string, unknown> = {
      tenantId,
      sessionId: session.id,
      deletedAt: null,
    };

    if (isVerified !== null) {
      where.isVerified = isVerified === "true";
    }

    if (syncStatus) {
      where.syncStatus = syncStatus;
    }

    // Get total count for pagination
    const total = await database.cycleCountRecord.count({ where });

    // Get records with pagination
    const records = await database.cycleCountRecord.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const mappedRecords = records.map((record) => ({
      id: record.id,
      tenant_id: record.tenantId,
      session_id: record.sessionId,
      item_id: record.itemId,
      item_number: record.itemNumber,
      item_name: record.itemName,
      storage_location_id: record.storageLocationId,
      expected_quantity: toNumber(record.expectedQuantity),
      counted_quantity: toNumber(record.countedQuantity),
      variance: toNumber(record.variance),
      variance_pct: toNumber(record.variancePct),
      count_date: record.countDate,
      counted_by_id: record.countedById,
      barcode: record.barcode,
      notes: record.notes,
      is_verified: record.isVerified,
      verified_by_id: record.verifiedById,
      verified_at: record.verifiedAt,
      sync_status: record.syncStatus as SyncStatus,
      offline_id: record.offlineId,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted_at: record.deletedAt,
    }));

    return NextResponse.json({
      data: mappedRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to list cycle count records:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inventory/cycle-count/sessions/[sessionId]/records - Create a new record
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { sessionId } = await context.params;
    const body = await request.json();

    // Verify session exists
    const session = await database.cycleCountSession.findFirst({
      where: {
        tenantId,
        sessionId,
        deletedAt: null,
      },
    });

    if (!session) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!body.item_id || typeof body.item_id !== "string") {
      throw new InvariantError("item_id is required and must be a string");
    }

    if (!body.item_number || typeof body.item_number !== "string") {
      throw new InvariantError("item_number is required and must be a string");
    }

    if (!body.item_name || typeof body.item_name !== "string") {
      throw new InvariantError("item_name is required and must be a string");
    }

    if (
      body.expected_quantity === undefined ||
      typeof body.expected_quantity !== "number"
    ) {
      throw new InvariantError(
        "expected_quantity is required and must be a number"
      );
    }

    if (
      body.counted_quantity === undefined ||
      typeof body.counted_quantity !== "number"
    ) {
      throw new InvariantError(
        "counted_quantity is required and must be a number"
      );
    }

    // Get the user's database ID
    const user = await database.user.findFirst({
      where: {
        tenantId,
        authUserId: userId,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Calculate variance
    const variance = body.counted_quantity - body.expected_quantity;
    const variancePct =
      body.expected_quantity > 0
        ? (variance / body.expected_quantity) * 100
        : 0;

    // Create record
    const record = await database.cycleCountRecord.create({
      data: {
        tenantId,
        sessionId: session.id,
        itemId: body.item_id,
        itemNumber: body.item_number,
        itemName: body.item_name,
        storageLocationId: body.storage_location_id || null,
        expectedQuantity: body.expected_quantity,
        countedQuantity: body.counted_quantity,
        variance,
        variancePct,
        countedById: user.id,
        barcode: body.barcode || null,
        notes: body.notes || null,
        syncStatus: (body.sync_status as SyncStatus) || "synced",
        offlineId: body.offline_id || null,
      },
    });

    // Update session totals
    const allRecords = await database.cycleCountRecord.findMany({
      where: {
        tenantId,
        sessionId: session.id,
        deletedAt: null,
      },
    });

    let totalVariance = 0;
    let totalExpected = 0;

    for (const r of allRecords) {
      totalVariance += toNumber(r.variance);
      totalExpected += toNumber(r.expectedQuantity);
    }

    const variancePercentage =
      totalExpected > 0 ? Math.abs((totalVariance / totalExpected) * 100) : 0;

    await database.cycleCountSession.update({
      where: {
        tenantId_id: {
          tenantId,
          id: session.id,
        },
      },
      data: {
        countedItems: allRecords.length,
        totalVariance,
        variancePercentage,
      },
    });

    const mappedRecord = {
      id: record.id,
      tenant_id: record.tenantId,
      session_id: record.sessionId,
      item_id: record.itemId,
      item_number: record.itemNumber,
      item_name: record.itemName,
      storage_location_id: record.storageLocationId,
      expected_quantity: toNumber(record.expectedQuantity),
      counted_quantity: toNumber(record.countedQuantity),
      variance: toNumber(record.variance),
      variance_pct: toNumber(record.variancePct),
      count_date: record.countDate,
      counted_by_id: record.countedById,
      barcode: record.barcode,
      notes: record.notes,
      is_verified: record.isVerified,
      verified_by_id: record.verifiedById,
      verified_at: record.verifiedAt,
      sync_status: record.syncStatus as SyncStatus,
      offline_id: record.offlineId,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
      deleted_at: record.deletedAt,
    };

    return NextResponse.json(mappedRecord, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create cycle count record:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
