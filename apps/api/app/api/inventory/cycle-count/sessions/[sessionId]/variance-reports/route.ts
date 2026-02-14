/**
 * Cycle Count Variance Reports API Endpoint
 *
 * GET /api/inventory/cycle-count/sessions/[sessionId]/variance-reports - Get variance reports for a session
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

type VarianceReportStatus = "pending" | "reviewed" | "approved" | "rejected";

/**
 * GET /api/inventory/cycle-count/sessions/[sessionId]/variance-reports - Get variance reports
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

    // Find the session by sessionId to get the internal id
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
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      tenantId,
      sessionId: session.id,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    // Get variance reports
    const reports = await database.varianceReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const mappedReports = reports.map((report) => ({
      id: report.id,
      tenant_id: report.tenantId,
      session_id: report.sessionId,
      report_type: report.reportType,
      item_id: report.itemId,
      item_number: report.itemNumber,
      item_name: report.itemName,
      expected_quantity: toNumber(report.expectedQuantity),
      counted_quantity: toNumber(report.countedQuantity),
      variance: toNumber(report.variance),
      variance_pct: toNumber(report.variancePct),
      accuracy_score: toNumber(report.accuracyScore),
      status: report.status as VarianceReportStatus,
      adjustment_type: report.adjustmentType,
      adjustment_amount: report.adjustmentAmount
        ? toNumber(report.adjustmentAmount)
        : null,
      adjustment_date: report.adjustmentDate,
      notes: report.notes,
      generated_at: report.generatedAt,
      created_at: report.createdAt,
      updated_at: report.updatedAt,
      deleted_at: report.deletedAt,
    }));

    return NextResponse.json({
      data: mappedReports,
    });
  } catch (error) {
    console.error("Failed to get variance reports:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
