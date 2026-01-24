"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RevenueTrends = RevenueTrends;
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
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  clients: {
    label: "Clients",
    color: "hsl(var(--chart-2))",
  },
};
function RevenueTrends({ data, className }) {
  const chartData = data.map((item) => ({
    ...item,
    month: new Date(`${item.month}-01`).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
  }));
  return (
    <card_1.Card className={(0, utils_1.cn)("", className)}>
      <card_1.CardHeader>
        <card_1.CardTitle>Revenue Trends</card_1.CardTitle>
        <card_1.CardDescription>
          Monthly revenue and client acquisition
        </card_1.CardDescription>
      </card_1.CardHeader>
      <card_1.CardContent>
        <chart_1.ChartContainer
          className="h-[300px] w-full"
          config={chartConfig}
        >
          <recharts_1.LineChart data={chartData}>
            <recharts_1.CartesianGrid
              className="stroke-muted"
              strokeDasharray="3 3"
            />
            <recharts_1.XAxis
              axisLine={false}
              className="text-xs fill-muted-foreground"
              dataKey="month"
              tickLine={false}
            />
            <recharts_1.YAxis
              axisLine={false}
              className="text-xs fill-muted-foreground"
              tickFormatter={(value) => formatCurrency(value)}
              tickLine={false}
            />
            <chart_1.ChartTooltipContent
              formatter={(value, name) => [
                name === "revenue" && typeof value === "number"
                  ? formatCurrency(value)
                  : value,
                chartConfig[name]?.label ?? name,
              ]}
            />
            <recharts_1.Line
              dataKey="revenue"
              dot={false}
              stroke="var(--color-revenue)"
              strokeWidth={2}
              type="monotone"
            />
          </recharts_1.LineChart>
        </chart_1.ChartContainer>
      </card_1.CardContent>
    </card_1.Card>
  );
}
