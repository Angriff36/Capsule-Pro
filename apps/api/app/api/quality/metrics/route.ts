// Quality Metrics API route
// Provides aggregated quality metrics with trend analysis for dashboards

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface TrendDataPoint {
  date: string;
  period: string;
  totalInspections: number;
  passedInspections: number;
  failedInspections: number;
  overallPassRate: number;
  openCorrectiveActions: number;
  closedCorrectiveActions: number;
  avgPassRate: number;
  criticalIssues: number;
}

interface CategoryBreakdown {
  category: string;
  totalInspections: number;
  avgPassRate: number;
  failedItems: number;
  trend: "up" | "down" | "stable";
}

interface SeverityBreakdown {
  severity: string;
  count: number;
  percentage: number;
}

interface PerformanceBenchmarks {
  overallPassRate: number;
  targetPassRate: number;
  onTarget: boolean;
  avgResponseTime: number; // hours to complete corrective actions
  avgInspectionTime: number; // hours to complete inspections
  completionRate: number;
}

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId");
    const period = searchParams.get("period") || "30"; // days
    const includeTrends = searchParams.get("includeTrends") === "true";

    const days = Number.parseInt(period, 10);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    // Build location filter
    const locationFilter = locationId
      ? `AND qi.location_id = ${locationId}::uuid`
      : "";

    // Current period summary
    const [currentSummary, previousSummary, categoryData, severityData] =
      await Promise.all([
        // Current period metrics
        database.$queryRaw<
          Array<{
            total_inspections: bigint;
            passed_inspections: bigint;
            failed_inspections: bigint;
            overall_pass_rate: number;
            open_corrective_actions: bigint;
            closed_corrective_actions: bigint;
            critical_issues: bigint;
            avg_pass_rate: number;
          }>
        >(
          database.$queryRawUnsafe(`
            SELECT
              COUNT(*)::bigint as total_inspections,
              SUM(CASE WHEN qi.status = 'approved' THEN 1 ELSE 0 END)::bigint as passed_inspections,
              SUM(CASE WHEN qi.status = 'rejected' OR qi.failed_items > 0 THEN 1 ELSE 0 END)::bigint as failed_inspections,
              COALESCE(AVG(qi.pass_rate), 0)::numeric as overall_pass_rate,
              (SELECT COUNT(*)::bigint FROM tenant_kitchen.corrective_actions ca
               WHERE ca.tenant_id = '${tenantId}'::uuid
                 AND ca.status IN ('open', 'in_progress')
                 AND ca.created_at >= '${startDate.toISOString()}'::timestamptz
                 ${locationId}) as open_corrective_actions,
              (SELECT COUNT(*)::bigint FROM tenant_kitchen.corrective_actions ca
               WHERE ca.tenant_id = '${tenantId}'::uuid
                 AND ca.status = 'closed'
                 AND ca.created_at >= '${startDate.toISOString()}'::timestamptz
                 ${locationId}) as closed_corrective_actions,
              (SELECT COUNT(*)::bigint FROM tenant_kitchen.corrective_actions ca
               WHERE ca.tenant_id = '${tenantId}'::uuid
                 AND ca.severity IN ('critical', 'high')
                 AND ca.status IN ('open', 'in_progress')
                 ${locationId}) as critical_issues,
              COALESCE(AVG(qi.pass_rate), 0)::numeric as avg_pass_rate
            FROM tenant_kitchen.quality_inspections qi
            WHERE qi.tenant_id = '${tenantId}'::uuid
              AND qi.deleted_at IS NULL
              AND qi.completed_at IS NOT NULL
              AND qi.completed_at >= '${startDate.toISOString()}'::timestamptz
              ${locationId}
          `)
        ),

        // Previous period for comparison
        database.$queryRaw<
          Array<{
            total_inspections: bigint;
            overall_pass_rate: number;
          }>
        >(
          database.$queryRawUnsafe(`
            SELECT
              COUNT(*)::bigint as total_inspections,
              COALESCE(AVG(qi.pass_rate), 0)::numeric as overall_pass_rate
            FROM tenant_kitchen.quality_inspections qi
            WHERE qi.tenant_id = '${tenantId}'::uuid
              AND qi.deleted_at IS NULL
              AND qi.completed_at IS NOT NULL
              AND qi.completed_at >= '${previousStartDate.toISOString()}'::timestamptz
              AND qi.completed_at < '${startDate.toISOString()}'::timestamptz
              ${locationId}
          `)
        ),

        // Category breakdown
        database.$queryRaw<
          Array<{
            category: string;
            total_inspections: bigint;
            avg_pass_rate: number;
            failed_items: bigint;
          }>
        >(
          database.$queryRawUnsafe(`
            SELECT
              qc.category,
              COUNT(qi.id)::bigint as total_inspections,
              COALESCE(AVG(qi.pass_rate), 0)::numeric as avg_pass_rate,
              COALESCE(SUM(qi.failed_items), 0)::bigint as failed_items
            FROM tenant_kitchen.quality_inspections qi
            LEFT JOIN tenant_kitchen.quality_checklists qc
              ON qi.checklist_id = qc.id AND qi.tenant_id = qc.tenant_id
            WHERE qi.tenant_id = '${tenantId}'::uuid
              AND qi.deleted_at IS NULL
              AND qi.completed_at IS NOT NULL
              AND qi.completed_at >= '${startDate.toISOString()}'::timestamptz
              ${locationId}
            GROUP BY qc.category
            ORDER BY total_inspections DESC
          `)
        ),

        // Severity breakdown for corrective actions
        database.$queryRaw<
          Array<{
            severity: string;
            count: bigint;
          }>
        >(
          database.$queryRawUnsafe(`
            SELECT
              ca.severity,
              COUNT(*)::bigint as count
            FROM tenant_kitchen.corrective_actions ca
            WHERE ca.tenant_id = '${tenantId}'::uuid
              AND ca.deleted_at IS NULL
              AND ca.status IN ('open', 'in_progress')
              ${locationId}
            GROUP BY ca.severity
            ORDER BY
              CASE ca.severity
                WHEN 'critical' THEN 1
                WHEN 'high' THEN 2
                WHEN 'medium' THEN 3
                WHEN 'low' THEN 4
              END
          `)
        ),
      ]);

    const current = currentSummary[0] || {
      total_inspections: 0n,
      passed_inspections: 0n,
      failed_inspections: 0n,
      overall_pass_rate: 0,
      open_corrective_actions: 0n,
      closed_corrective_actions: 0n,
      critical_issues: 0n,
      avg_pass_rate: 0,
    };

    const previous = previousSummary[0] || {
      total_inspections: 0n,
      overall_pass_rate: 0,
    };

    // Calculate trends
    const totalInspectionsTrend =
      Number(previous.total_inspections) > 0
        ? ((Number(current.total_inspections) -
            Number(previous.total_inspections)) /
            Number(previous.total_inspections)) *
          100
        : 0;

    const passRateTrend =
      previous.overall_pass_rate > 0
        ? current.overall_pass_rate - previous.overall_pass_rate
        : 0;

    // Process category breakdown with trend indicators
    const categoryBreakdown: CategoryBreakdown[] = categoryData.map((cat) => ({
      category: cat.category,
      totalInspections: Number(cat.total_inspections),
      avgPassRate: Number(cat.avg_pass_rate),
      failedItems: Number(cat.failed_items),
      trend:
        Number(cat.avg_pass_rate) >= 95
          ? ("up" as const)
          : Number(cat.avg_pass_rate) >= 80
            ? ("stable" as const)
            : ("down" as const),
    }));

    // Process severity breakdown
    const totalOpenActions = severityData.reduce(
      (sum, s) => sum + Number(s.count),
      0
    );
    const severityBreakdown: SeverityBreakdown[] = severityData.map((s) => ({
      severity: s.severity,
      count: Number(s.count),
      percentage:
        totalOpenActions > 0 ? (Number(s.count) / totalOpenActions) * 100 : 0,
    }));

    // Performance benchmarks
    const benchmarks = await database.$queryRaw<
      Array<{
        avg_completion_hours: number;
        avg_inspection_hours: number;
        completion_rate: number;
      }>
    >(
      database.$queryRawUnsafe(`
        SELECT
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (ca.completed_at - ca.created_at)) / 3600),
            0
          )::numeric as avg_completion_hours,
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (qi.completed_at - qi.started_at)) / 3600),
            0
          )::numeric as avg_inspection_hours,
          COALESCE(
            (COUNT(CASE WHEN qi.status = 'approved' THEN 1 END)::numeric /
             NULLIF(COUNT(*)::numeric, 0)) * 100,
            0
          )::numeric as completion_rate
        FROM tenant_kitchen.quality_inspections qi
        LEFT JOIN tenant_kitchen.corrective_actions ca
          ON qi.tenant_id = ca.tenant_id
          AND qi.id = ca.source_entity_id::text
        WHERE qi.tenant_id = '${tenantId}'::uuid
          AND qi.deleted_at IS NULL
          AND qi.completed_at >= '${startDate.toISOString()}'::timestamptz
          ${locationId}
      `)
    );

    const performanceBenchmarks: PerformanceBenchmarks = {
      overallPassRate: Number(current.overall_pass_rate),
      targetPassRate: 95, // Industry standard for quality control
      onTarget: Number(current.overall_pass_rate) >= 95,
      avgResponseTime: Number(benchmarks[0]?.avg_completion_hours ?? 0),
      avgInspectionTime: Number(benchmarks[0]?.avg_inspection_hours ?? 0),
      completionRate: Number(benchmarks[0]?.completion_rate ?? 0),
    };

    let trendData: TrendDataPoint[] = [];
    if (includeTrends) {
      // Daily trend data for the period
      trendData = await database.$queryRaw<
        Array<{
          date: string;
          period: string;
          total_inspections: bigint;
          passed_inspections: bigint;
          failed_inspections: bigint;
          overall_pass_rate: number;
          open_corrective_actions: bigint;
          closed_corrective_actions: bigint;
          avg_pass_rate: number;
          critical_issues: bigint;
        }>
      >(
        database.$queryRawUnsafe(`
          WITH date_series AS (
            SELECT generate_series(
              '${startDate.toISOString()}'::date,
              '${now.toISOString()}'::date,
              INTERVAL '1 day'
            )::date as date
          ),
          daily_inspections AS (
            SELECT
              ds.date,
              COUNT(qi.id)::bigint as total_inspections,
              SUM(CASE WHEN qi.status = 'approved' THEN 1 ELSE 0 END)::bigint as passed_inspections,
              SUM(CASE WHEN qi.status = 'rejected' OR qi.failed_items > 0 THEN 1 ELSE 0 END)::bigint as failed_inspections,
              COALESCE(AVG(qi.pass_rate), 0)::numeric as overall_pass_rate,
              COALESCE(AVG(qi.pass_rate), 0)::numeric as avg_pass_rate
            FROM date_series ds
            LEFT JOIN tenant_kitchen.quality_inspections qi
              ON qi.tenant_id = '${tenantId}'::uuid
              AND qi.deleted_at IS NULL
              AND DATE(qi.completed_at) = ds.date
              ${locationId.replace("AND", "AND DATE(qi.created_at) = ds.date")}
            GROUP BY ds.date
          ),
          daily_corrective AS (
            SELECT
              DATE(ca.created_at) as date,
              SUM(CASE WHEN ca.status IN ('open', 'in_progress') THEN 1 ELSE 0 END)::bigint as open_corrective_actions,
              SUM(CASE WHEN ca.status = 'closed' THEN 1 ELSE 0 END)::bigint as closed_corrective_actions,
              SUM(CASE WHEN ca.severity IN ('critical', 'high') AND ca.status IN ('open', 'in_progress') THEN 1 ELSE 0 END)::bigint as critical_issues
            FROM tenant_kitchen.corrective_actions ca
            WHERE ca.tenant_id = '${tenantId}'::uuid
              AND ca.deleted_at IS NULL
              AND ca.created_at >= '${startDate.toISOString()}'::timestamptz
              ${locationId.replace("AND", "AND DATE(ca.created_at) = ds.date")}
            GROUP BY DATE(ca.created_at)
          )
          SELECT
            to_char(di.date, 'YYYY-MM-DD') as date,
            to_char(di.date, 'Mon DD') as period,
            COALESCE(di.total_inspections, 0)::bigint as total_inspections,
            COALESCE(di.passed_inspections, 0)::bigint as passed_inspections,
            COALESCE(di.failed_inspections, 0)::bigint as failed_inspections,
            COALESCE(di.overall_pass_rate, 0)::numeric as overall_pass_rate,
            COALESCE(dc.open_corrective_actions, 0)::bigint as open_corrective_actions,
            COALESCE(dc.closed_corrective_actions, 0)::bigint as closed_corrective_actions,
            COALESCE(di.avg_pass_rate, 0)::numeric as avg_pass_rate,
            COALESCE(dc.critical_issues, 0)::bigint as critical_issues
          FROM date_series ds
          LEFT JOIN daily_inspections di ON ds.date = di.date
          LEFT JOIN daily_corrective dc ON ds.date = dc.date
          ORDER BY ds.date
        `)
      );

      // Convert BigInt fields to numbers for JSON serialization
      trendData = trendData.map((d) => ({
        date: d.date,
        period: d.period,
        totalInspections: Number(d.total_inspections),
        passedInspections: Number(d.passed_inspections),
        failedInspections: Number(d.failed_inspections),
        overallPassRate: Number(d.overall_pass_rate),
        openCorrectiveActions: Number(d.open_corrective_actions),
        closedCorrectiveActions: Number(d.closed_corrective_actions),
        avgPassRate: Number(d.avg_pass_rate),
        criticalIssues: Number(d.critical_issues),
      })) as TrendDataPoint[];
    }

    return manifestSuccessResponse({
      summary: {
        totalInspections: Number(current.total_inspections),
        passedInspections: Number(current.passed_inspections),
        failedInspections: Number(current.failed_inspections),
        overallPassRate: Number(current.overall_pass_rate),
        openCorrectiveActions: Number(current.open_corrective_actions),
        closedCorrectiveActions: Number(current.closed_corrective_actions),
        criticalIssues: Number(current.critical_issues),
        avgPassRate: Number(current.avg_pass_rate),
      },
      trends: {
        totalInspectionsTrend,
        passRateTrend,
      },
      categoryBreakdown,
      severityBreakdown,
      performanceBenchmarks,
      trendData: includeTrends ? trendData : undefined,
      period: {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        days,
      },
    });
  } catch (error) {
    console.error("Error fetching quality metrics:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
