/**
 * Inventory Audit Report by ID API Endpoint
 *
 * GET /api/inventory/audit/reports/[id] - Get a specific saved report
 * DELETE /api/inventory/audit/reports/[id] - Delete a saved report
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface DateRangeFilter {
  gte?: Date;
  lte?: Date;
}

function toNumber(value: { toNumber: () => number } | null | undefined): number | null {
  if (!value) {
    return null;
  }
  return value.toNumber();
}

function getSeverity(variancePct: number): "low" | "medium" | "high" | "critical" {
  const absPct = Math.abs(variancePct);
  if (absPct < 5) {
    return "low";
  }
  if (absPct < 15) {
    return "medium";
  }
  if (absPct < 30) {
    return "high";
  }
  return "critical";
}

function getPeriodKey(date: Date, groupBy: string): string {
  switch (groupBy) {
    case "week": {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split("T")[0] ?? "";
    }
    case "month":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    default:
      return date.toISOString().split("T")[0] ?? "";
  }
}

function buildSessionWhereClause(
  tenantId: string,
  dateFilter: DateRangeFilter,
  locationId: string | undefined
): Record<string, unknown> {
  const sessionWhere: Record<string, unknown> = {
    tenantId,
    deletedAt: null,
    status: "finalized",
  };

  if (Object.keys(dateFilter).length > 0) {
    sessionWhere.finalizedAt = dateFilter;
  }

  if (locationId) {
    sessionWhere.locationId = locationId;
  }

  return sessionWhere;
}

function calculateDiscrepancyBreakdown(
  varianceReports: Array<{
    variance: { toNumber: () => number } | null;
    variancePct: { toNumber: () => number } | null;
  }>
): {
  by_type: Record<string, number>;
  by_severity: { low: number; medium: number; high: number; critical: number };
} {
  const breakdown = {
    by_type: {} as Record<string, number>,
    by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
  };

  for (const report of varianceReports) {
    const variance = toNumber(report.variance) || 0;
    let varianceType: string;
    if (variance > 0) {
      varianceType = "overage";
    } else if (variance < 0) {
      varianceType = "shortage";
    } else {
      varianceType = "accurate";
    }
    breakdown.by_type[varianceType] = (breakdown.by_type[varianceType] || 0) + 1;

    const variancePct = toNumber(report.variancePct) || 0;
    const severity = getSeverity(variancePct);
    breakdown.by_severity[severity]++;
  }

  return breakdown;
}

function buildTrendData(
  sessions: Array<{
    id: string;
    finalizedAt: Date | null;
    countedItems: number;
    totalVariance: { toNumber: () => number } | null;
  }>,
  varianceReports: Array<{
    sessionId: string;
    accuracyScore: { toNumber: () => number } | null;
  }>,
  groupBy: string
): Array<{
  date: string;
  audits_completed: number;
  avg_accuracy: number;
  total_variances: number;
  items_counted: number;
}> {
  const trendMap = new Map<string, {
    date: string;
    audits_completed: number;
    avg_accuracy: number;
    total_variances: number;
    items_counted: number;
  }>();

  for (const session of sessions) {
    if (!session.finalizedAt) {
      continue;
    }

    const periodKey = getPeriodKey(new Date(session.finalizedAt), groupBy);

    const existing = trendMap.get(periodKey) || {
      date: periodKey,
      audits_completed: 0,
      avg_accuracy: 0,
      total_variances: 0,
      items_counted: 0,
    };

    existing.audits_completed++;
    existing.items_counted += session.countedItems;
    existing.total_variances += Math.abs(toNumber(session.totalVariance) || 0);

    trendMap.set(periodKey, existing);
  }

  // Calculate accuracy per period
  for (const session of sessions) {
    if (!session.finalizedAt) {
      continue;
    }

    const periodKey = getPeriodKey(new Date(session.finalizedAt), groupBy);
    const trendPoint = trendMap.get(periodKey);
    if (!trendPoint) {
      continue;
    }

    const sessionReports = varianceReports.filter((r) => r.sessionId === session.id);
    const scores = sessionReports
      .map((r) => toNumber(r.accuracyScore))
      .filter((s): s is number => s !== null);

    if (scores.length > 0) {
      const newAvg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const currentCount = trendPoint.audits_completed - 1;
      if (currentCount === 0) {
        trendPoint.avg_accuracy = newAvg;
      } else {
        trendPoint.avg_accuracy = (trendPoint.avg_accuracy * currentCount + newAvg) / trendPoint.audits_completed;
      }
    }
  }

  return Array.from(trendMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * GET /api/inventory/audit/reports/[id] - Get a specific saved report
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

    // Get the saved report
    const report = await database.report.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!report) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    // Check if it's an inventory audit report
    if (!report.reportType.startsWith("inventory_audit_")) {
      return NextResponse.json(
        { message: "Report is not an inventory audit report" },
        { status: 400 }
      );
    }

    // Parse the query config to get the original filters
    const queryConfig = report.query_config as {
      filters?: {
        startDate?: string;
        endDate?: string;
        locationId?: string;
        itemCategory?: string;
      };
      group_by?: "day" | "week" | "month" | "location" | "item_category";
      include_items?: boolean;
      generated_at?: string;
    };

    // Re-generate the report data based on saved configuration
    const filters = queryConfig.filters || {};
    const groupBy = queryConfig.group_by || "day";
    const includeItems = queryConfig.include_items || false;

    // Build date filter
    const dateFilter: DateRangeFilter = {};
    if (filters.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      dateFilter.lte = new Date(filters.endDate);
    }

    const sessionWhere = buildSessionWhereClause(tenantId, dateFilter, filters.locationId);

    // Get sessions
    const sessions = await database.cycleCountSession.findMany({
      where: sessionWhere,
      select: {
        id: true,
        sessionId: true,
        sessionName: true,
        locationId: true,
        finalizedAt: true,
        totalItems: true,
        countedItems: true,
        totalVariance: true,
        variancePercentage: true,
        countType: true,
      },
      orderBy: { finalizedAt: "desc" },
    });

    // Get variance reports
    const sessionIds = sessions.map((s) => s.id);
    const varianceReports = await database.varianceReport.findMany({
      where: {
        tenantId,
        sessionId: { in: sessionIds },
        deletedAt: null,
      },
      select: {
        id: true,
        sessionId: true,
        itemId: true,
        itemNumber: true,
        itemName: true,
        expectedQuantity: true,
        countedQuantity: true,
        variance: true,
        variancePct: true,
        accuracyScore: true,
        status: true,
        reportType: true,
      },
    });

    // Calculate summary statistics
    const totalAuditsCompleted = sessions.length;
    const totalItemsCounted = sessions.reduce((sum, s) => sum + s.countedItems, 0);

    const accuracyScores = varianceReports
      .map((r) => toNumber(r.accuracyScore))
      .filter((s): s is number => s !== null);
    const avgAccuracyScore =
      accuracyScores.length > 0
        ? accuracyScores.reduce((sum, s) => sum + s, 0) / accuracyScores.length
        : 100;

    const trendData = buildTrendData(sessions, varianceReports, groupBy);
    const discrepancyBreakdown = calculateDiscrepancyBreakdown(varianceReports);

    // Build response
    const reportData = {
      id: report.id,
      name: report.name,
      description: report.description,
      report_type: report.reportType,
      created_at: report.createdAt,
      updated_at: report.updatedAt,
      query_config: queryConfig,
      summary: {
        total_audits_completed: totalAuditsCompleted,
        total_items_counted: totalItemsCounted,
        avg_accuracy_score: Math.round(avgAccuracyScore * 100) / 100,
      },
      discrepancy_breakdown: discrepancyBreakdown,
      trend_data: trendData,
      sessions: sessions.slice(0, 50).map((s) => ({
        id: s.id,
        session_id: s.sessionId,
        session_name: s.sessionName,
        location_id: s.locationId,
        finalized_at: s.finalizedAt,
        total_items: s.totalItems,
        counted_items: s.countedItems,
        total_variance: toNumber(s.totalVariance),
        variance_percentage: toNumber(s.variancePercentage),
        count_type: s.countType,
        variance_reports: includeItems
          ? varianceReports
              .filter((r) => r.sessionId === s.id)
              .map((r) => ({
                id: r.id,
                item_id: r.itemId,
                item_number: r.itemNumber,
                item_name: r.itemName,
                expected_quantity: toNumber(r.expectedQuantity),
                counted_quantity: toNumber(r.countedQuantity),
                variance: toNumber(r.variance),
                variance_pct: toNumber(r.variancePct),
                accuracy_score: toNumber(r.accuracyScore),
                status: r.status,
              }))
          : undefined,
      })),
    };

    return NextResponse.json({
      data: reportData,
    });
  } catch (error) {
    console.error("Failed to get saved report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/audit/reports/[id] - Delete a saved report
 */
export async function DELETE(request: Request, context: RouteContext) {
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

    // Check if report exists and belongs to tenant
    const report = await database.report.findFirst({
      where: {
        tenantId,
        id,
        deletedAt: null,
      },
    });

    if (!report) {
      return NextResponse.json(
        { message: "Report not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of system reports
    if (report.is_system) {
      return NextResponse.json(
        { message: "Cannot delete system reports" },
        { status: 403 }
      );
    }

    // Soft delete the report
    await database.report.update({
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

    return NextResponse.json({
      data: {
        id,
        deleted: true,
        deleted_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to delete saved report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
