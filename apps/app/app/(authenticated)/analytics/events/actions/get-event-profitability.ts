"use server";

import "server-only";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "../../../../lib/tenant";

export type EventProfitabilityMetrics = {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  guestCount: number;

  budgetedRevenue: number;
  budgetedFoodCost: number;
  budgetedLaborCost: number;
  budgetedOverhead: number;
  budgetedTotalCost: number;
  budgetedGrossMargin: number;
  budgetedGrossMarginPct: number;

  actualRevenue: number;
  actualFoodCost: number;
  actualLaborCost: number;
  actualOverhead: number;
  actualTotalCost: number;
  actualGrossMargin: number;
  actualGrossMarginPct: number;

  revenueVariance: number;
  foodCostVariance: number;
  laborCostVariance: number;
  totalCostVariance: number;
  marginVariancePct: number;

  marginTrend: Array<{
    date: Date;
    marginPct: number;
  }>;
};

export type HistoricalProfitabilityData = {
  period: string;
  totalEvents: number;
  averageGrossMarginPct: number;
  totalRevenue: number;
  totalCost: number;
  averageFoodCostPct: number;
  averageLaborCostPct: number;
  averageOverheadPct: number;
};

export async function calculateEventProfitability(
  eventId: string
): Promise<EventProfitabilityMetrics> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const event = await database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const budgetedRevenue = Number(event.budget || 0);

  const actualFoodCostResult = await database.$queryRawUnsafe<
    Array<{ total_cost: string }>
  >(
    `
    SELECT COALESCE(SUM(it.quantity * it.unit_cost), 0) as total_cost
    FROM tenant_inventory.inventory_transactions it
    WHERE it.tenant_id = $1
      AND it.reference_type = 'event'
      AND it.reference_id = $2
      AND it.transaction_type IN ('use', 'waste')
      AND it.deleted_at IS NULL
    `,
    tenantId,
    eventId
  );

  const actualFoodCost = Number(actualFoodCostResult[0]?.total_cost || 0);

  const actualLaborCostResult = await database.$queryRawUnsafe<
    Array<{ total_labor_cost: string }>
  >(
    `
    SELECT COALESCE(SUM(
      CASE
        WHEN te.clock_out IS NOT NULL THEN
          EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600 - te.break_minutes / 60
        ELSE 0
      END * COALESCE(u.hourly_rate, 0)
    ), 0) as total_labor_cost
    FROM tenant_staff.time_entries te
    LEFT JOIN tenant_staff.employees u ON te.tenant_id = u.tenant_id AND te.employee_id = u.id
    WHERE te.tenant_id = $1
      AND te.location_id = $2
      AND te.clock_in >= $3
      AND te.clock_in <= $4
      AND te.deleted_at IS NULL
    `,
    tenantId,
    event.locationId,
    new Date(event.eventDate.setHours(0, 0, 0, 0)),
    new Date(event.eventDate.setHours(23, 59, 59, 999))
  );

  const actualLaborCost = Number(actualLaborCostResult[0]?.total_labor_cost || 0);

  const budgetedFoodCostPct = 0.35;
  const budgetedLaborCostPct = 0.25;
  const budgetedOverheadPct = 0.1;

  const budgetedFoodCost = budgetedRevenue * budgetedFoodCostPct;
  const budgetedLaborCost = budgetedRevenue * budgetedLaborCostPct;
  const budgetedOverhead = budgetedRevenue * budgetedOverheadPct;
  const budgetedTotalCost =
    budgetedFoodCost + budgetedLaborCost + budgetedOverhead;
  const budgetedGrossMargin = budgetedRevenue - budgetedTotalCost;
  const budgetedGrossMarginPct =
    budgetedRevenue > 0 ? (budgetedGrossMargin / budgetedRevenue) * 100 : 0;

  const actualOverhead = actualFoodCost * 0.1;
  const actualTotalCost = actualFoodCost + actualLaborCost + actualOverhead;
  const actualRevenue = budgetedRevenue;
  const actualGrossMargin = actualRevenue - actualTotalCost;
  const actualGrossMarginPct =
    actualRevenue > 0 ? (actualGrossMargin / actualRevenue) * 100 : 0;

  const revenueVariance = actualRevenue - budgetedRevenue;
  const foodCostVariance = actualFoodCost - budgetedFoodCost;
  const laborCostVariance = actualLaborCost - budgetedLaborCost;
  const totalCostVariance = actualTotalCost - budgetedTotalCost;
  const marginVariancePct = actualGrossMarginPct - budgetedGrossMarginPct;

  const marginTrendResult = await database.$queryRawUnsafe<
    Array<{ month: string; margin_pct: string }>
  >(
    `
    SELECT
      TO_CHAR(e.event_date, 'YYYY-MM') as month,
      COALESCE(
        AVG(
          CASE
            WHEN ep.actual_revenue > 0 THEN
              ((ep.actual_revenue - ep.actual_total_cost) / ep.actual_revenue) * 100
            ELSE NULL
          END
        ),
        0
      )::numeric as margin_pct
    FROM tenant_events.events e
    LEFT JOIN tenant_events.event_profitability ep
      ON e.tenant_id = ep.tenant_id AND e.id = ep.event_id AND ep.deleted_at IS NULL
    WHERE e.tenant_id = $1
      AND e.deleted_at IS NULL
      AND e.event_date >= NOW() - INTERVAL '12 months'
    GROUP BY TO_CHAR(e.event_date, 'YYYY-MM')
    ORDER BY month ASC
    `,
    tenantId
  );

  const marginTrend = marginTrendResult.map((row) => ({
    date: new Date(`${row.month}-01`),
    marginPct: Number(row.margin_pct),
  }));

  return {
    eventId,
    eventTitle: event.title,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    budgetedRevenue,
    budgetedFoodCost,
    budgetedLaborCost,
    budgetedOverhead,
    budgetedTotalCost,
    budgetedGrossMargin,
    budgetedGrossMarginPct,
    actualRevenue,
    actualFoodCost,
    actualLaborCost,
    actualOverhead,
    actualTotalCost,
    actualGrossMargin,
    actualGrossMarginPct,
    revenueVariance,
    foodCostVariance,
    laborCostVariance,
    totalCostVariance,
    marginVariancePct,
    marginTrend,
  };
}

export async function getHistoricalProfitability(
  months: number = 12
): Promise<HistoricalProfitabilityData[]> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const result = await database.$queryRawUnsafe<
    Array<{
      month: string;
      total_events: string;
      avg_gross_margin_pct: string;
      total_revenue: string;
      total_cost: string;
      avg_food_cost_pct: string;
      avg_labor_cost_pct: string;
      avg_overhead_pct: string;
    }>
  >(
    `
    SELECT
      TO_CHAR(e.event_date, 'YYYY-MM') as month,
      COUNT(*) as total_events,
      COALESCE(
        AVG(
          CASE
            WHEN ep.actual_revenue > 0 THEN
              ((ep.actual_revenue - ep.actual_total_cost) / ep.actual_revenue) * 100
            ELSE NULL
          END
        ),
        0
      )::numeric as avg_gross_margin_pct,
      COALESCE(SUM(ep.actual_revenue), 0)::numeric as total_revenue,
      COALESCE(SUM(ep.actual_total_cost), 0)::numeric as total_cost,
      COALESCE(
        AVG(
          CASE
            WHEN ep.actual_revenue > 0 THEN (ep.actual_food_cost / ep.actual_revenue) * 100
            ELSE NULL
          END
        ),
        0
      )::numeric as avg_food_cost_pct,
      COALESCE(
        AVG(
          CASE
            WHEN ep.actual_revenue > 0 THEN (ep.actual_labor_cost / ep.actual_revenue) * 100
            ELSE NULL
          END
        ),
        0
      )::numeric as avg_labor_cost_pct,
      COALESCE(
        AVG(
          CASE
            WHEN ep.actual_revenue > 0 THEN (ep.actual_overhead / ep.actual_revenue) * 100
            ELSE NULL
          END
        ),
        0
      )::numeric as avg_overhead_pct
    FROM tenant_events.events e
    LEFT JOIN tenant_events.event_profitability ep
      ON e.tenant_id = ep.tenant_id AND e.id = ep.event_id AND ep.deleted_at IS NULL
    WHERE e.tenant_id = $1
      AND e.deleted_at IS NULL
      AND e.event_date >= NOW() - INTERVAL '1 month' * $2
    GROUP BY TO_CHAR(e.event_date, 'YYYY-MM')
    ORDER BY month ASC
    `,
    tenantId,
    months
  );

  return result.map((row) => ({
    period: row.month,
    totalEvents: Number(row.total_events),
    averageGrossMarginPct: Number(row.avg_gross_margin_pct),
    totalRevenue: Number(row.total_revenue),
    totalCost: Number(row.total_cost),
    averageFoodCostPct: Number(row.avg_food_cost_pct),
    averageLaborCostPct: Number(row.avg_labor_cost_pct),
    averageOverheadPct: Number(row.avg_overhead_pct),
  }));
}

export async function getEventProfitabilityList(
  limit = 50
): Promise<EventProfitabilityMetrics[]> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const tenantId = await getTenantIdForOrg(orgId);

  const result = await database.$queryRawUnsafe<
    Array<{
      event_id: string;
      event_title: string;
      event_date: Date;
      guest_count: number;
      budgeted_revenue: string;
      budgeted_food_cost: string;
      budgeted_labor_cost: string;
      budgeted_overhead: string;
      budgeted_total_cost: string;
      budgeted_gross_margin: string;
      budgeted_gross_margin_pct: string;
      actual_revenue: string;
      actual_food_cost: string;
      actual_labor_cost: string;
      actual_overhead: string;
      actual_total_cost: string;
      actual_gross_margin: string;
      actual_gross_margin_pct: string;
      revenue_variance: string;
      food_cost_variance: string;
      labor_cost_variance: string;
      total_cost_variance: string;
      margin_variance_pct: string;
    }>
  >(
    `
    SELECT
      e.id as event_id,
      e.title as event_title,
      e.event_date,
      e.guest_count,
      COALESCE(ep.budgeted_revenue, 0)::numeric as budgeted_revenue,
      COALESCE(ep.budgeted_food_cost, 0)::numeric as budgeted_food_cost,
      COALESCE(ep.budgeted_labor_cost, 0)::numeric as budgeted_labor_cost,
      COALESCE(ep.budgeted_overhead, 0)::numeric as budgeted_overhead,
      COALESCE(ep.budgeted_total_cost, 0)::numeric as budgeted_total_cost,
      COALESCE(ep.budgeted_gross_margin, 0)::numeric as budgeted_gross_margin,
      COALESCE(ep.budgeted_gross_margin_pct, 0)::numeric as budgeted_gross_margin_pct,
      COALESCE(ep.actual_revenue, 0)::numeric as actual_revenue,
      COALESCE(ep.actual_food_cost, 0)::numeric as actual_food_cost,
      COALESCE(ep.actual_labor_cost, 0)::numeric as actual_labor_cost,
      COALESCE(ep.actual_overhead, 0)::numeric as actual_overhead,
      COALESCE(ep.actual_total_cost, 0)::numeric as actual_total_cost,
      COALESCE(ep.actual_gross_margin, 0)::numeric as actual_gross_margin,
      COALESCE(ep.actual_gross_margin_pct, 0)::numeric as actual_gross_margin_pct,
      COALESCE(ep.revenue_variance, 0)::numeric as revenue_variance,
      COALESCE(ep.food_cost_variance, 0)::numeric as food_cost_variance,
      COALESCE(ep.labor_cost_variance, 0)::numeric as labor_cost_variance,
      COALESCE(ep.total_cost_variance, 0)::numeric as total_cost_variance,
      COALESCE(ep.margin_variance_pct, 0)::numeric as margin_variance_pct
    FROM tenant_events.events e
    LEFT JOIN tenant_events.event_profitability ep
      ON e.tenant_id = ep.tenant_id AND e.id = ep.event_id AND ep.deleted_at IS NULL
    WHERE e.tenant_id = $1
      AND e.deleted_at IS NULL
    ORDER BY e.event_date DESC
    LIMIT $2
    `,
    tenantId,
    limit
  );

  return result.map((row) => ({
    eventId: row.event_id,
    eventTitle: row.event_title,
    eventDate: row.event_date,
    guestCount: row.guest_count,
    budgetedRevenue: Number(row.budgeted_revenue),
    budgetedFoodCost: Number(row.budgeted_food_cost),
    budgetedLaborCost: Number(row.budgeted_labor_cost),
    budgetedOverhead: Number(row.budgeted_overhead),
    budgetedTotalCost: Number(row.budgeted_total_cost),
    budgetedGrossMargin: Number(row.budgeted_gross_margin),
    budgetedGrossMarginPct: Number(row.budgeted_gross_margin_pct),
    actualRevenue: Number(row.actual_revenue),
    actualFoodCost: Number(row.actual_food_cost),
    actualLaborCost: Number(row.actual_labor_cost),
    actualOverhead: Number(row.actual_overhead),
    actualTotalCost: Number(row.actual_total_cost),
    actualGrossMargin: Number(row.actual_gross_margin),
    actualGrossMarginPct: Number(row.actual_gross_margin_pct),
    revenueVariance: Number(row.revenue_variance),
    foodCostVariance: Number(row.food_cost_variance),
    laborCostVariance: Number(row.labor_cost_variance),
    totalCostVariance: Number(row.total_cost_variance),
    marginVariancePct: Number(row.margin_variance_pct),
    marginTrend: [],
  }));
}
