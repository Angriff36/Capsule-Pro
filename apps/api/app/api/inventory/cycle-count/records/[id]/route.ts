/**
 * Cycle Count Record Detail API Endpoints
 *
 * GET    /api/inventory/cycle-count/records/[id]      - Get a single record
 * PUT    /api/inventory/cycle-count/records/[id]      - Update a record
 * DELETE /api/inventory/cycle-count/records/[id]      - Delete a record (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type SyncStatus = "synced" | "pending" | "failed" | "conflict";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

    return NextResponse.json(mappedRecord);
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
export async function PUT(request: Request, context: RouteContext) {
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

    const { id } = await context.params;
    const body = await request.json();

    // Check if record exists
    const existing = await database.cycleCountRecord.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Record not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.counted_quantity !== undefined) {
      if (typeof body.counted_quantity !== "number") {
        throw new InvariantError("counted_quantity must be a number");
      }

      const expectedQuantity = toNumber(existing.expectedQuantity);
      const variance = body.counted_quantity - expectedQuantity;
      const variancePct =
        expectedQuantity > 0 ? (variance / expectedQuantity) * 100 : 0;

      updateData.countedQuantity = body.counted_quantity;
      updateData.variance = variance;
      updateData.variancePct = variancePct;
    }

    if (body.notes !== undefined) {
      if (typeof body.notes !== "string") {
        throw new InvariantError("notes must be a string");
      }
      updateData.notes = body.notes;
    }

    if (body.is_verified !== undefined) {
      if (typeof body.is_verified !== "boolean") {
        throw new InvariantError("is_verified must be a boolean");
      }
      updateData.isVerified = body.is_verified;

      if (body.is_verified) {
        // Get the user's database ID for verification
        const user = await database.user.findFirst({
          where: {
            tenantId,
            authUserId: userId,
          },
        });

        if (user) {
          updateData.verifiedById = user.id;
        }
        updateData.verifiedAt = new Date();
      }
    }

    if (body.sync_status !== undefined) {
      const validStatuses: SyncStatus[] = [
        "synced",
        "pending",
        "failed",
        "conflict",
      ];
      if (!validStatuses.includes(body.sync_status as SyncStatus)) {
        throw new InvariantError(
          `sync_status must be one of: ${validStatuses.join(", ")}`
        );
      }
      updateData.syncStatus = body.sync_status;
    }

    // Update record
    const record = await database.cycleCountRecord.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: updateData,
    });

    // Update session totals
    const allRecords = await database.cycleCountRecord.findMany({
      where: {
        tenantId,
        sessionId: existing.sessionId,
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
          id: existing.sessionId,
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

    return NextResponse.json(mappedRecord);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update cycle count record:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/cycle-count/records/[id] - Soft delete a record
 */
export async function DELETE(_request: Request, context: RouteContext) {
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

    // Check if record exists
    const existing = await database.cycleCountRecord.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Record not found" },
        { status: 404 }
      );
    }

    // Soft delete by setting deletedAt
    await database.cycleCountRecord.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Record deleted" });
  } catch (error) {
    console.error("Failed to delete cycle count record:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
