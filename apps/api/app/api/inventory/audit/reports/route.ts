/**
 * Inventory Audit Reports API Endpoint
 *
 * GET /api/inventory/audit/reports - Generate audit summary reports
 * POST /api/inventory/audit/reports - Generate custom report with specific parameters
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface DateRangeFilter {
  gte?: Date;
  lte?: Date;
}

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  itemCategory?: string;
}

interface TrendDataPoint {
  date: string;
  audits_completed: number;
  avg_accuracy: number;
  total_variances: number;
  items_counted: number;
}

interface DiscrepancyBreakdown {
  by_type: Record<string, number>;
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

function parseDateFilters(searchParams: URLSearchParams): DateRangeFilter {
  const dateFilter: DateRangeFilter = {};
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  return dateFilter;
}

function toNumber(
  value: { toNumber: () => number } | null | undefined
): number | null {
  if (!value) {
    return null;
  }
  return value.toNumber();
}

function getSeverity(
  variancePct: number
): "low" | "medium" | "high" | "critical" {
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

function buildSessionWhereClause(
  tenantId: string,
  dateFilter: DateRangeFilter,
  locationId: string | null
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
): DiscrepancyBreakdown {
  const breakdown: DiscrepancyBreakdown = {
    by_type: {},
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
    breakdown.by_type[varianceType] =
      (breakdown.by_type[varianceType] || 0) + 1;

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
  reportsBySession: Map<
    string,
    Array<{ accuracyScore: { toNumber: () => number } | null }>
  >
): TrendDataPoint[] {
  const trendMap = new Map<string, TrendDataPoint>();

  for (const session of sessions) {
    if (!session.finalizedAt) {
      continue;
    }

    const dateKey = session.finalizedAt.toISOString().split("T")[0] ?? "";

    const existing = trendMap.get(dateKey) || {
      date: dateKey,
      audits_completed: 0,
      avg_accuracy: 0,
      total_variances: 0,
      items_counted: 0,
    };

    existing.audits_completed++;
    existing.items_counted += session.countedItems;
    existing.total_variances += Math.abs(toNumber(session.totalVariance) || 0);

    trendMap.set(dateKey, existing);
  }

  // Calculate accuracy per day
  for (const session of sessions) {
    if (!session.finalizedAt) {
      continue;
    }
    const dateKey = session.finalizedAt.toISOString().split("T")[0] ?? "";
    const trendPoint = trendMap.get(dateKey);
    if (!trendPoint) {
      continue;
    }

    const sessionReports = reportsBySession.get(session.id) || [];
    const scores = sessionReports
      .map((r) => toNumber(r.accuracyScore))
      .filter((s): s is number => s !== null);

    if (scores.length > 0) {
      const currentAvg = trendPoint.avg_accuracy;
      const currentCount = trendPoint.audits_completed - 1;
      const newAvg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      if (currentCount === 0) {
        trendPoint.avg_accuracy = newAvg;
      } else {
        trendPoint.avg_accuracy =
          (currentAvg * currentCount + newAvg) / trendPoint.audits_completed;
      }
    }
  }

  return Array.from(trendMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * GET /api/inventory/audit/reports - Generate audit summary reports
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
    const dateFilter = parseDateFilters(searchParams);
    const locationId = searchParams.get("locationId");
    const itemCategory = searchParams.get("itemCategory");

    const sessionWhere = buildSessionWhereClause(
      tenantId,
      dateFilter,
      locationId
    );

    // Get completed sessions for the period
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
      },
      orderBy: { finalizedAt: "desc" },
    });

    // Get variance reports for these sessions
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
        variance: true,
        variancePct: true,
        accuracyScore: true,
        status: true,
        reportType: true,
      },
    });

    // Calculate summary statistics
    const totalAuditsCompleted = sessions.length;
    const totalItemsCounted = sessions.reduce(
      (sum, s) => sum + s.countedItems,
      0
    );

    const accuracyScores = varianceReports
      .map((r) => toNumber(r.accuracyScore))
      .filter((s): s is number => s !== null);
    const avgAccuracyScore =
      accuracyScores.length > 0
        ? accuracyScores.reduce((sum, s) => sum + s, 0) / accuracyScores.length
        : 100;

    const discrepancyBreakdown = calculateDiscrepancyBreakdown(varianceReports);

    // Build reports by session map for trend calculation
    const reportsBySession = new Map<string, typeof varianceReports>();
    for (const report of varianceReports) {
      const reports = reportsBySession.get(report.sessionId) || [];
      reports.push(report);
      reportsBySession.set(report.sessionId, reports);
    }

    const trendData = buildTrendData(sessions, reportsBySession);

    // Build response
    const report = {
      summary: {
        total_audits_completed: totalAuditsCompleted,
        total_items_counted: totalItemsCounted,
        avg_accuracy_score: Math.round(avgAccuracyScore * 100) / 100,
        report_generated_at: new Date().toISOString(),
        filters_applied: {
          date_range: dateFilter,
          location_id: locationId || null,
          item_category: itemCategory || null,
        },
      },
      discrepancy_breakdown: discrepancyBreakdown,
      trend_data: trendData,
      recent_sessions: sessions.slice(0, 10).map((s) => ({
        id: s.id,
        session_id: s.sessionId,
        session_name: s.sessionName,
        location_id: s.locationId,
        finalized_at: s.finalizedAt,
        total_items: s.totalItems,
        counted_items: s.countedItems,
        total_variance: toNumber(s.totalVariance),
        variance_percentage: toNumber(s.variancePercentage),
      })),
    };

    return NextResponse.json({
      data: report,
    });
  } catch (error) {
    console.error("Failed to generate audit report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

interface CustomReportRequest {
  name: string;
  description?: string;
  report_type: "summary" | "detailed" | "variance_analysis" | "trend_analysis";
  filters: ReportFilters;
  group_by?: "day" | "week" | "month" | "location" | "item_category";
  include_items?: boolean;
  save_report?: boolean;
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

function buildSummaryReport(
  sessions: Array<{
    id: string;
    sessionId: string;
    sessionName: string;
    status: string;
    countedItems: number;
    totalVariance: { toNumber: () => number } | null;
  }>
): Record<string, unknown> {
  return {
    total_sessions: sessions.length,
    completed_sessions: sessions.filter((s) => s.status === "finalized").length,
    total_items_counted: sessions.reduce((sum, s) => sum + s.countedItems, 0),
    sessions: sessions.map((s) => ({
      id: s.id,
      session_id: s.sessionId,
      session_name: s.sessionName,
      status: s.status,
      counted_items: s.countedItems,
      total_variance: toNumber(s.totalVariance),
    })),
  };
}

function buildDetailedReport(
  sessions: Array<{
    id: string;
    sessionId: string;
    sessionName: string;
    locationId: string;
    status: string;
    countType: string;
    startedAt: Date | null;
    completedAt: Date | null;
    finalizedAt: Date | null;
    totalItems: number;
    countedItems: number;
    totalVariance: { toNumber: () => number } | null;
    variancePercentage: { toNumber: () => number } | null;
    notes: string | null;
  }>,
  varianceReports: Array<{
    id: string;
    sessionId: string;
    itemId: string;
    itemNumber: string;
    itemName: string;
    expectedQuantity: { toNumber: () => number };
    countedQuantity: { toNumber: () => number };
    variance: { toNumber: () => number } | null;
    variancePct: { toNumber: () => number } | null;
    accuracyScore: { toNumber: () => number } | null;
    status: string;
  }>,
  includeItems: boolean
): Record<string, unknown> {
  return {
    sessions: sessions.map((s) => {
      const sessionReports = varianceReports.filter(
        (r) => r.sessionId === s.id
      );
      return {
        id: s.id,
        session_id: s.sessionId,
        session_name: s.sessionName,
        location_id: s.locationId,
        status: s.status,
        count_type: s.countType,
        started_at: s.startedAt,
        completed_at: s.completedAt,
        finalized_at: s.finalizedAt,
        total_items: s.totalItems,
        counted_items: s.countedItems,
        total_variance: toNumber(s.totalVariance),
        variance_percentage: toNumber(s.variancePercentage),
        notes: s.notes,
        variance_reports: includeItems
          ? sessionReports.map((r) => ({
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
      };
    }),
  };
}

function buildVarianceAnalysisReport(
  varianceReports: Array<{
    variance: { toNumber: () => number } | null;
    variancePct: { toNumber: () => number } | null;
    itemId: string;
    itemNumber: string;
    itemName: string;
  }>
): Record<string, unknown> {
  const varianceAnalysis = {
    total_variances: varianceReports.length,
    overages: varianceReports.filter((r) => {
      const v = toNumber(r.variance);
      return v !== null && v > 0;
    }).length,
    shortages: varianceReports.filter((r) => {
      const v = toNumber(r.variance);
      return v !== null && v < 0;
    }).length,
    accurate: varianceReports.filter((r) => !toNumber(r.variance)).length,
    by_severity: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
    top_variance_items: [] as Array<{
      item_id: string;
      item_number: string;
      item_name: string;
      total_variance: number;
      occurrences: number;
    }>,
  };

  // Calculate severity breakdown
  for (const report of varianceReports) {
    const variancePct = toNumber(report.variancePct) || 0;
    const severity = getSeverity(variancePct);
    varianceAnalysis.by_severity[severity]++;
  }

  // Top variance items
  const itemVarianceMap = new Map<
    string,
    {
      item_id: string;
      item_number: string;
      item_name: string;
      total_variance: number;
      occurrences: number;
    }
  >();

  for (const report of varianceReports) {
    const existing = itemVarianceMap.get(report.itemId) || {
      item_id: report.itemId,
      item_number: report.itemNumber,
      item_name: report.itemName,
      total_variance: 0,
      occurrences: 0,
    };
    existing.total_variance += Math.abs(toNumber(report.variance) || 0);
    existing.occurrences++;
    itemVarianceMap.set(report.itemId, existing);
  }

  varianceAnalysis.top_variance_items = Array.from(itemVarianceMap.values())
    .sort((a, b) => b.total_variance - a.total_variance)
    .slice(0, 20);

  return varianceAnalysis;
}

function buildTrendAnalysisReport(
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
): Record<string, unknown> {
  const trendMap = new Map<
    string,
    {
      period: string;
      sessions: number;
      items: number;
      avg_accuracy: number;
      total_variance: number;
    }
  >();

  for (const session of sessions) {
    if (!session.finalizedAt) {
      continue;
    }

    const periodKey = getPeriodKey(new Date(session.finalizedAt), groupBy);

    const existing = trendMap.get(periodKey) || {
      period: periodKey,
      sessions: 0,
      items: 0,
      avg_accuracy: 0,
      total_variance: 0,
    };

    existing.sessions++;
    existing.items += session.countedItems;
    existing.total_variance += Math.abs(toNumber(session.totalVariance) || 0);

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

    const periodReports = varianceReports.filter((r) => {
      const sess = sessions.find((s) => s.id === r.sessionId);
      if (!sess?.finalizedAt) {
        return false;
      }
      return getPeriodKey(new Date(sess.finalizedAt), groupBy) === periodKey;
    });

    const scores = periodReports
      .map((r) => toNumber(r.accuracyScore))
      .filter((s): s is number => s !== null);

    trendPoint.avg_accuracy =
      scores.length > 0
        ? Math.round(
            (scores.reduce((sum, s) => sum + s, 0) / scores.length) * 100
          ) / 100
        : 100;
  }

  return {
    group_by: groupBy,
    trend: Array.from(trendMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    ),
  };
}

/**
 * POST /api/inventory/audit/reports - Generate custom report with specific parameters
 */
export async function POST(request: Request) {
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

    const body: CustomReportRequest = await request.json();
    const {
      name,
      description,
      report_type,
      filters,
      group_by = "day",
      include_items = false,
      save_report = false,
    } = body;

    // Build date filter
    const dateFilter: DateRangeFilter = {};
    if (filters.startDate) {
      dateFilter.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      dateFilter.lte = new Date(filters.endDate);
    }

    // Build session where clause
    const sessionWhere: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (Object.keys(dateFilter).length > 0) {
      sessionWhere.finalizedAt = dateFilter;
    }

    if (filters.locationId) {
      sessionWhere.locationId = filters.locationId;
    }

    // Get sessions based on report type
    let sessionStatusFilter = {};
    if (report_type === "summary" || report_type === "trend_analysis") {
      sessionStatusFilter = { status: "finalized" };
    }

    const sessions = await database.cycleCountSession.findMany({
      where: { ...sessionWhere, ...sessionStatusFilter },
      select: {
        id: true,
        sessionId: true,
        sessionName: true,
        locationId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        finalizedAt: true,
        totalItems: true,
        countedItems: true,
        totalVariance: true,
        variancePercentage: true,
        countType: true,
        notes: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get variance reports for detailed analysis
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
        notes: true,
        generatedAt: true,
      },
    });

    // Build report based on type
    let reportData: Record<string, unknown> = {};

    switch (report_type) {
      case "summary":
        reportData = buildSummaryReport(sessions);
        break;

      case "detailed":
        reportData = buildDetailedReport(
          sessions,
          varianceReports,
          include_items
        );
        break;

      case "variance_analysis":
        reportData = buildVarianceAnalysisReport(varianceReports);
        break;

      case "trend_analysis":
        reportData = buildTrendAnalysisReport(
          sessions,
          varianceReports,
          group_by
        );
        break;

      default:
        reportData = buildSummaryReport(sessions);
        break;
    }

    // Save report if requested
    let savedReportId: string | null = null;
    if (save_report) {
      const savedReport = await database.report.create({
        data: {
          tenantId,
          name,
          description: description || null,
          reportType: `inventory_audit_${report_type}`,
          query_config: {
            filters,
            group_by,
            include_items,
            generated_at: new Date().toISOString(),
          } as unknown as Prisma.InputJsonValue,
          display_config: {} as unknown as Prisma.InputJsonValue,
          is_system: false,
          created_by: null,
        },
      });
      savedReportId = savedReport.id;
    }

    return NextResponse.json({
      data: {
        report_name: name,
        report_type,
        generated_at: new Date().toISOString(),
        filters_applied: filters,
        saved_report_id: savedReportId,
        ...reportData,
      },
    });
  } catch (error) {
    console.error("Failed to generate custom audit report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
