"use server";

import "server-only";

import {
  listCateringOrders,
  listEvents,
  listEventProfitabilities,
  listWasteEntries,
} from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "../../../../lib/tenant";

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

  await getTenantIdForOrg(orgId);

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const _previousMonthStart = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1
  );
  const currentYearStart = new Date(now.getFullYear(), 0, 1);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

  const [orders, events, profitabilities, wasteEntries] = await Promise.all([
    (await listCateringOrders()).data,
    (await listEvents()).data,
    (await listEventProfitabilities()).data,
    (await listWasteEntries()).data,
  ]);

  const revenueByMonthMap = new Map<string, number>();
  for (const order of orders) {
    if (order.orderDate < twelveMonthsAgo || order.orderDate > now) continue;
    const month = order.orderDate.toISOString().slice(0, 7);
    revenueByMonthMap.set(
      month,
      (revenueByMonthMap.get(month) ?? 0) + Number(order.totalAmount ?? 0)
    );
  }
  const revenueData: RevenueRow[] = [];
  for (let i = 12; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = monthDate.toISOString().slice(0, 7);
    revenueData.push({
      month,
      revenue: revenueByMonthMap.get(month) ?? 0,
      forecast: null,
    });
  }

  const currentMonthProfitabilities = profitabilities.filter(
    (row) => row.calculatedAt >= currentMonthStart && row.calculatedAt <= now
  );
  const utilizationData: UtilizationRow[] = [
    {
      budgeted_labor: currentMonthProfitabilities.reduce(
        (sum, row) => sum + Number(row.budgetedLaborCost ?? 0),
        0
      ),
      actual_labor: currentMonthProfitabilities.reduce(
        (sum, row) => sum + Number(row.actualLaborCost ?? 0),
        0
      ),
    },
  ];

  const profitabilityByMonthMap = new Map<string, number[]>();
  for (const row of profitabilities) {
    if (row.calculatedAt < twelveMonthsAgo || row.calculatedAt > now) continue;
    const month = row.calculatedAt.toISOString().slice(0, 7);
    const rows = profitabilityByMonthMap.get(month) ?? [];
    rows.push(Number(row.actualGrossMarginPct ?? 0));
    profitabilityByMonthMap.set(month, rows);
  }
  const profitabilityData: ProfitabilityRow[] = [];
  for (let i = 12; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = monthDate.toISOString().slice(0, 7);
    const rows = profitabilityByMonthMap.get(month) ?? [];
    profitabilityData.push({
      month,
      gross_margin_pct:
        rows.length > 0 ? rows.reduce((sum, value) => sum + value, 0) / rows.length : 0,
    });
  }

  const pipelineEvents = events.filter(
    (event) =>
      event.createdAt >= currentMonthStart &&
      ["lead", "tentative", "confirmed"].includes(String(event.status))
  );
  const pipelineData: PipelineRow[] = [
    {
      total_value: pipelineEvents.reduce((sum, row) => sum + Number(row.budget ?? 0), 0),
      qualified_count: pipelineEvents.length,
      proposals_sent: pipelineEvents.filter((row) =>
        ["confirmed", "tentative"].includes(String(row.status))
      ).length,
      won_count: pipelineEvents.filter((row) => String(row.status) === "confirmed").length,
      avg_days_to_close: 0,
    },
  ];

  const opsEvents = events.filter(
    (event) => event.eventDate >= twelveMonthsAgo && event.eventDate <= now
  );
  const wasteTotal = wasteEntries
    .filter((row) => row.loggedAt >= twelveMonthsAgo && row.loggedAt <= now)
    .reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0);
  const foodCostTotal = profitabilities
    .filter((row) => row.calculatedAt >= twelveMonthsAgo && row.calculatedAt <= now)
    .reduce((sum, row) => sum + Number(row.actualFoodCost ?? 0), 0);
  const operationalHealthData: OperationalHealthRow[] = [
    {
      on_time_rate:
        opsEvents.length > 0
          ? (opsEvents.filter((event) => String(event.status) === "completed").length /
              opsEvents.length) *
            100
          : 0,
      satisfaction_score: 0,
      retention_rate: 0,
      waste_pct: foodCostTotal > 0 ? (wasteTotal / foodCostTotal) * 100 : 0,
    },
  ];

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
