import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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

  // Date range parameters
  const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 12m
  const locationId = searchParams.get("locationId");

  // Calculate date range based on period
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

  try {
    // Get event financial data for current period
    const currentPeriodMetrics = await database.$queryRawUnsafe<
      Array<{
        total_events: string;
        budgeted_revenue: string;
        actual_revenue: string;
        budgeted_food_cost: string;
        actual_food_cost: string;
        budgeted_labor_cost: string;
        actual_labor_cost: string;
        budgeted_other_cost: string;
        actual_other_cost: string;
      }>
    >(
      `
      SELECT
        COUNT(*)::int as total_events,
        COALESCE(SUM(ep.budgeted_revenue), 0)::numeric as budgeted_revenue,
        COALESCE(SUM(ep.actual_revenue), 0)::numeric as actual_revenue,
        COALESCE(SUM(ep.budgeted_food_cost), 0)::numeric as budgeted_food_cost,
        COALESCE(SUM(ep.actual_food_cost), 0)::numeric as actual_food_cost,
        COALESCE(SUM(ep.budgeted_labor_cost), 0)::numeric as budgeted_labor_cost,
        COALESCE(SUM(ep.actual_labor_cost), 0)::numeric as actual_labor_cost,
        COALESCE(SUM(ep.budgeted_beverage_cost + ep.budgeted_rentals_cost + ep.budgeted_other_cost), 0)::numeric as budgeted_other_cost,
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

    // Get event financial data for previous period (comparison)
    const previousPeriodMetrics = await database.$queryRawUnsafe<
      Array<{
        total_events: string;
        budgeted_revenue: string;
        actual_revenue: string;
        actual_food_cost: string;
        actual_labor_cost: string;
      }>
    >(
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

    // Calculate metrics
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

    // Revenue vs Budget
    const revenueVariance =
      budgetedRevenue > 0
        ? ((actualRevenue - budgetedRevenue) / budgetedRevenue) * 100
        : 0;
    const revenueTrend =
      previousRevenue > 0
        ? ((actualRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // Cost of Goods Sold (COGS)
    const totalCost = actualFoodCost + actualOtherCost;
    const cogsPercentage =
      actualRevenue > 0 ? (totalCost / actualRevenue) * 100 : 0;
    const previousTotalCost = previousFoodCost; // Simplified
    const cogsTrend =
      previousRevenue > 0
        ? ((totalCost - previousTotalCost) / previousRevenue) * 100
        : 0;

    // Labor Cadence
    const laborTrend =
      previousLaborCost > 0
        ? ((actualLaborCost - previousLaborCost) / previousLaborCost) * 100
        : 0;

    // Get contract and proposal values for ledger summary
    const ledgerData = await database.$queryRawUnsafe<
      Array<{
        pending_proposals: string;
        active_contracts: string;
        deposits_received: string;
      }>
    >(
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
            ${locationId ? "AND e.location_id = $2" : ""}
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
        ? [tenantId, locationId, startDate, now, locationId]
        : [tenantId, startDate, now]
    );

    const ledger = ledgerData[0] || {
      pending_proposals: "0",
      active_contracts: "0",
      deposits_received: "0",
    };

    // Get budget alerts
    const budgetAlerts = await database.budgetAlert.findMany({
      where: {
        tenantId,
        resolvedAt: null,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // Build finance highlights
    const financeHighlights = [
      {
        label: "Revenue vs Budget",
        value:
          formatCurrency(actualRevenue) +
          " / " +
          formatCurrency(budgetedRevenue),
        trend:
          revenueVariance >= 0
            ? `+${revenueVariance.toFixed(1)}% ahead`
            : `${revenueVariance.toFixed(1)}% behind`,
        isPositive: revenueVariance >= 0,
      },
      {
        label: "Cost of goods sold",
        value: formatCurrency(totalCost),
        trend: `${cogsPercentage.toFixed(1)}% of sales${cogsTrend > 0 ? ` (+${cogsTrend.toFixed(1)}%)` : cogsTrend < 0 ? ` (${cogsTrend.toFixed(1)}%)` : ""}`,
        isPositive: cogsPercentage < 30,
      },
      {
        label: "Labor cadence",
        value: formatCurrency(actualLaborCost),
        trend:
          laborTrend > 0
            ? `+${laborTrend.toFixed(1)}% vs. prior cycle`
            : laborTrend < 0
              ? `${laborTrend.toFixed(1)}% vs. prior cycle`
              : "No change",
        isPositive: laborTrend <= 0,
      },
    ];

    // Build ledger summary
    const ledgerSummary = [
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

    // Build finance alerts
    const financeAlerts = budgetAlerts.map((alert) => ({
      message: alert.message || `Budget alert: ${alert.alertType}`,
      severity:
        Number(alert.utilization) >= 100
          ? "High"
          : Number(alert.utilization) >= 90
            ? "Medium"
            : "Low",
    }));

    // If no alerts, add default alerts
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

    return NextResponse.json({
      summary: {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        locationId: locationId || null,
      },
      financeHighlights,
      ledgerSummary,
      financeAlerts,
      metrics: {
        totalEvents: Number(current.total_events),
        budgetedRevenue,
        actualRevenue,
        budgetedFoodCost,
        actualFoodCost,
        budgetedLaborCost,
        actualLaborCost,
        budgetedOtherCost,
        actualOtherCost,
        totalCost,
        grossProfit: actualRevenue - totalCost - actualLaborCost,
        grossProfitMargin:
          actualRevenue > 0
            ? ((actualRevenue - totalCost - actualLaborCost) / actualRevenue) *
              100
            : 0,
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

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toFixed(0)}`;
}
