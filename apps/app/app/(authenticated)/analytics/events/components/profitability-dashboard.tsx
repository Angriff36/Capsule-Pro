"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type {
  EventProfitabilityMetrics,
  HistoricalProfitabilityData,
} from "../actions/get-event-profitability";

interface ProfitabilityDashboardProps {
  eventId?: string;
}

export function ProfitabilityDashboard({
  eventId,
}: ProfitabilityDashboardProps) {
  const [metrics, setMetrics] = useState<EventProfitabilityMetrics | null>(
    null
  );
  const [historical, setHistorical] = useState<HistoricalProfitabilityData[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("12m");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        if (eventId) {
          const response = await apiFetch(
            `/api/events/${eventId}/profitability`
          );
          const data = await response.json();
          setMetrics(data);
        } else {
          const response = await apiFetch(
            `/api/analytics/events/profitability?period=${selectedPeriod}`
          );
          const data = await response.json();
          setHistorical(data);
        }
      } catch (error) {
        console.error("Failed to load profitability data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId, selectedPeriod]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...new Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 animate-pulse bg-muted rounded" />
              <div className="h-3 w-16 mt-2 animate-pulse bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-full animate-pulse bg-muted rounded mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (eventId && metrics) {
    return (
      <div className="space-y-8">
        {/* Performance Overview Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Performance Overview
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Budgeted Revenue</CardDescription>
                <CardTitle className="text-2xl">
                  ${metrics.budgetedRevenue.toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Actual Revenue</CardDescription>
                <CardTitle className="text-2xl">
                  ${metrics.actualRevenue.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs font-medium text-muted-foreground">
                  {metrics.revenueVariance >= 0 ? "+" : ""}
                  {metrics.revenueVariance.toFixed(2)} (
                  {metrics.revenueVariance >= 0 ? "over" : "under"} budget)
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Total Costs</CardDescription>
                <CardTitle className="text-2xl">
                  ${metrics.actualTotalCost.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Food: ${metrics.actualFoodCost.toFixed(2)}</div>
                  <div>Labor: ${metrics.actualLaborCost.toFixed(2)}</div>
                  <div>Overhead: ${metrics.actualOverhead.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Gross Margin</CardDescription>
                <CardTitle className="text-2xl">
                  ${metrics.actualGrossMargin.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs font-medium text-muted-foreground">
                  {metrics.actualGrossMarginPct.toFixed(1)}% (
                  {metrics.marginVariancePct >= 0 ? "+" : ""}
                  {metrics.marginVariancePct.toFixed(1)}% vs budget)
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Cost Analysis & Trends Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Cost Analysis & Trends
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>Actual vs budgeted costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Food Costs</span>
                      <span className="font-medium">
                        ${metrics.actualFoodCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/60 transition-all"
                        style={{
                          width: `${
                            (metrics.actualFoodCost /
                              Math.max(metrics.budgetedFoodCost, 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Budget: ${metrics.budgetedFoodCost.toFixed(2)}
                      </span>
                      <span>{metrics.foodCostVariance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Labor Costs</span>
                      <span className="font-medium">
                        ${metrics.actualLaborCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/70 transition-all"
                        style={{
                          width: `${
                            (metrics.actualLaborCost /
                              Math.max(metrics.budgetedLaborCost, 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Budget: ${metrics.budgetedLaborCost.toFixed(2)}
                      </span>
                      <span>{metrics.laborCostVariance.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Overhead</span>
                      <span className="font-medium">
                        ${metrics.actualOverhead.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/80 transition-all"
                        style={{
                          width: `${
                            (metrics.actualOverhead /
                              Math.max(metrics.budgetedOverhead, 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Budget: ${metrics.budgetedOverhead.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Margin Trends</CardTitle>
                <CardDescription>
                  12-month margin percentage trend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.marginTrend.length === 0 ? (
                    <div className="flex h-48 items-center justify-center text-center text-muted-foreground">
                      <div>
                        <p className="font-medium">No trend data available</p>
                        <p className="text-sm">
                          Margin trends will appear as more events are completed
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 space-y-1">
                      {metrics.marginTrend.map((item, index) => (
                        <div
                          className="flex items-center gap-2 text-sm"
                          key={index}
                        >
                          <div className="w-16 text-xs text-muted-foreground">
                            {item.date.toLocaleDateString("en-US", {
                              month: "short",
                              year: "2-digit",
                            })}
                          </div>
                          <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all bg-primary/60"
                              style={{
                                width: `${Math.min(Math.abs(item.marginPct), 50)}%`,
                              }}
                            />
                          </div>
                          <div className="w-12 text-right font-medium">
                            {item.marginPct.toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Variance Analysis Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Variance Analysis
          </h3>
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Performance</CardTitle>
              <CardDescription>
                Detailed variance breakdown with visual indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Budgeted Total Cost
                    </div>
                    <div className="text-lg font-bold">
                      ${metrics.budgetedTotalCost.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Actual Total Cost
                    </div>
                    <div className="text-lg font-bold">
                      ${metrics.actualTotalCost.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Total Cost Variance</span>
                    <span className="font-bold text-lg">
                      {metrics.totalCostVariance >= 0 ? "+" : ""}
                      {metrics.totalCostVariance.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all bg-primary/60"
                      style={{
                        width: `${Math.min(
                          (Math.abs(metrics.totalCostVariance) /
                            Math.max(metrics.budgetedTotalCost, 1)) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Budgeted Margin %
                    </div>
                    <div className="text-lg font-bold">
                      {metrics.budgetedGrossMarginPct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Actual Margin %
                    </div>
                    <div className="text-lg font-bold">
                      {metrics.actualGrossMarginPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">
          Event Profitability
        </h1>
        <p className="text-muted-foreground">
          Analyze event profitability, margins, cost variance, and revenue
          trends over time.
        </p>
      </div>

      <Separator />

      {/* Period Selector */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="period-select">
            Period:
          </label>
          <Select onValueChange={setSelectedPeriod} value={selectedPeriod}>
            <SelectTrigger className="w-[180px]" id="period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {historical.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                No profitability data available
              </h3>
              <p className="text-sm text-muted-foreground">
                Profitability metrics will appear as events are completed
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Summary Metrics Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Summary Metrics
            </h3>
            <div className="grid gap-6 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardDescription>Total Events</CardDescription>
                  <CardTitle className="text-2xl">
                    {historical.reduce((sum, h) => sum + h.totalEvents, 0)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>Average Margin %</CardDescription>
                  <CardTitle className="text-2xl">
                    {(
                      historical.reduce(
                        (sum, h) => sum + h.averageGrossMarginPct,
                        0
                      ) / historical.length
                    ).toFixed(1)}
                    %
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>Total Revenue</CardDescription>
                  <CardTitle className="text-2xl">
                    $
                    {historical
                      .reduce((sum, h) => sum + h.totalRevenue, 0)
                      .toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>Total Costs</CardDescription>
                  <CardTitle className="text-2xl">
                    $
                    {historical
                      .reduce((sum, h) => sum + h.totalCost, 0)
                      .toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>

          <Separator />

          {/* Historical Trends Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">
              Historical Trends
            </h3>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Profitability Metrics</CardTitle>
                <CardDescription>
                  Detailed breakdown over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium">Period</th>
                        <th className="py-2 text-right font-medium">Events</th>
                        <th className="py-2 text-right font-medium">Revenue</th>
                        <th className="py-2 text-right font-medium">
                          Avg Margin %
                        </th>
                        <th className="py-2 text-right font-medium">
                          Food Cost %
                        </th>
                        <th className="py-2 text-right font-medium">
                          Labor Cost %
                        </th>
                        <th className="py-2 text-right font-medium">
                          Overhead %
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historical.map((item, index) => (
                        <tr className="border-b hover:bg-muted/50" key={index}>
                          <td className="py-2">{item.period}</td>
                          <td className="py-2 text-right">
                            {item.totalEvents}
                          </td>
                          <td className="py-2 text-right">
                            ${item.totalRevenue.toFixed(2)}
                          </td>
                          <td className="py-2 text-right font-medium">
                            {item.averageGrossMarginPct.toFixed(1)}%
                          </td>
                          <td className="py-2 text-right">
                            {item.averageFoodCostPct.toFixed(1)}%
                          </td>
                          <td className="py-2 text-right">
                            {item.averageLaborCostPct.toFixed(1)}%
                          </td>
                          <td className="py-2 text-right">
                            {item.averageOverheadPct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
