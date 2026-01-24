"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveLTV = PredictiveLTV;
const badge_1 = require("@repo/design-system/components/ui/badge");
const card_1 = require("@repo/design-system/components/ui/card");
const chart_1 = require("@repo/design-system/components/ui/chart");
const utils_1 = require("@repo/design-system/lib/utils");
const recharts_1 = require("recharts");
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
const chartConfig = {
  historical: {
    label: "Historical",
    color: "hsl(var(--chart-1))",
  },
  predicted: {
    label: "Predicted",
    color: "hsl(var(--chart-2))",
  },
};
const segmentColors = {
  Champions: "bg-emerald-500",
  Loyal: "bg-blue-500",
  Growing: "bg-amber-500",
  New: "bg-sky-500",
  "At Risk": "bg-red-500",
};
function PredictiveLTV({ data, className }) {
  const chartData = data.clientSegments.map((segment) => ({
    name: segment.segment,
    historical: segment.avgHistoricalLTV,
    predicted: segment.avgPredictedLTV,
  }));
  return (
    <card_1.Card className={(0, utils_1.cn)("", className)}>
      <card_1.CardHeader>
        <card_1.CardTitle>Predictive LTV</card_1.CardTitle>
        <card_1.CardDescription>
          Model confidence: {data.confidence}% | Avg Predicted:{" "}
          {formatCurrency(data.averagePredictedLTV)}
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent className="space-y-4">
        {data.clientSegments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Not enough data for predictive modeling
          </p>
        ) : (
          <>
            <div className="h-[200px]">
              <chart_1.ChartContainer
                className="h-full w-full"
                config={chartConfig}
              >
                <recharts_1.BarChart data={chartData}>
                  <recharts_1.CartesianGrid
                    className="stroke-muted"
                    strokeDasharray="3 3"
                  />
                  <recharts_1.XAxis
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    dataKey="name"
                    tickLine={false}
                  />
                  <recharts_1.YAxis
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => formatCurrency(value)}
                    tickLine={false}
                  />
                  <chart_1.ChartTooltipContent
                    formatter={(value) => [formatCurrency(value), ""]}
                  />
                  <recharts_1.Bar
                    dataKey="historical"
                    fill="var(--color-historical)"
                    radius={[4, 4, 0, 0]}
                  />
                  <recharts_1.Bar
                    dataKey="predicted"
                    fill="var(--color-predicted)"
                    radius={[4, 4, 0, 0]}
                  />
                </recharts_1.BarChart>
              </chart_1.ChartContainer>
            </div>
            <div className="grid gap-2">
              {data.clientSegments.map((segment) => (
                <div
                  className="flex items-center justify-between text-sm"
                  key={segment.segment}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={(0, utils_1.cn)(
                        "h-2 w-2 rounded-full",
                        segmentColors[segment.segment] ?? "bg-muted"
                      )}
                    />
                    <span className="font-medium">{segment.segment}</span>
                    <badge_1.Badge className="text-xs" variant="secondary">
                      {segment.count} clients
                    </badge_1.Badge>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>Avg: {formatCurrency(segment.avgHistoricalLTV)}</span>
                    <span className="text-emerald-600">
                      +{formatCurrency(segment.growthRate)}/order
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </card_1.CardContent>
    </card_1.Card>
  );
}
