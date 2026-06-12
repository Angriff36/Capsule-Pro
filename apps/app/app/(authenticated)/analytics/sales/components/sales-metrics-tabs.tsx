"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import type {
  DataRow,
  prepareSalesMetrics,
  SalesData,
  validateFunnel,
} from "../lib/sales-analytics";
import {
  formatCurrency,
  formatDateLabel,
  formatDateRange,
  formatNumber,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from "../lib/sales-helpers";
import { ChartBuilder } from "./chart-builder";
import { ComparisonTable } from "./comparison-table";
import { DataTable } from "./data-table";
import { FunnelBySourceTable } from "./funnel-by-source-table";
import { KpiCard } from "./kpi-card";
import { PricingSummaryTable } from "./pricing-summary-table";
import { SegmentSummaryTable } from "./segment-summary-table";
import { ValidationTable } from "./validation-table";
import { barChartSpec, lineChartSpec, VegaChart } from "./vega-chart";

type SalesMetrics = ReturnType<typeof prepareSalesMetrics>;

export function SalesMetricsTabs({
  metrics,
  salesData,
  validation,
  flatData,
}: {
  metrics: SalesMetrics;
  salesData: SalesData;
  validation: ReturnType<typeof validateFunnel> | null;
  flatData: Record<string, unknown>[];
}) {
  return (
    <Tabs className="space-y-6" defaultValue="weekly">
      <TabsList className="flex flex-wrap">
        <TabsTrigger value="weekly">Weekly</TabsTrigger>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
        <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
        <TabsTrigger value="annual">Annual</TabsTrigger>
        <TabsTrigger value="comparison">Comparison</TabsTrigger>
        <TabsTrigger value="validation">Validation</TabsTrigger>
        <TabsTrigger value="chart-builder">Chart Builder</TabsTrigger>
      </TabsList>

      {/* ============ WEEKLY ============ */}
      <TabsContent className="space-y-6" value="weekly">
        <Card tone="soft-stone">
          <CardHeader>
            <CardTitle>Weekly Metrics</CardTitle>
            <CardDescription>
              {formatDateRange(
                metrics.weekly.window.start,
                metrics.weekly.window.end
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Leads"
                value={formatNumber(metrics.weekly.leadsReceived)}
              />
              <KpiCard
                label="Proposals"
                value={formatNumber(metrics.weekly.proposalsSent)}
              />
              <KpiCard
                label="Won"
                value={formatNumber(metrics.weekly.eventsWon)}
              />
              <KpiCard
                label="Closing Ratio"
                value={formatPercent(metrics.weekly.closingRatio)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <VegaChart
            data={metrics.weekly.revenueByEventType.map((item) => ({
              label: item.event_type,
              value: item.revenue,
            }))}
            description="Booked revenue by event type in the selected week."
            spec={barChartSpec({ showCurrency: true })}
            title="Revenue by Event Type"
          />
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Trending Lost Reasons</CardTitle>
              <CardDescription>
                Top loss reasons in the selected week.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={["lost_reason", "count"]}
                emptyText="No lost reasons recorded."
                maxRows={6}
                rows={metrics.weekly.trendingLost as DataRow[]}
              />
            </CardContent>
          </Card>
        </div>

        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Top Upcoming / Pending</CardTitle>
            <CardDescription>
              Top pending events with the highest value.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              emptyText="No pending events in this window."
              maxRows={5}
              rows={metrics.weekly.topPending.map((row) => {
                const next: DataRow = { ...row };
                const statusValue = row._status;
                if (statusValue !== undefined) {
                  next.status = statusValue;
                }
                return next;
              })}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* ============ MONTHLY ============ */}
      <TabsContent className="space-y-6" value="monthly">
        <Card tone="soft-stone">
          <CardHeader>
            <CardTitle>Monthly Metrics</CardTitle>
            <CardDescription>
              {formatDateRange(
                metrics.monthly.window.start,
                metrics.monthly.window.end
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total Revenue"
                subtext={
                  `MoM ${formatSignedCurrency(metrics.monthly.revenueMomDelta)} ` +
                  `(${formatSignedPercent(metrics.monthly.revenueMomPct)}) · ` +
                  `YoY ${formatSignedCurrency(metrics.monthly.revenueYoyDelta)} ` +
                  `(${formatSignedPercent(metrics.monthly.revenueYoyPct)})`
                }
                value={formatCurrency(metrics.monthly.totalRevenueBooked)}
              />
              <KpiCard
                label="Events Closed"
                value={formatNumber(metrics.monthly.totalEventsClosed)}
              />
              <KpiCard
                label="Average Event"
                value={formatCurrency(metrics.monthly.averageEventValue)}
              />
              <KpiCard
                label="Pipeline Forecast"
                subtext={`Next 60 days ${formatCurrency(metrics.monthly.pipelineForecast60)}`}
                value={formatCurrency(metrics.monthly.pipelineForecast90)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <VegaChart
            data={metrics.monthly.leadSourceBreakdown.map((item) => ({
              label: item.lead_source,
              value: item.count,
            }))}
            spec={barChartSpec()}
            title="Lead Source Breakdown"
          />
          <VegaChart
            data={metrics.monthly.salesFunnel.map((item) => ({
              label: item.stage,
              value: item.count,
            }))}
            spec={barChartSpec()}
            title="Sales Funnel"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <VegaChart
            data={metrics.monthly.closingBySalesperson.map((item) => ({
              label: item.salesperson,
              value: item.win_rate,
            }))}
            description="Win rate by salesperson."
            spec={barChartSpec()}
            title="Closing by Salesperson"
          />
          <VegaChart
            data={metrics.monthly.topPackages.map((item) => ({
              label: item.package,
              value: item.revenue,
            }))}
            spec={barChartSpec({ showCurrency: true })}
            title="Top Packages"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Win/Loss Trends</CardTitle>
              <CardDescription>Top loss reasons this month.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={["lost_reason", "count"]}
                maxRows={8}
                rows={metrics.monthly.winLossTrends as DataRow[]}
              />
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Closing Performance</CardTitle>
              <CardDescription>Win/loss counts by salesperson.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={["salesperson", "won", "lost", "win_rate"]}
                maxRows={8}
                rows={metrics.monthly.closingBySalesperson.map((row) => ({
                  salesperson: row.salesperson,
                  won: row.won,
                  lost: row.lost,
                  win_rate: formatPercent(row.win_rate),
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ============ QUARTERLY ============ */}
      <TabsContent className="space-y-6" value="quarterly">
        <Card tone="soft-stone">
          <CardHeader>
            <CardTitle>Quarterly Metrics</CardTitle>
            <CardDescription>
              {formatDateRange(
                metrics.quarterly.window.start,
                metrics.quarterly.window.end
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total Revenue"
                value={formatCurrency(metrics.quarterly.totalRevenueBooked)}
              />
              <KpiCard
                label="Events Closed"
                value={formatNumber(metrics.quarterly.totalEventsClosed)}
              />
              <KpiCard
                label="Average Event"
                value={formatCurrency(metrics.quarterly.averageEventValue)}
              />
              <KpiCard
                label="Sales Cycle (days)"
                value={formatNumber(
                  Math.round(metrics.quarterly.avgSalesCycleDays)
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <VegaChart
            data={metrics.quarterly.funnelBySource.map((item) => ({
              label: item.lead_source,
              value: item.Inquiries,
            }))}
            spec={barChartSpec()}
            title="Funnel by Source (Inquiries)"
          />
          <VegaChart
            data={metrics.quarterly.funnelBySource.map((item) => ({
              label: item.lead_source,
              value: item.win_rate,
            }))}
            spec={barChartSpec()}
            title="Funnel Win Rate"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <VegaChart
            data={metrics.quarterly.venuePerformance.map((item) => ({
              label: item.venue_source,
              value: item.revenue,
            }))}
            description="Revenue by venue partner."
            spec={barChartSpec({ showCurrency: true })}
            title="Venue Partner Performance"
          />
          <VegaChart
            data={metrics.quarterly.pricingTrends.map((item) => ({
              label: formatDateLabel(item.month),
              value: item.avg_discount_rate,
            }))}
            description="Average discount rate for won events."
            spec={lineChartSpec()}
            title="Avg Discount Rate"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Customer Segment Analysis</CardTitle>
              <CardDescription>Top 12 segments by revenue.</CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentSummaryTable rows={metrics.quarterly.segmentSummary} />
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Pricing Summary</CardTitle>
              <CardDescription>Budget vs actual performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <PricingSummaryTable rows={metrics.quarterly.pricingSummary} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Funnel by Source Details</CardTitle>
              <CardDescription>
                Inquiry-to-win pipeline breakdown.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FunnelBySourceTable rows={metrics.quarterly.funnelBySource} />
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Win/Loss Review</CardTitle>
              <CardDescription>Top loss reasons this quarter.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={["lost_reason", "count"]}
                maxRows={6}
                rows={metrics.quarterly.winLossTrends as DataRow[]}
              />
            </CardContent>
          </Card>
        </div>

        <Card tone="soft-stone">
          <CardHeader>
            <CardTitle>Next Quarter Forecast</CardTitle>
            <CardDescription>
              Projected revenue based on current pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-2xl">
              {formatCurrency(metrics.quarterly.nextQuarterForecast)}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics.quarterly.recommendations.length ? (
                metrics.quarterly.recommendations.map((item) => (
                  <div className="flex items-start gap-2" key={item}>
                    <Badge variant="secondary">Action</Badge>
                    <p className="text-muted-foreground text-sm">{item}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No recommendations this quarter.
                </p>
              )}
            </CardContent>
          </Card>
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Opportunities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {metrics.quarterly.opportunities.length ? (
                metrics.quarterly.opportunities.map((item) => (
                  <div className="flex items-start gap-2" key={item}>
                    <Badge variant="outline">Opportunity</Badge>
                    <p className="text-muted-foreground text-sm">{item}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  No opportunities flagged.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ============ ANNUAL ============ */}
      <TabsContent className="space-y-6" value="annual">
        <Card tone="soft-stone">
          <CardHeader>
            <CardTitle>Annual Metrics</CardTitle>
            <CardDescription>
              {formatDateRange(
                metrics.annual.window.start,
                metrics.annual.window.end
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total Revenue"
                subtext={`YoY ${formatSignedCurrency(metrics.annual.revenueYoyDelta)} (${formatSignedPercent(metrics.annual.revenueYoyPct)})`}
                value={formatCurrency(metrics.annual.totalRevenueBooked)}
              />
              <KpiCard
                label="Events Closed"
                value={formatNumber(metrics.annual.totalEventsClosed)}
              />
              <KpiCard
                label="Average Event"
                value={formatCurrency(metrics.annual.averageEventValue)}
              />
              <KpiCard
                label="Pipeline Forecast"
                subtext="Next 90 days"
                value={formatCurrency(metrics.annual.pipelineForecast90)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <VegaChart
            data={metrics.annual.revenueByMonth.map((item) => ({
              label: formatDateLabel(item.month),
              value: item.revenue,
            }))}
            spec={lineChartSpec({ showCurrency: true })}
            title="Revenue by Month"
          />
          <VegaChart
            data={metrics.annual.revenueByEventType.map((item) => ({
              label: item.event_type,
              value: item.revenue,
            }))}
            spec={barChartSpec({ showCurrency: true })}
            title="Revenue by Event Type"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <VegaChart
            data={metrics.annual.leadSourceBreakdown.map((item) => ({
              label: item.lead_source,
              value: item.count,
            }))}
            spec={barChartSpec()}
            title="Lead Source Breakdown"
          />
          <VegaChart
            data={metrics.annual.salesFunnel.map((item) => ({
              label: item.stage,
              value: item.count,
            }))}
            spec={barChartSpec()}
            title="Sales Funnel"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <VegaChart
            data={metrics.annual.closingBySalesperson.map((item) => ({
              label: item.salesperson,
              value: item.win_rate,
            }))}
            spec={barChartSpec()}
            title="Closing by Salesperson"
          />
          <VegaChart
            data={metrics.annual.topPackages.map((item) => ({
              label: item.package,
              value: item.revenue,
            }))}
            spec={barChartSpec({ showCurrency: true })}
            title="Top Packages"
          />
        </div>

        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Win/Loss Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={["lost_reason", "count"]}
              maxRows={8}
              rows={metrics.annual.winLossTrends as DataRow[]}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* ============ COMPARISON ============ */}
      <TabsContent className="space-y-6" value="comparison">
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Comparative View</CardTitle>
            <CardDescription>
              Week, month, quarter, YTD, and annual side-by-side performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <VegaChart
                data={metrics.summaries.map((s) => ({
                  label: s.label,
                  value: s.revenue,
                }))}
                spec={barChartSpec({ showCurrency: true })}
                title="Revenue by Period"
              />
              <VegaChart
                data={metrics.summaries.map((s) => ({
                  label: s.label,
                  value: s.closingRatio,
                }))}
                spec={barChartSpec()}
                title="Closing Ratio by Period"
              />
            </div>
          </CardContent>
        </Card>
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Period Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ComparisonTable summaries={metrics.summaries} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* ============ VALIDATION ============ */}
      <TabsContent className="space-y-6" value="validation">
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Funnel Validation</CardTitle>
            <CardDescription>
              Compare calculated funnel metrics against the CALCS_Funnel sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {salesData.calcsFunnel.length === 0 ? (
              <Alert>
                <AlertTitle>CALCS_Funnel sheet not found</AlertTitle>
                <AlertDescription>
                  Add the CALCS_Funnel sheet to enable validation checks.
                </AlertDescription>
              </Alert>
            ) : null}
            {validation ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={validation.passed ? "secondary" : "destructive"}
                  >
                    {validation.passed ? "Pass" : "Fail"}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    Tolerance: 1%
                  </span>
                </div>
                <ValidationTable results={validation.results} />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Select columns to run validation.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ============ CHART BUILDER ============ */}
      <TabsContent className="space-y-6" value="chart-builder">
        <Card tone="canvas">
          <CardHeader>
            <CardTitle>Chart Builder</CardTitle>
            <CardDescription>
              Build custom visualizations from your data. Choose from 50+ chart
              types, map your columns, and export as PNG or SVG.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartBuilder data={flatData} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
