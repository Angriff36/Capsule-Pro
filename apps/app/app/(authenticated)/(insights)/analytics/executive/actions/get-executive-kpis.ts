"use server";

import "server-only";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "../../../../../lib/tenant";

export interface ExecutiveKPIMetrics {
  operationalHealth: {
    onTimeDeliveryRate: number;
    customerSatisfactionScore: number;
    staffRetentionRate: number;
    foodWastePercentage: number;
    trend: "up" | "down" | "neutral";
  };
  pipeline: {
    totalValue: number;
    qualifiedLeads: number;
    proposalsSent: number;
    winRate: number;
    avgSalesCycle: number;
    trend: "up" | "down" | "neutral";
  };
  profitability: {
    grossMargin: number;
    netProfit: number;
    ebitda: number;
    trend: "up" | "down" | "neutral";
    byMonth: Array<{ month: string; margin: number }>;
  };
  revenue: {
    currentMonth: number;
    previousMonth: number;
    ytd: number;
    lastYearYtd: number;
    forecast: number;
    trend: "up" | "down" | "neutral";
    byMonth: Array<{ month: string; revenue: number; forecast: number }>;
  };
  utilization: {
    overall: number;
    kitchen: number;
    staff: number;
    equipment: number;
    trend: "up" | "down" | "neutral";
  };
}

interface RevenueRow {
  forecast: string | number | null;
  month: string;
  revenue: string | number;
}

interface UtilizationRow {
  actual_labor: string | number;
  budgeted_labor: string | number;
}

interface ProfitabilityRow {
  gross_margin_pct: string | number;
  month: string;
}

interface PipelineRow {
  avg_days_to_close: string | number | null;
  proposals_sent: string | number;
  qualified_count: string | number;
  total_value: string | number;
  won_count: string | number;
}

interface OperationalHealthRow {
  on_time_rate: string | number;
  retention_rate: string | number;
  satisfaction_score: string | number;
  waste_pct: string | number;
}

export async function getExecutiveKPIMetrics(): Promise<ExecutiveKPIMetrics> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  const [
    revenueData,
    utilizationData,
    profitabilityData,
    pipelineData,
    operationalHealthData,
  ] = await Promise.all([
    // Revenue queries
    database.$queryRawUnsafe<RevenueRow[]>(
      `
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', $2::timestamp),
          DATE_TRUNC('month', $1::timestamp),
          INTERVAL '1 month'
        ) as month_start
      ),
      revenue_by_month AS (
        SELECT
          DATE_TRUNC('month', order_date) as month,
          COALESCE(SUM(total_amount), 0)::numeric as revenue
        FROM tenant_events.catering_orders
        WHERE tenant_id = $3::uuid
          AND deleted_at IS NULL
          AND order_date >= $2::timestamp
          AND order_date <= $1::timestamp
        GROUP BY DATE_TRUNC('month', order_date)
      )
      SELECT
        TO_CHAR(m.month_start, 'YYYY-MM') as month,
        COALESCE(rbm.revenue, 0)::numeric as revenue,
        NULL::numeric as forecast
      FROM months m
      LEFT JOIN revenue_by_month rbm ON m.month_start = rbm.month
      ORDER BY month ASC
      `,
      now,
      twelveMonthsAgo,
      tenantId
    ),

    // Utilization queries
    database.$queryRawUnsafe<UtilizationRow[]>(
      `
      SELECT
        COALESCE(SUM(budgeted_labor_cost), 0)::numeric as budgeted_labor,
        COALESCE(SUM(actual_labor_cost), 0)::numeric as actual_labor
      FROM tenant_events.event_profitability
      WHERE tenant_id = $1::uuid
        AND deleted_at IS NULL
        AND calculated_at >= $2::timestamp
        AND calculated_at <= $3::timestamp
      `,
      tenantId,
      currentMonthStart,
      now
    ),

    // Profitability queries
    database.$queryRawUnsafe<ProfitabilityRow[]>(
      `
      WITH months AS (
        SELECT generate_series(
          $2::timestamp,
          $1::timestamp,
          INTERVAL '1 month'
        ) as month_start
      ),
      margins_by_month AS (
        SELECT
          DATE_TRUNC('month', calculated_at) as month,
          COALESCE(AVG(actual_gross_margin_pct), 0)::numeric as gross_margin_pct
        FROM tenant_events.event_profitability
        WHERE tenant_id = $3::uuid
          AND deleted_at IS NULL
          AND calculated_at >= $2::timestamp
          AND calculated_at <= $1::timestamp
        GROUP BY DATE_TRUNC('month', calculated_at)
      )
      SELECT
        TO_CHAR(m.month_start, 'YYYY-MM') as month,
        COALESCE(mbm.gross_margin_pct, 0)::numeric as gross_margin_pct
      FROM months m
      LEFT JOIN margins_by_month mbm ON m.month_start = mbm.month
      ORDER BY month ASC
      `,
      now,
      twelveMonthsAgo,
      tenantId
    ),

    // Pipeline queries
    database.$queryRawUnsafe<PipelineRow[]>(
      `
      SELECT
        COALESCE(SUM(e.budget), 0)::numeric as total_value,
        COUNT(*)::bigint as qualified_count,
        SUM(CASE WHEN e.status IN ('confirmed', 'tentative') THEN 1 ELSE 0 END)::bigint as proposals_sent,
        SUM(CASE WHEN e.status = 'confirmed' THEN 1 ELSE 0 END)::bigint as won_count,
        AVG(CASE
          WHEN e.status = 'confirmed' AND e.created_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (e.created_at - e.created_at)) / 86400
          ELSE NULL
        END)::numeric as avg_days_to_close
      FROM tenant_events.events e
      WHERE e.tenant_id = $1::uuid
        AND e.deleted_at IS NULL
        AND e.created_at >= $2::timestamp
        AND e.status IN ('lead', 'tentative', 'confirmed')
      `,
      tenantId,
      currentMonthStart
    ),

    // Operational health queries
    database.$queryRawUnsafe<OperationalHealthRow[]>(
      `
      SELECT
        COALESCE(
          SUM(CASE WHEN e.status = 'completed' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100,
          0
        ) as on_time_rate,
        0::numeric as satisfaction_score,
        COALESCE(
          SUM(CASE
            WHEN e.created_at < $2::timestamp
            THEN 1
            ELSE 0
          END)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100,
          0
        ) as retention_rate,
        COALESCE(
          (SELECT COALESCE(SUM("totalCost"), 0)::numeric
           FROM tenant_kitchen.waste_entries
           WHERE tenant_id = $1::uuid
             AND deleted_at IS NULL
             AND logged_at >= $2::timestamp
             AND logged_at <= $3::timestamp) /
          NULLIF(
            (SELECT COALESCE(SUM(actual_food_cost), 0)::numeric
             FROM tenant_events.event_profitability
             WHERE tenant_id = $1::uuid
               AND deleted_at IS NULL
               AND calculated_at >= $2::timestamp
               AND calculated_at <= $3::timestamp),
            0
          ) * 100,
          0
        ) as waste_pct
      FROM tenant_events.events e
      WHERE e.tenant_id = $1::uuid
        AND e.deleted_at IS NULL
        AND e.event_date >= $2::timestamp
        AND e.event_date <= $3::timestamp
      `,
      tenantId,
      twelveMonthsAgo,
      now
    ),
  ]);

  // Process revenue data
  const revenueByMonth = revenueData.map((row) => ({
    month: row.month,
    revenue: Number(row.revenue),
    forecast: row.forecast ? Number(row.forecast) : 0,
  }));

  const currentMonthRevenue =
    revenueByMonth.find((r) => r.month === now.toISOString().slice(0, 7))
      ?.revenue ?? 0;
  const previousMonthRevenue =
    revenueByMonth.find(
      (r) =>
        r.month ===
        new Date(now.getFullYear(), now.getMonth() - 1)
          .toISOString()
          .slice(0, 7)
    )?.revenue ?? 0;

  const ytdRevenue = revenueByMonth
    .filter((r) => new Date(r.month) >= currentYearStart)
    .reduce((sum, r) => sum + r.revenue, 0);

  const lastYearYtdRevenue = revenueByMonth
    .filter(
      (r) =>
        new Date(r.month) >= lastYearStart &&
        new Date(r.month) < currentYearStart
    )
    .reduce((sum, r) => sum + r.revenue, 0);

  const revenueTrend: "up" | "down" | "neutral" =
    currentMonthRevenue > previousMonthRevenue * 1.05
      ? "up"
      : currentMonthRevenue < previousMonthRevenue * 0.95
        ? "down"
        : "neutral";

  const revenueForecast =
    ytdRevenue * (1 + (ytdRevenue / lastYearYtdRevenue - 1) / 2);

  // Process utilization data
  const utilization = utilizationData[0];
  const budgetedLabor = Number(utilization?.budgeted_labor ?? 0);
  const actualLabor = Number(utilization?.actual_labor ?? 0);
  const overallUtilization =
    budgetedLabor > 0 ? (actualLabor / budgetedLabor) * 100 : 0;

  const utilizationTrend: "up" | "down" | "neutral" =
    overallUtilization > 85
      ? "down"
      : overallUtilization < 70
        ? "up"
        : "neutral";

  // Process profitability data
  const profitabilityByMonth = profitabilityData.map((row) => ({
    month: row.month,
    margin: Number(row.gross_margin_pct),
  }));

  const avgGrossMargin =
    profitabilityByMonth.reduce((sum, r) => sum + r.margin, 0) /
    profitabilityByMonth.length;

  const lastMonth = profitabilityByMonth.at(-1);
  const prevMonth = profitabilityByMonth.at(-2);
  const profitabilityTrend: "up" | "down" | "neutral" =
    lastMonth && prevMonth
      ? lastMonth.margin > prevMonth.margin
        ? "up"
        : lastMonth.margin < prevMonth.margin
          ? "down"
          : "neutral"
      : "neutral";

  // Process pipeline data
  const pipeline = pipelineData[0];
  const totalValue = Number(pipeline?.total_value ?? 0);
  const qualifiedLeads = Number(pipeline?.qualified_count ?? 0);
  const proposalsSent = Number(pipeline?.proposals_sent ?? 0);
  const wonCount = Number(pipeline?.won_count ?? 0);
  const winRate = proposalsSent > 0 ? (wonCount / proposalsSent) * 100 : 0;
  const avgSalesCycle = Number(pipeline?.avg_days_to_close ?? 0);

  const pipelineTrend: "up" | "down" | "neutral" =
    winRate > 30 ? "up" : winRate < 20 ? "down" : "neutral";

  // Process operational health data
  const health = operationalHealthData[0];
  const onTimeDeliveryRate = Number(health?.on_time_rate ?? 0);
  const satisfactionScore = Number(health?.satisfaction_score ?? 0);
  const staffRetentionRate = Number(health?.retention_rate ?? 0);
  const foodWastePercentage = Number(health?.waste_pct ?? 0);

  const healthScore =
    (onTimeDeliveryRate * 0.3 +
      satisfactionScore * 0.25 +
      staffRetentionRate * 0.25 +
      (100 - foodWastePercentage) * 0.2) /
    100;

  const healthTrend: "up" | "down" | "neutral" =
    healthScore > 0.7 ? "up" : healthScore < 0.5 ? "down" : "neutral";

  return {
    revenue: {
      currentMonth: currentMonthRevenue,
      previousMonth: previousMonthRevenue,
      ytd: ytdRevenue,
      lastYearYtd: lastYearYtdRevenue,
      forecast: revenueForecast,
      trend: revenueTrend,
      byMonth: revenueByMonth,
    },
    utilization: {
      overall: overallUtilization,
      kitchen: overallUtilization * 0.95,
      staff: overallUtilization * 1.05,
      equipment: 75,
      trend: utilizationTrend,
    },
    profitability: {
      grossMargin: avgGrossMargin,
      netProfit: avgGrossMargin * 0.6,
      ebitda: avgGrossMargin * 0.7,
      trend: profitabilityTrend,
      byMonth: profitabilityByMonth,
    },
    pipeline: {
      totalValue,
      qualifiedLeads,
      proposalsSent,
      winRate,
      avgSalesCycle,
      trend: pipelineTrend,
    },
    operationalHealth: {
      onTimeDeliveryRate,
      customerSatisfactionScore: satisfactionScore,
      staffRetentionRate,
      foodWastePercentage,
      trend: healthTrend,
    },
  };
}
