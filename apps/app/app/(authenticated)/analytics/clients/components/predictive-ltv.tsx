"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type PredictiveLTVProps = {
  data: {
    averagePredictedLTV: number;
    confidence: number;
    clientSegments: Array<{
      segment: string;
      count: number;
      avgHistoricalLTV: number;
      avgPredictedLTV: number;
      growthRate: number;
    }>;
  };
  className?: string;
};

const formatCurrency = (value: number) =>
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

const segmentColors: Record<string, string> = {
  Champions: "bg-emerald-500",
  Loyal: "bg-blue-500",
  Growing: "bg-amber-500",
  New: "bg-sky-500",
  "At Risk": "bg-red-500",
};

export function PredictiveLTV({ data, className }: PredictiveLTVProps) {
  const chartData = data.clientSegments.map((segment) => ({
    name: segment.segment,
    historical: segment.avgHistoricalLTV,
    predicted: segment.avgPredictedLTV,
  }));

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Predictive LTV</CardTitle>
        <CardDescription>
          Model confidence: {data.confidence}% | Avg Predicted:{" "}
          {formatCurrency(data.averagePredictedLTV)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.clientSegments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Not enough data for predictive modeling
          </p>
        ) : (
          <>
            <div className="h-[200px]">
              <ChartContainer className="h-full w-full" config={chartConfig}>
                <BarChart data={chartData}>
                  <CartesianGrid
                    className="stroke-muted"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    dataKey="name"
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    className="text-xs fill-muted-foreground"
                    tickFormatter={(value) => formatCurrency(value)}
                    tickLine={false}
                  />
                  <ChartTooltipContent
                    formatter={(value) => [formatCurrency(value as number), ""]}
                  />
                  <Bar
                    dataKey="historical"
                    fill="var(--color-historical)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="predicted"
                    fill="var(--color-predicted)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="grid gap-2">
              {data.clientSegments.map((segment) => (
                <div
                  className="flex items-center justify-between text-sm"
                  key={segment.segment}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        segmentColors[segment.segment] ?? "bg-muted"
                      )}
                    />
                    <span className="font-medium">{segment.segment}</span>
                    <Badge className="text-xs" variant="secondary">
                      {segment.count} clients
                    </Badge>
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
      </CardContent>
    </Card>
  );
}
