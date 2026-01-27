import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type CurrentMetrics = {
  total_events: string;
  budgeted_revenue: string;
  actual_revenue: string;
  budgeted_food_cost: string;
  actual_food_cost: string;
  budgeted_labor_cost: string;
  actual_labor_cost: string;
  budgeted_other_cost: string;
  actual_other_cost: string;
};

type PreviousMetrics = {
  total_events: string;
  budgeted_revenue: string;
  actual_revenue: string;
  actual_food_cost: string;
  actual_labor_cost: string;
};

type LedgerData = {
  pending_proposals: string;
  active_contracts: string;
  deposits_received: string;
};

type FinanceMetrics = {
  budgetedRevenue: number;
  actualRevenue: number;
  budgetedFoodCost: number;
  actualFoodCost: number;
  budgetedLaborCost: number;
  actualLaborCost: number;
  budgetedOtherCost: number;
  actualOtherCost: number;
  previousRevenue: number;
  previousFoodCost: number;
  previousLaborCost: number;
  totalCost: number;
  grossProfitMargin: number;
};

function calculateDateRange(period: string) {
  const now = new Date();
  const startDate = new Date();
  const previousStartDate = new Date();

  switch (period) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      previousStartDate.setDate(now.getDate() - 14);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      previousStartDate.setDate(now.getDate() - 60);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      previousStartDate.setDate(now.getDate() - 180);
      break;
    case "12m":
      startDate.setFullYear(now.getFullYear() - 1);
      previousStartDate.setFullYear(now.getFullYear() - 2);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
      previousStartDate.setDate(now.getDate() - 60);
  }

  return { now, startDate, previousStartDate };
}

async function fetchCurrentPeriodMetrics(
  tenantId: string,
  startDate: Date,
  now: Date,
  locationId: string | null
) {
  return await database.$queryRawUnsafe<CurrentMetrics[]>(
    `
    SELECT
      COUNT(*)::int as total_events,
      COALESCE(SUM(ep.budgeted_revenue), 0)::numeric as budgeted_revenue,
      COALESCE(SUM(ep.actual_revenue), 0)::numeric as actual_revenue,
      COALESCE(SUM(ep.budgeted_food_cost), 0)::numeric as budgeted_food_cost,
      COALESCE(SUM(ep.actual_food_cost), 0)::numeric as actual_food_cost,
      COALESCE(SUM(ep.budgeted_labor_cost), 0)::numeric as budgeted_labor_cost,
      COALESCE(SUM(ep.actual_labor_cost), 0)::numeric as actual_labor_cost,
      COALESCE(SUM(ep.actual_beverage_cost + ep.actual_rentals_cost + ep.actual_other_cost), 0)::numeric as budgeted_other_cost,
      COALESCE(SUM(ep.actual_beverage_cost + ep.actual_rentals_cost + ep.actual_other_cost), 0)::numeric as actual_other_cost
    FROM tenant_events.event_profitability ep
    JOIN tenant_events.events e ON ep.tenant_id = e.tenant_id AND ep.event_id = e.id
    WHERE ep.tenant_id = $1
      AND e.event_date >= $2
      AND e.event_date <= $3
      AND ep.deleted_at IS NULL
      AND e.deleted_at IS NULL
    ${locationId ? "AND e.location_id = $4" : ""}
    `,
    locationId
      ? [tenantId, startDate, now, locationId]
      : [tenantId, startDate, now]
  );
}

async function fetchPreviousPeriodMetrics(
  tenantId: string,
  previousStartDate: Date,
  startDate: Date,
  locationId: string | null
) {
  return await database.$queryRawUnsafe<PreviousMetrics[]>(
    `
    SELECT
      COUNT(*)::int as total_events,
      COALESCE(SUM(ep.budgeted_revenue), 0)::numeric as budgeted_revenue,
      COALESCE(SUM(ep.actual_revenue), 0)::numeric as actual_revenue,
      COALESCE(SUM(ep.actual_food_cost), 0)::numeric as actual_food_cost,
      COALESCE(SUM(ep.actual_labor_cost), 0)::numeric as actual_labor_cost
    FROM tenant_events.event_profitability ep
    JOIN tenant_events.events e ON ep.tenant_id = e.tenant_id AND ep.event_id = e.id
    WHERE ep.tenant_id = $1
      AND e.event_date >= $2
      AND e.event_date < $3
      AND ep.deleted_at IS NULL
      AND e.deleted_at IS NULL
    ${locationId ? "AND e.location_id = $4" : ""}
    `,
    locationId
      ? [tenantId, previousStartDate, startDate, locationId]
      : [tenantId, previousStartDate, startDate]
  );
}

async function fetchLedgerData(
  tenantId: string,
  startDate: Date,
  now: Date,
  locationId: string | null
) {
  return await database.$queryRawUnsafe<LedgerData[]>(
    `
    SELECT
      (
        SELECT COALESCE(COUNT(*), 0)::int
        FROM tenant_crm.proposals
        WHERE tenant_id = $1
          AND status = 'pending'
          AND deleted_at IS NULL
      ) as pending_proposals,
      (
        SELECT COALESCE(SUM(ec.total_value), 0)::numeric
        FROM tenant_events.event_contracts ec
        JOIN tenant_events.events e ON ec.tenant_id = e.tenant_id AND ec.event_id = e.id
        WHERE ec.tenant_id = $1
          AND ec.status = 'active'
          AND ec.deleted_at IS NULL
          AND e.deleted_at IS NULL
          ${locationId ? "AND e.location_id = $4" : ""}
      ) as active_contracts,
      (
        SELECT COALESCE(SUM(ec.total_value * 0.5), 0)::numeric
        FROM tenant_events.event_contracts ec
        JOIN tenant_events.events e ON ec.tenant_id = e.tenant_id AND ec.event_id = e.id
        WHERE ec.tenant_id = $1
          AND ec.deposit_paid = true
          AND e.event_date >= $2
          AND e.event_date <= $3
          AND ec.deleted_at IS NULL
          AND e.deleted_at IS NULL
          ${locationId ? "AND e.location_id = $4" : ""}
      ) as deposits_received
    `,
    locationId
      ? [tenantId, startDate, now, locationId]
      : [tenantId, startDate, now]
  );
}

async function fetchBudgetAlerts(tenantId: string) {
  return await database.budgetAlert.findMany({
    where: {
      tenantId,
      resolvedAt: null,
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

function calculateMetrics(
  current: CurrentMetrics,
  previous: PreviousMetrics
): FinanceMetrics {
  const budgetedRevenue = Number(current.budgeted_revenue);
  const actualRevenue = Number(current.actual_revenue);
  const budgetedFoodCost = Number(current.budgeted_food_cost);
  const actualFoodCost = Number(current.actual_food_cost);
  const budgetedLaborCost = Number(current.budgeted_labor_cost);
  const actualLaborCost = Number(current.actual_labor_cost);
  const budgetedOtherCost = Number(current.budgeted_other_cost);
  const actualOtherCost = Number(current.actual_other_cost);

  const previousRevenue = Number(previous.actual_revenue);
  const previousFoodCost = Number(previous.actual_food_cost);
  const previousLaborCost = Number(previous.actual_labor_cost);

  const totalCost = actualFoodCost + actualOtherCost;
  const grossProfitMargin =
    actualRevenue > 0
      ? ((actualRevenue - totalCost - actualLaborCost) / actualRevenue) * 100
      : 0;

  return {
    budgetedRevenue,
    actualRevenue,
    budgetedFoodCost,
    actualFoodCost,
    budgetedLaborCost,
    actualLaborCost,
    budgetedOtherCost,
    actualOtherCost,
    previousRevenue,
    previousFoodCost,
    previousLaborCost,
    totalCost,
    grossProfitMargin,
  };
}

function calculateVariances(metrics: FinanceMetrics) {
  const revenueVariance =
    metrics.budgetedRevenue > 0
      ? ((metrics.actualRevenue - metrics.budgetedRevenue) /
          metrics.budgetedRevenue) *
        100
      : 0;

  const cogsPercentage =
    metrics.actualRevenue > 0
      ? (metrics.totalCost / metrics.actualRevenue) * 100
      : 0;

  const previousTotalCost = metrics.previousFoodCost;
  const cogsTrend =
    metrics.previousRevenue > 0
      ? ((metrics.totalCost - previousTotalCost) / metrics.previousRevenue) *
        100
      : 0;

  const laborTrend =
    metrics.previousLaborCost > 0
      ? ((metrics.actualLaborCost - metrics.previousLaborCost) /
          metrics.previousLaborCost) *
        100
      : 0;

  return { revenueVariance, cogsPercentage, cogsTrend, laborTrend };
}

function getCOGSTrend(cogsPercentage: number, cogsTrend: number): string {
  let trendStr = "";
  if (cogsTrend > 0) {
    trendStr = ` (+${cogsTrend.toFixed(1)}%)`;
  } else if (cogsTrend < 0) {
    trendStr = ` (${cogsTrend.toFixed(1)}%)`;
  }
  return `${cogsPercentage.toFixed(1)}% of sales${trendStr}`;
}

function getLaborTrend(laborTrend: number): string {
  if (laborTrend > 0) {
    return `+${laborTrend.toFixed(1)}% vs. prior cycle`;
  }
  if (laborTrend < 0) {
    return `${laborTrend.toFixed(1)}% vs. prior cycle`;
  }
  return "No change";
}

function getAlertSeverity(utilization: number): "High" | "Medium" | "Low" {
  if (utilization >= 100) {
    return "High";
  }
  if (utilization >= 90) {
    return "Medium";
  }
  return "Low";
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function buildFinanceHighlights(
  metrics: FinanceMetrics,
  variances: ReturnType<typeof calculateVariances>
) {
  return [
    {
      label: "Revenue vs Budget",
      value:
        formatCurrency(metrics.actualRevenue) +
        " / " +
        formatCurrency(metrics.budgetedRevenue),
      trend:
        variances.revenueVariance >= 0
          ? `+${variances.revenueVariance.toFixed(1)}% ahead`
          : `${variances.revenueVariance.toFixed(1)}% behind`,
      isPositive: variances.revenueVariance >= 0,
    },
    {
      label: "Cost of goods sold",
      value: formatCurrency(metrics.totalCost),
      trend: getCOGSTrend(variances.cogsPercentage, variances.cogsTrend),
      isPositive: variances.cogsPercentage < 30,
    },
    {
      label: "Labor cadence",
      value: formatCurrency(metrics.actualLaborCost),
      trend: getLaborTrend(variances.laborTrend),
      isPositive: variances.laborTrend <= 0,
    },
  ];
}

function buildLedgerSummary(ledger: LedgerData) {
  return [
    {
      label: "Deposits cleared",
      amount: formatCurrency(Number(ledger.deposits_received)),
    },
    {
      label: "Active contracts",
      amount: formatCurrency(Number(ledger.active_contracts)),
    },
    {
      label: "Pending proposals",
      amount: Number(ledger.pending_proposals).toString(),
    },
  ];
}

function buildFinanceAlerts(
  alerts: Array<{
    message: string | null;
    alertType: string;
    utilization: bigint | number;
  }>
) {
  const financeAlerts = alerts.map((alert) => ({
    message: alert.message || `Budget alert: ${alert.alertType}`,
    severity: getAlertSeverity(Number(alert.utilization)),
  }));

  if (financeAlerts.length === 0) {
    financeAlerts.push(
      {
        message: "Review event budgets before next cycle.",
        severity: "Low" as const,
      },
      {
        message: "All financial metrics within normal range.",
        severity: "Low" as const,
      }
    );
  }

  return financeAlerts;
}

/**
 * GET /api/analytics/finance
 * Get finance analytics including revenue vs budget, COGS, labor costs, and ledger summary
 */
export async function GET(request: Request) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30d";
  const locationId = searchParams.get("locationId");

  const dateRange = calculateDateRange(period);

  try {
    const [
      currentPeriodMetrics,
      previousPeriodMetrics,
      ledgerData,
      budgetAlerts,
    ] = await Promise.all([
      fetchCurrentPeriodMetrics(
        tenantId,
        dateRange.startDate,
        dateRange.now,
        locationId
      ),
      fetchPreviousPeriodMetrics(
        tenantId,
        dateRange.previousStartDate,
        dateRange.startDate,
        locationId
      ),
      fetchLedgerData(tenantId, dateRange.startDate, dateRange.now, locationId),
      fetchBudgetAlerts(tenantId),
    ]);

    const current = currentPeriodMetrics[0] || {
      total_events: "0",
      budgeted_revenue: "0",
      actual_revenue: "0",
      budgeted_food_cost: "0",
      actual_food_cost: "0",
      budgeted_labor_cost: "0",
      actual_labor_cost: "0",
      budgeted_other_cost: "0",
      actual_other_cost: "0",
    };

    const previous = previousPeriodMetrics[0] || {
      total_events: "0",
      budgeted_revenue: "0",
      actual_revenue: "0",
      actual_food_cost: "0",
      actual_labor_cost: "0",
    };

    const metrics = calculateMetrics(current, previous);
    const variances = calculateVariances(metrics);
    const financeHighlights = buildFinanceHighlights(metrics, variances);
    const ledgerSummary = buildLedgerSummary(
      ledgerData[0] || {
        pending_proposals: "0",
        active_contracts: "0",
        deposits_received: "0",
      }
    );
    const financeAlerts = buildFinanceAlerts(
      budgetAlerts.map((alert) => ({
        ...alert,
        utilization: Number(alert.utilization),
      }))
    );

    return NextResponse.json({
      summary: {
        period,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.now.toISOString(),
        locationId: locationId || null,
      },
      financeHighlights,
      ledgerSummary,
      financeAlerts,
      metrics: {
        totalEvents: Number(current.total_events),
        budgetedRevenue: metrics.budgetedRevenue,
        actualRevenue: metrics.actualRevenue,
        budgetedFoodCost: metrics.budgetedFoodCost,
        actualFoodCost: metrics.actualFoodCost,
        budgetedLaborCost: metrics.budgetedLaborCost,
        actualLaborCost: metrics.actualLaborCost,
        budgetedOtherCost: metrics.budgetedOtherCost,
        actualOtherCost: metrics.actualOtherCost,
        totalCost: metrics.totalCost,
        grossProfit:
          metrics.actualRevenue - metrics.totalCost - metrics.actualLaborCost,
        grossProfitMargin: metrics.grossProfitMargin,
      },
    });
  } catch (error) {
    console.error("Error fetching finance analytics:", error);
    return NextResponse.json(
      { message: "Failed to fetch finance analytics" },
      { status: 500 }
    );
  }
}
