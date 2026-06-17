/**
 * @module EventProfitabilityPage
 * @intent Display profitability analysis across all events with budget vs actual comparison
 * @responsibility Server-side data fetching, summary computation, and rendering the profitability dashboard
 * @domain Events
 * @tags profitability, events, finance, dashboard
 * @canonical true
 */

import {
  listEventProfitabilities,
  listEvents,
} from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
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

  const [profitabilityRaw, eventsRaw] = await Promise.all([
    listEventProfitabilities(),
    listEvents(),
  ]);
  const eventById = new Map(
    eventsRaw.data
      .filter((event) => event.tenantId === tenantId && !event.deletedAt)
      .map((event) => [event.id, event])
  );
  const rows: ProfitabilityRow[] = profitabilityRaw.data
    .filter((row) => row.tenantId === tenantId && !row.deletedAt)
    .map((row) => {
      const event = eventById.get(row.eventId);
      return {
        id: row.id,
        tenant_id: row.tenantId,
        event_id: row.eventId,
        budgeted_revenue: row.budgetedRevenue ?? 0,
        budgeted_food_cost: row.budgetedFoodCost ?? 0,
        budgeted_labor_cost: row.budgetedLaborCost ?? 0,
        budgeted_overhead: row.budgetedOverhead ?? 0,
        budgeted_total_cost: row.budgetedTotalCost ?? 0,
        budgeted_gross_margin: row.budgetedGrossMargin ?? 0,
        budgeted_gross_margin_pct: row.budgetedGrossMarginPct ?? 0,
        actual_revenue: row.actualRevenue ?? 0,
        actual_food_cost: row.actualFoodCost ?? 0,
        actual_labor_cost: row.actualLaborCost ?? 0,
        actual_overhead: row.actualOverhead ?? 0,
        actual_total_cost: row.actualTotalCost ?? 0,
        actual_gross_margin: row.actualGrossMargin ?? 0,
        actual_gross_margin_pct: row.actualGrossMarginPct ?? 0,
        revenue_variance: row.revenueVariance ?? 0,
        food_cost_variance: row.foodCostVariance ?? 0,
        labor_cost_variance: row.laborCostVariance ?? 0,
        total_cost_variance: row.totalCostVariance ?? 0,
        margin_variance_pct: row.marginVariancePct ?? 0,
        calculated_at: new Date(row.calculatedAt || Date.now()),
        calculation_method: row.calculationMethod ?? "",
        notes: row.notes ?? null,
        created_at: new Date(row.createdAt || Date.now()),
        updated_at: new Date(row.updatedAt || Date.now()),
        event_title: event?.title ?? null,
        event_date: event?.eventDate ? new Date(event.eventDate) : null,
      };
    })
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

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
