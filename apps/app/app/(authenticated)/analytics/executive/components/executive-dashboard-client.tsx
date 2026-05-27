"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  MetricCardBlock,
  type TrendDirection,
} from "@repo/design-system/components/blocks/metric-card-block";
import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  PageBody,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { type ExecutiveKPIMetrics } from "../actions/get-executive-kpis";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export interface ExecutiveDashboardClientProps {
  metrics: ExecutiveKPIMetrics;
}

export function ExecutiveDashboardClient({
  metrics,
}: ExecutiveDashboardClientProps) {
  const getTrendIcon = (trend: TrendDirection): string => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      case "neutral":
        return "→";
    }
  };

  const getTrendColor = (trend: TrendDirection, isInverted = false): string => {
    if (isInverted) {
      switch (trend) {
        case "up":
          return "text-red-600";
        case "down":
          return "text-green-600";
        case "neutral":
          return "text-muted-foreground";
      }
    }
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      case "neutral":
        return "text-muted-foreground";
    }
  };

  const revenueChangePct =
    metrics.revenue.previousMonth > 0
      ? ((metrics.revenue.currentMonth - metrics.revenue.previousMonth) /
          metrics.revenue.previousMonth) *
        100
      : 0;

  const ytdGrowthPct =
    metrics.revenue.lastYearYtd > 0
      ? ((metrics.revenue.ytd - metrics.revenue.lastYearYtd) /
          metrics.revenue.lastYearYtd) *
        100
      : 0;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">EXECUTIVE</MonoLabel>
          <DisplayHeading size="md">Executive Dashboard</DisplayHeading>
          <CommandBandLede>
            High-level KPI overview with strategic insights
          </CommandBandLede>
        </CommandBandHeader>
        <CommandBandActions>
          <Link
            href="/analytics"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View All Analytics
          </Link>
        </CommandBandActions>
      </CommandBand>

      <PageBody>
        <OperationalColumn>
          <SectionHeader title="Revenue Performance" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCardBlock
              description="Current Month Revenue"
              value={currencyFormatter.format(metrics.revenue.currentMonth)}
              detail={`${revenueChangePct >= 0 ? "+" : ""}${revenueChangePct.toFixed(1)}% vs last month`}
              trend={metrics.revenue.trend}
              trendColor={getTrendColor(metrics.revenue.trend)}
            />
            <MetricCardBlock
              description="Year-to-Date Revenue"
              value={currencyFormatter.format(metrics.revenue.ytd)}
              detail={`${ytdGrowthPct >= 0 ? "+" : ""}${ytdGrowthPct.toFixed(1)}% vs last year`}
              trend={ytdGrowthPct > 5 ? "up" : ytdGrowthPct < -5 ? "down" : "neutral"}
            />
            <MetricCardBlock
              description="Revenue Forecast"
              value={currencyFormatter.format(metrics.revenue.forecast)}
              detail="Based on current trend"
              trend="neutral"
            />
            <MetricCardBlock
              description="Monthly Average"
              value={currencyFormatter.format(
                metrics.revenue.byMonth.length > 0
                  ? metrics.revenue.ytd /
                      metrics.revenue.byMonth.filter(
                        (m) => new Date(m.month) >= new Date(new Date().getFullYear(), 0, 1)
                      ).length
                  : 0
              )}
              detail="Year-to-date average"
              trend="neutral"
            />
          </div>

          <SectionHeader title="Resource Utilization" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCardBlock
              description="Overall Utilization"
              value={`${metrics.utilization.overall.toFixed(0)}%`}
              detail="Budget vs actual usage"
              trend={metrics.utilization.trend}
              trendColor={getTrendColor(metrics.utilization.trend, true)}
            />
            <MetricCardBlock
              description="Kitchen Staffing"
              value={`${metrics.utilization.kitchen.toFixed(0)}%`}
              detail="Labor efficiency"
              trend={metrics.utilization.trend}
              trendColor={getTrendColor(metrics.utilization.trend, true)}
            />
            <MetricCardBlock
              description="Staff Utilization"
              value={`${metrics.utilization.staff.toFixed(0)}%`}
              detail="Active vs available"
              trend={metrics.utilization.trend}
              trendColor={getTrendColor(metrics.utilization.trend, true)}
            />
            <MetricCardBlock
              description="Equipment Uptime"
              value={`${metrics.utilization.equipment.toFixed(0)}%`}
              detail="Operational readiness"
              trend="neutral"
            />
          </div>

          <SectionHeader title="Profitability Metrics" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <MetricCardBlock
              description="Gross Margin"
              value={`${metrics.profitability.grossMargin.toFixed(1)}%`}
              detail="Average across all events"
              trend={metrics.profitability.trend}
            />
            <MetricCardBlock
              description="Net Profit Margin"
              value={`${metrics.profitability.netProfit.toFixed(1)}%`}
              detail="After all expenses"
              trend={metrics.profitability.trend}
            />
            <MetricCardBlock
              description="EBITDA Margin"
              value={`${metrics.profitability.ebitda.toFixed(1)}%`}
              detail="Operating performance"
              trend={metrics.profitability.trend}
            />
          </div>

          <SectionHeader title="Sales Pipeline" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCardBlock
              description="Pipeline Value"
              value={currencyFormatter.format(metrics.pipeline.totalValue)}
              detail={`${metrics.pipeline.qualifiedLeads} qualified leads`}
              trend={metrics.pipeline.trend}
            />
            <MetricCardBlock
              description="Proposals Sent"
              value={numberFormatter.format(metrics.pipeline.proposalsSent)}
              detail="Active proposals"
              trend={metrics.pipeline.trend}
            />
            <MetricCardBlock
              description="Win Rate"
              value={`${metrics.pipeline.winRate.toFixed(0)}%`}
              detail="Conversion rate"
              trend={metrics.pipeline.trend}
            />
            <MetricCardBlock
              description="Avg Sales Cycle"
              value={`${metrics.pipeline.avgSalesCycle.toFixed(0)} days`}
              detail="Lead to close"
              trend="neutral"
            />
          </div>

          <SectionHeader title="Operational Health" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCardBlock
              description="On-Time Delivery"
              value={`${metrics.operationalHealth.onTimeDeliveryRate.toFixed(0)}%`}
              detail="Events delivered on schedule"
              trend={metrics.operationalHealth.trend}
            />
            <MetricCardBlock
              description="Staff Retention"
              value={`${metrics.operationalHealth.staffRetentionRate.toFixed(0)}%`}
              detail="12-month retention rate"
              trend={metrics.operationalHealth.trend}
            />
            <MetricCardBlock
              description="Food Waste"
              value={`${metrics.operationalHealth.foodWastePercentage.toFixed(1)}%`}
              detail="Of food cost"
              trend={metrics.operationalHealth.foodWastePercentage < 3 ? "up" : "down"}
              trendColor={
                metrics.operationalHealth.foodWastePercentage < 3
                  ? "text-green-600"
                  : "text-red-600"
              }
            />
            <MetricCardBlock
              description="Health Score"
              value={
                (
                  (metrics.operationalHealth.onTimeDeliveryRate * 0.3 +
                    metrics.operationalHealth.staffRetentionRate * 0.5 +
                    (100 - metrics.operationalHealth.foodWastePercentage) * 0.2) /
                  100
                ).toFixed(0) + "%"
              }
              detail="Overall operational score"
              trend={metrics.operationalHealth.trend}
            />
          </div>

          <SectionHeader title="Executive Insights" />
          <Card>
            <CardHeader>
              <CardTitle>Key Takeaways</CardTitle>
              <CardDescription>Automated insights based on current metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {revenueChangePct > 10 && (
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">↑</span>
                    <span>
                      <strong>Revenue Growth:</strong> Revenue increased{" "}
                      {revenueChangePct.toFixed(0)}% compared to last month.
                    </span>
                  </li>
                )}
                {revenueChangePct < -10 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-600">↓</span>
                    <span>
                      <strong>Revenue Decline:</strong> Revenue decreased{" "}
                      {Math.abs(revenueChangePct).toFixed(0)}% compared to last month.
                      Review pipeline and sales activity.
                    </span>
                  </li>
                )}
                {metrics.profitability.grossMargin < 20 && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">⚠</span>
                    <span>
                      <strong>Margin Alert:</strong> Gross margin is below 20%. Review
                      pricing strategy and cost control.
                    </span>
                  </li>
                )}
                {metrics.pipeline.winRate < 25 && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">⚠</span>
                    <span>
                      <strong>Conversion Rate:</strong> Win rate is{" "}
                      {metrics.pipeline.winRate.toFixed(0)}%. Consider reviewing proposal
                      quality and pricing.
                    </span>
                  </li>
                )}
                {metrics.operationalHealth.foodWastePercentage > 5 && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600">⚠</span>
                    <span>
                      <strong>Waste Management:</strong> Food waste is{" "}
                      {metrics.operationalHealth.foodWastePercentage.toFixed(1)}%. Implement
                      tighter inventory controls.
                    </span>
                  </li>
                )}
                {metrics.operationalHealth.onTimeDeliveryRate > 90 &&
                  metrics.profitability.grossMargin > 25 && (
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      <span>
                        <strong>Strong Performance:</strong> Excellent on-time delivery
                        rate and healthy margins. Operations are running efficiently.
                      </span>
                    </li>
                  )}
                </ul>
            </CardContent>
          </Card>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
}
