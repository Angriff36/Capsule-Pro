"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@repo/design-system/components/ui/chart";
import { cn } from "@repo/design-system/lib/utils";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

interface RevenueTrendsProps {
  className?: string;
  data: Array<{
    month: string;
    revenue: number;
    orders: number;
    clients: number;
  }>;
}

import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";

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

export function RevenueTrends({ data, className }: RevenueTrendsProps) {
  const chartData = data.map((item) => ({
    ...item,
    month: new Date(`${item.month}-01`).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    }),
  }));

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Revenue Trends</CardTitle>
        <CardDescription>
          Monthly revenue and client acquisition
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full" config={chartConfig}>
          <LineChart data={chartData}>
            <CartesianGrid className="stroke-muted" strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              className="fill-muted-foreground text-xs"
              dataKey="month"
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              className="fill-muted-foreground text-xs"
              tickFormatter={(value) => formatCurrency(value)}
              tickLine={false}
            />
            <ChartTooltipContent
              formatter={(value, name) => [
                name === "revenue" && typeof value === "number"
                  ? formatCurrency(value)
                  : value,
                chartConfig[name as keyof typeof chartConfig]?.label ?? name,
              ]}
            />
            <Line
              dataKey="revenue"
              dot={false}
              stroke="var(--color-revenue)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
