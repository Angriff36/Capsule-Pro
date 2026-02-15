/**
 * Cycle Count Records API Endpoints
 *
 * GET    /api/inventory/cycle-count/sessions/[sessionId]/records      - List records for a session
 * POST   /api/inventory/cycle-count/sessions/[sessionId]/records      - Create a new record (manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

type SyncStatus = "synced" | "pending" | "failed" | "conflict";

interface PaginationParams {
  page: number;
  limit: number;
}

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

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

/**
 * Map cycle count record to response format
 */
function mapRecord(record: {
  id: string;
  tenantId: string;
  sessionId: string;
  itemId: string;
  itemNumber: string;
  itemName: string;
  storageLocationId: string;
  expectedQuantity: { toNumber: () => number };
  countedQuantity: { toNumber: () => number };
  variance: { toNumber: () => number };
  variancePct: { toNumber: () => number };
  countDate: Date;
  countedById: string;
  barcode: string | null;
  notes: string | null;
  isVerified: boolean;
  verifiedById: string | null;
  verifiedAt: Date | null;
  syncStatus: string;
  offlineId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
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
}

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

    const mappedRecords = records.map(mapRecord);

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
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  console.log("[CycleCountRecord/POST] Delegating to manifest create command", {
    sessionId,
  });
  return executeManifestCommand(request, {
    entityName: "CycleCountRecord",
    commandName: "create",
    params: { sessionId },
    transformBody: (body) => ({ ...body, sessionId }),
  });
}
