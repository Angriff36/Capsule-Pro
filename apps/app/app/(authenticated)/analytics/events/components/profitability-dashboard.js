"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfitabilityDashboard = ProfitabilityDashboard;
const card_1 = require("@repo/design-system/components/ui/card");
const react_1 = require("react");
function ProfitabilityDashboard({ eventId }) {
  const [metrics, setMetrics] = (0, react_1.useState)(null);
  const [historical, setHistorical] = (0, react_1.useState)([]);
  const [loading, setLoading] = (0, react_1.useState)(true);
  const [selectedPeriod, setSelectedPeriod] = (0, react_1.useState)("12m");
  (0, react_1.useEffect)(() => {
    async function loadData() {
      try {
        setLoading(true);
        if (eventId) {
          const response = await fetch(`/api/events/${eventId}/profitability`);
          const data = await response.json();
          setMetrics(data);
        } else {
          const response = await fetch(
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
        {[...Array(4)].map((_, i) => (
          <card_1.Card key={i}>
            <card_1.CardHeader>
              <div className="h-4 w-24 animate-pulse bg-muted rounded" />
              <div className="h-3 w-16 mt-2 animate-pulse bg-muted rounded" />
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="h-8 w-full animate-pulse bg-muted rounded mt-2" />
            </card_1.CardContent>
          </card_1.Card>
        ))}
      </div>
    );
  }
  if (eventId && metrics) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-sm font-medium">
                Budgeted Revenue
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">
                ${metrics.budgetedRevenue.toFixed(2)}
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-sm font-medium">
                Actual Revenue
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">
                ${metrics.actualRevenue.toFixed(2)}
              </div>
              <div
                className={`text-xs mt-1 ${
                  metrics.revenueVariance >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {metrics.revenueVariance >= 0 ? "+" : ""}
                {metrics.revenueVariance.toFixed(2)} (
                {metrics.revenueVariance >= 0 ? "over" : "under"} budget)
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-sm font-medium">
                Total Costs
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">
                ${metrics.actualTotalCost.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Food: ${metrics.actualFoodCost.toFixed(2)} | Labor: $
                {metrics.actualLaborCost.toFixed(2)} | Overhead: $
                {metrics.actualOverhead.toFixed(2)}
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="text-sm font-medium">
                Gross Margin
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div
                className={`text-2xl font-bold ${
                  metrics.actualGrossMargin >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {metrics.actualGrossMargin.toFixed(2)}
              </div>
              <div
                className={`text-xs mt-1 ${
                  metrics.marginVariancePct >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {metrics.actualGrossMarginPct.toFixed(1)}% (
                {metrics.marginVariancePct >= 0 ? "+" : ""}
                {metrics.marginVariancePct.toFixed(1)}% vs budget)
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Cost Breakdown</card_1.CardTitle>
              <card_1.CardDescription>
                Actual costs vs budgeted costs
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
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
                      className="h-full bg-blue-500 transition-all"
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
                    <span>Budget: ${metrics.budgetedFoodCost.toFixed(2)}</span>
                    <span
                      className={
                        metrics.foodCostVariance <= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {metrics.foodCostVariance.toFixed(2)}
                    </span>
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
                      className="h-full bg-purple-500 transition-all"
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
                    <span>Budget: ${metrics.budgetedLaborCost.toFixed(2)}</span>
                    <span
                      className={
                        metrics.laborCostVariance <= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {metrics.laborCostVariance.toFixed(2)}
                    </span>
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
                      className="h-full bg-orange-500 transition-all"
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
                    <span>Budget: ${metrics.budgetedOverhead.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Margin Trends</card_1.CardTitle>
              <card_1.CardDescription>
                12-month margin percentage trend
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
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
                            className={`h-full transition-all ${
                              item.marginPct >= 0
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.min(Math.abs(item.marginPct), 50)}%`,
                            }}
                          />
                        </div>
                        <div
                          className={`w-12 text-right font-medium ${
                            item.marginPct >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.marginPct.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        <card_1.Card>
          <card_1.CardHeader>
            <card_1.CardTitle>Variance Analysis</card_1.CardTitle>
            <card_1.CardDescription>
              Budget vs actual performance breakdown
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
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
                  <span
                    className={`font-bold text-lg ${
                      metrics.totalCostVariance <= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {metrics.totalCostVariance >= 0 ? "+" : ""}
                    {metrics.totalCostVariance.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      metrics.totalCostVariance <= 0
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
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
          </card_1.CardContent>
        </card_1.Card>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Event Profitability Dashboard</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" htmlFor="period-select">
            Period:
          </label>
          <select
            className="rounded border border-input bg-background px-3 py-2 text-sm"
            id="period-select"
            onChange={(e) => setSelectedPeriod(e.target.value)}
            value={selectedPeriod}
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="12m">Last 12 months</option>
          </select>
        </div>
      </div>

      {historical.length === 0 ? (
        <card_1.Card>
          <card_1.CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                No profitability data available
              </h3>
              <p className="text-sm text-muted-foreground">
                Profitability metrics will appear as events are completed
              </p>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-sm font-medium">
                  Total Events
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="text-2xl font-bold">
                  {historical.reduce((sum, h) => sum + h.totalEvents, 0)}
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-sm font-medium">
                  Average Margin %
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="text-2xl font-bold">
                  {(
                    historical.reduce(
                      (sum, h) => sum + h.averageGrossMarginPct,
                      0
                    ) / historical.length
                  ).toFixed(1)}
                  %
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-sm font-medium">
                  Total Revenue
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="text-2xl font-bold">
                  $
                  {historical
                    .reduce((sum, h) => sum + h.totalRevenue, 0)
                    .toFixed(2)}
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="text-sm font-medium">
                  Total Costs
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="text-2xl font-bold">
                  $
                  {historical
                    .reduce((sum, h) => sum + h.totalCost, 0)
                    .toFixed(2)}
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </div>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Historical Trends</card_1.CardTitle>
              <card_1.CardDescription>
                Monthly profitability metrics over selected period
              </card_1.CardDescription>
            </card_1.CardHeader>
            <card_1.CardContent>
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
                        <td className="py-2 text-right">{item.totalEvents}</td>
                        <td className="py-2 text-right">
                          ${item.totalRevenue.toFixed(2)}
                        </td>
                        <td
                          className={`py-2 text-right font-medium ${
                            item.averageGrossMarginPct >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
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
            </card_1.CardContent>
          </card_1.Card>
        </div>
      )}
    </div>
  );
}
