/**
 * @module EventProfitabilityPage
 * @intent Display profitability analysis across all events with budget vs actual comparison
 * @responsibility Server-side data fetching, summary computation, and rendering the profitability dashboard
 * @domain Events
 * @tags profitability, events, finance, dashboard
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { Separator } from "@repo/design-system/components/ui/separator";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { Header } from "../../components/header";
import { ProfitabilityPageClient } from "./profitability-page-client";

interface ProfitabilityRow {
  actual_food_cost: number;
  actual_gross_margin: number;
  actual_gross_margin_pct: number;
  actual_labor_cost: number;
  actual_overhead: number;
  actual_revenue: number;
  actual_total_cost: number;
  budgeted_food_cost: number;
  budgeted_gross_margin: number;
  budgeted_gross_margin_pct: number;
  budgeted_labor_cost: number;
  budgeted_overhead: number;
  budgeted_revenue: number;
  budgeted_total_cost: number;
  calculated_at: Date;
  calculation_method: string;
  created_at: Date;
  event_date: Date | null;
  event_id: string;
  event_title: string | null;
  food_cost_variance: number;
  id: string;
  labor_cost_variance: number;
  margin_variance_pct: number;
  notes: string | null;
  revenue_variance: number;
  tenant_id: string;
  total_cost_variance: number;
  updated_at: Date;
}

const EventProfitabilityPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Fetch profitability records joined with event titles via raw SQL
  // (no Prisma relation exists between EventProfitability and Event)
  const rows = await database.$queryRaw<ProfitabilityRow[]>`
    SELECT
      ep.id,
      ep.tenant_id,
      ep.event_id,
      ep.budgeted_revenue,
      ep.budgeted_food_cost,
      ep.budgeted_labor_cost,
      ep.budgeted_overhead,
      ep.budgeted_total_cost,
      ep.budgeted_gross_margin,
      ep.budgeted_gross_margin_pct,
      ep.actual_revenue,
      ep.actual_food_cost,
      ep.actual_labor_cost,
      ep.actual_overhead,
      ep.actual_total_cost,
      ep.actual_gross_margin,
      ep.actual_gross_margin_pct,
      ep.revenue_variance,
      ep.food_cost_variance,
      ep.labor_cost_variance,
      ep.total_cost_variance,
      ep.margin_variance_pct,
      ep.calculated_at,
      ep.calculation_method,
      ep.notes,
      ep.created_at,
      ep.updated_at,
      e.title AS event_title,
      e.event_date
    FROM tenant_events.event_profitability ep
    LEFT JOIN tenant_events.events e
      ON e.tenant_id = ep.tenant_id
      AND e.id = ep.event_id
      AND e.deleted_at IS NULL
    WHERE ep.tenant_id = ${tenantId}
      AND ep.deleted_at IS NULL
    ORDER BY ep.created_at DESC
  `;

  // Serialize for the client component — convert Decimal / Date to primitives
  const serializedRecords = rows.map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    eventId: row.event_id,
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
    calculatedAt: row.calculated_at.toISOString(),
    calculationMethod: row.calculation_method,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    event: row.event_title
      ? {
          id: row.event_id,
          title: row.event_title,
          eventDate: row.event_date
            ? new Date(row.event_date).toISOString()
            : null,
        }
      : null,
  }));

  // Compute summary statistics
  const totalActualRevenue = serializedRecords.reduce(
    (sum, r) => sum + r.actualRevenue,
    0
  );
  const totalBudgetedRevenue = serializedRecords.reduce(
    (sum, r) => sum + r.budgetedRevenue,
    0
  );
  const totalActualCost = serializedRecords.reduce(
    (sum, r) => sum + r.actualTotalCost,
    0
  );
  const totalBudgetedCost = serializedRecords.reduce(
    (sum, r) => sum + r.budgetedTotalCost,
    0
  );
  const averageMarginPct =
    serializedRecords.length > 0
      ? serializedRecords.reduce((sum, r) => sum + r.actualGrossMarginPct, 0) /
        serializedRecords.length
      : 0;
  const underperformingCount = serializedRecords.filter(
    (r) => r.actualGrossMarginPct < 15
  ).length;

  const summary = {
    totalActualRevenue,
    totalBudgetedRevenue,
    totalActualCost,
    totalBudgetedCost,
    averageMarginPct,
    underperformingCount,
    recordCount: serializedRecords.length,
  };

  return (
    <>
      <Header
        page="Profitability"
        pages={[{ label: "Events", href: "/events" }]}
      />

      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-2xl tracking-tight">
            Event Profitability
          </h1>
          <p className="text-muted-foreground">
            Analyze budget vs actual performance across events, track margins,
            and identify underperforming areas
          </p>
        </div>

        <Separator />

        <ProfitabilityPageClient
          records={serializedRecords}
          summary={summary}
          tenantId={tenantId}
        />
      </div>
    </>
  );
};

export default EventProfitabilityPage;
