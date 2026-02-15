/**
 * Cycle Count Record Detail API Endpoints
 *
 * GET    /api/inventory/cycle-count/records/[id]      - Get a single record
 * PUT    /api/inventory/cycle-count/records/[id]      - Update a record (manifest command)
 * DELETE /api/inventory/cycle-count/records/[id]      - Verify a record (manifest command)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

type SyncStatus = "synced" | "pending" | "failed" | "conflict";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

interface RouteContext {
  params: Promise<{ id: string }>;
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
  storageLocationId: string | null;
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
 * GET /api/inventory/cycle-count/records/[id] - Get a single record
 */
export async function GET(_request: Request, context: RouteContext) {
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

    const record = await database.cycleCountRecord.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!record) {
      return NextResponse.json(
        { message: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(mapRecord(record));
  } catch (error) {
    console.error("Failed to get cycle count record:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/cycle-count/records/[id] - Update a record
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  console.log("[CycleCountRecord/PUT] Delegating to manifest update command", {
    id,
  });
  return executeManifestCommand(request, {
    entityName: "CycleCountRecord",
    commandName: "update",
    params: { id },
    transformBody: (body) => ({ ...body, id }),
  });
}

/**
 * DELETE /api/inventory/cycle-count/records/[id] - Verify a record
 */
// TODO: No dedicated "remove" command exists for CycleCountRecord. Using "verify" as closest match. Consider adding a "remove" command to the manifest.
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  console.log(
    "[CycleCountRecord/DELETE] Delegating to manifest verify command",
    { id }
  );
  return executeManifestCommand(request, {
    entityName: "CycleCountRecord",
    commandName: "verify",
    params: { id },
    transformBody: (_body) => ({ id }),
  });
}
