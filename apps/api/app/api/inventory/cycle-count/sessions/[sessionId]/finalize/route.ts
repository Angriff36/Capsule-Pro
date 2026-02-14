/**
 * Cycle Count Finalization API Endpoint
 *
 * POST /api/inventory/cycle-count/sessions/[sessionId]/finalize - Finalize a session
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

function getAdjustmentType(variance: number): "increase" | "decrease" | "none" {
  if (variance > 0) {
    return "increase";
  }
  if (variance < 0) {
    return "decrease";
  }
  return "none";
}

interface VarianceRecord {
  id: string;
  itemId: string;
  itemNumber: string | null;
  itemName: string | null;
  expectedQuantity: { toNumber: () => number };
  countedQuantity: { toNumber: () => number };
  variance: { toNumber: () => number };
  storageLocationId: string | null;
}

interface SessionInfo {
  id: string;
  sessionId: string;
  status: string;
  totalVariance: { toNumber: () => number };
}

function generateVarianceReport(
  record: VarianceRecord,
  tenantId: string,
  session: SessionInfo
) {
  const expectedQuantity = toNumber(record.expectedQuantity);
  const countedQuantity = toNumber(record.countedQuantity);
  const variance = countedQuantity - expectedQuantity;
  const variancePct =
    expectedQuantity > 0 ? Math.abs((variance / expectedQuantity) * 100) : 0;
  const accuracyScore =
    expectedQuantity > 0 ? Math.max(0, 100 - variancePct) : 100;

  return {
    tenantId,
    sessionId: session.id,
    reportType: "item_variance" as const,
    itemId: record.itemId,
    itemNumber: record.itemNumber ?? "",
    itemName: record.itemName ?? "",
    expectedQuantity,
    countedQuantity,
    variance,
    variancePct,
    accuracyScore,
    status: "pending" as const,
    adjustmentType: null,
    adjustmentAmount: null,
    adjustmentDate: null,
    notes: null,
    generatedAt: new Date(),
  };
}

async function processInventoryAdjustments(
  tenantId: string,
  session: SessionInfo,
  records: VarianceRecord[]
) {
  for (const record of records) {
    const expectedQuantity = toNumber(record.expectedQuantity);
    const countedQuantity = toNumber(record.countedQuantity);
    const variance = countedQuantity - expectedQuantity;

    if (variance === 0) {
      continue;
    }

    // Find the inventory item
    const inventoryItem = await database.inventoryItem.findFirst({
      where: {
        tenantId,
        id: record.itemId,
        deletedAt: null,
      },
    });

    if (!inventoryItem) {
      continue;
    }

    // Create inventory transaction
    await database.inventoryTransaction.create({
      data: {
        tenantId,
        itemId: record.itemId,
        transactionType: "adjustment",
        quantity: variance,
        unit_cost: inventoryItem.unitCost,
        reason: `Cycle count session ${session.sessionId}`,
        reference: session.sessionId,
        referenceType: "cycle_count",
        referenceId: session.id,
        storage_location_id: record.storageLocationId || undefined,
      },
    });

    // Update inventory item quantity
    await database.inventoryItem.update({
      where: {
        tenantId_id: {
          tenantId,
          id: record.itemId,
        },
      },
      data: {
        quantityOnHand: countedQuantity,
      },
    });

    // Update variance report with adjustment details
    await database.varianceReport.updateMany({
      where: {
        tenantId,
        sessionId: session.id,
        itemId: record.itemId,
        deletedAt: null,
      },
      data: {
        status: "approved",
        adjustmentType: getAdjustmentType(variance),
        adjustmentAmount: Math.abs(variance),
        adjustmentDate: new Date(),
      },
    });
  }
}

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

/**
 * POST /api/inventory/cycle-count/sessions/[sessionId]/finalize - Finalize a session
 *
 * This endpoint:
 * 1. Generates variance reports for all items
 * 2. Creates inventory adjustments for variances
 * 3. Updates inventory item quantities
 * 4. Creates an audit log entry
 * 5. Marks the session as finalized
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

    // Find the session by sessionId (not id)
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

    if (session.status === "finalized") {
      return NextResponse.json(
        { message: "Session already finalized" },
        { status: 400 }
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

    // Fetch all records for this session
    const records = await database.cycleCountRecord.findMany({
      where: {
        tenantId,
        sessionId: session.id,
        deletedAt: null,
      },
    });

    // Calculate total variance
    let totalVariance = 0;
    let totalExpected = 0;

    for (const record of records) {
      totalVariance += toNumber(record.variance);
      totalExpected += toNumber(record.expectedQuantity);
    }

    const variancePercentage =
      totalExpected > 0 ? Math.abs((totalVariance / totalExpected) * 100) : 0;

    // Generate variance reports
    const varianceReports = records.map((record) =>
      generateVarianceReport(record, tenantId, session)
    );

    await database.varianceReport.createMany({
      data: varianceReports.map((report) => ({
        tenantId: report.tenantId,
        sessionId: report.sessionId,
        reportType: report.reportType,
        itemId: report.itemId,
        itemNumber: report.itemNumber,
        itemName: report.itemName,
        expectedQuantity: report.expectedQuantity,
        countedQuantity: report.countedQuantity,
        variance: report.variance,
        variancePct: report.variancePct,
        accuracyScore: report.accuracyScore,
        status: report.status,
        adjustmentType: report.adjustmentType,
        adjustmentAmount: report.adjustmentAmount,
        adjustmentDate: report.adjustmentDate,
        notes: report.notes,
        generatedAt: report.generatedAt,
      })),
    });

    // Process inventory adjustments for records with variance
    await processInventoryAdjustments(tenantId, session, records);

    // Update session to finalized
    const updatedSession = await database.cycleCountSession.update({
      where: {
        tenantId_id: {
          tenantId,
          id: session.id,
        },
      },
      data: {
        status: "finalized",
        finalizedAt: new Date(),
        approvedById: user.id,
        notes: body.notes || session.notes,
        totalVariance,
        variancePercentage,
        countedItems: records.length,
        totalItems: records.length,
      },
    });

    // Create audit log entry
    await database.cycleCountAuditLog.create({
      data: {
        tenantId,
        sessionId: session.id,
        action: "finalize",
        entityType: "CycleCountSession",
        entityId: session.id,
        oldValue: {
          status: session.status,
          totalVariance: toNumber(session.totalVariance),
        },
        newValue: {
          status: "finalized",
          totalVariance,
          variancePercentage,
        },
        performedById: user.id,
        ipAddress: null,
        userAgent: null,
      },
    });

    return NextResponse.json({
      id: updatedSession.id,
      session_id: updatedSession.sessionId,
      status: updatedSession.status,
      total_variance: toNumber(updatedSession.totalVariance),
      variance_percentage: toNumber(updatedSession.variancePercentage),
      finalized_at: updatedSession.finalizedAt,
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to finalize cycle count session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
