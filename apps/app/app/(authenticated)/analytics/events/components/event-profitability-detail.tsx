"use client";

import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageBody,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { EventProfitabilityMetrics } from "../actions/get-event-profitability";

export function EventProfitabilityDetail({
  metrics,
}: {
  metrics: EventProfitabilityMetrics;
}) {
  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">EVENTS</MonoLabel>
          <DisplayHeading size="md">Event Profitability Detail</DisplayHeading>
          <CommandBandLede>
            Detailed cost breakdown, margin trends, and variance analysis for
            this event.
          </CommandBandLede>
        </CommandBandHeader>
      </CommandBand>

      <PageBody>
        <OperationalColumn>
          <SectionHeader title="Performance Overview" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card tone="canvas">
              <CardHeader>
                <CardDescription>Budgeted Revenue</CardDescription>
                <CardTitle className="text-2xl">
                  ${metrics.budgetedRevenue.toFixed(2)}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card tone="canvas">
              <CardHeader>
                <CardDescription>Actual Revenue</CardDescription>
                <CardTitle className="text-2xl">
                  ${metrics.actualRevenue.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium text-muted-foreground text-xs">
                  {metrics.revenueVariance >= 0 ? "+" : ""}
                  {metrics.revenueVariance.toFixed(2)} (
                  {metrics.revenueVariance >= 0 ? "over" : "under"} budget)
                </div>
              </CardContent>
            </Card>

            <Card tone="canvas">
              <CardHeader>
                <CardDescription>Total Costs</CardDescription>
                <CardTitle className="text-2xl">
                  ${metrics.actualTotalCost.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-muted-foreground text-xs">
                  <div>Food: ${metrics.actualFoodCost.toFixed(2)}</div>
                  <div>Labor: ${metrics.actualLaborCost.toFixed(2)}</div>
                  <div>Overhead: ${metrics.actualOverhead.toFixed(2)}</div>
                </div>
              </CardContent>
            </Card>

            <Card tone="canvas">
              <CardHeader>
                <CardDescription>Gross Margin</CardDescription>
                <CardTitle className="text-2xl">
                  ${metrics.actualGrossMargin.toFixed(2)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium text-muted-foreground text-xs">
                  {metrics.actualGrossMarginPct.toFixed(1)}% (
                  {metrics.marginVariancePct >= 0 ? "+" : ""}
                  {metrics.marginVariancePct.toFixed(1)}% vs budget)
                </div>
              </CardContent>
            </Card>
          </div>

          <SectionHeader title="Cost Analysis & Trends" />
          <div className="grid gap-6 md:grid-cols-2">
            <Card tone="canvas">
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
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
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
                    <div className="flex justify-between text-muted-foreground text-xs">
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
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
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
                    <div className="flex justify-between text-muted-foreground text-xs">
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
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
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
                    <div className="flex justify-between text-muted-foreground text-xs">
                      <span>
                        Budget: ${metrics.budgetedOverhead.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card tone="canvas">
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
                          <div className="w-16 text-muted-foreground text-xs">
                            {item.date.toLocaleDateString("en-US", {
                              month: "short",
                              year: "2-digit",
                            })}
                          </div>
                          <div className="h-6 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary/60 transition-all"
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

          <SectionHeader title="Variance Analysis" />
          <Card tone="canvas">
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
                    <div className="text-muted-foreground text-sm">
                      Budgeted Total Cost
                    </div>
                    <div className="font-bold text-lg">
                      ${metrics.budgetedTotalCost.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">
                      Actual Total Cost
                    </div>
                    <div className="font-bold text-lg">
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
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary/60 transition-all"
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

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <div className="text-muted-foreground text-sm">
                      Budgeted Margin %
                    </div>
                    <div className="font-bold text-lg">
                      {metrics.budgetedGrossMarginPct.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-sm">
                      Actual Margin %
                    </div>
                    <div className="font-bold text-lg">
                      {metrics.actualGrossMarginPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
}
