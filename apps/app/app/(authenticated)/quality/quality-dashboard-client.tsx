"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useTenantId } from "@/lib/tenant";
import { useQualityRealtime } from "./hooks/use-quality-realtime";

// Lazy load chart components
const ChartContainer = dynamic(
  () =>
    import("@repo/design-system/components/ui/chart").then(
      (m) => m.ChartContainer
    ),
  { ssr: false }
);
const ChartTooltip = dynamic(
  () =>
    import("@repo/design-system/components/ui/chart").then(
      (m) => m.ChartTooltip
    ),
  { ssr: false }
);
const ChartTooltipContent = dynamic(
  () =>
    import("@repo/design-system/components/ui/chart").then(
      (m) => m.ChartTooltipContent
    ),
  { ssr: false }
);
const ChartLegend = dynamic(
  () =>
    import("@repo/design-system/components/ui/chart").then(
      (m) => m.ChartLegend
    ),
  { ssr: false }
);
const ChartLegendContent = dynamic(
  () =>
    import("@repo/design-system/components/ui/chart").then(
      (m) => m.ChartLegendContent
    ),
  { ssr: false }
);
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), {
  ssr: false,
});
const Line = dynamic(() => import("recharts").then((m) => m.Line), {
  ssr: false,
});
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), {
  ssr: false,
});
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), {
  ssr: false,
});
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), {
  ssr: false,
});
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false }
);

interface QualityMetricsData {
  summary: {
    totalInspections: number;
    passedInspections: number;
    failedInspections: number;
    overallPassRate: number;
    openCorrectiveActions: number;
    closedCorrectiveActions: number;
    criticalIssues: number;
    avgPassRate: number;
  };
  trends: {
    totalInspectionsTrend: number;
    passRateTrend: number;
  };
  categoryBreakdown: Array<{
    category: string;
    totalInspections: number;
    avgPassRate: number;
    failedItems: number;
    trend: "up" | "down" | "stable";
  }>;
  severityBreakdown: Array<{
    severity: string;
    count: number;
    percentage: number;
  }>;
  performanceBenchmarks: {
    overallPassRate: number;
    targetPassRate: number;
    onTarget: boolean;
    avgResponseTime: number;
    avgInspectionTime: number;
    completionRate: number;
  };
  trendData?: Array<{
    date: string;
    period: string;
    totalInspections: number;
    passedInspections: number;
    failedInspections: number;
    overallPassRate: number;
    openCorrectiveActions: number;
    closedCorrectiveActions: number;
    avgPassRate: number;
    criticalIssues: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

const CHART_COLORS = {
  pass: "hsl(var(--chart-2))",
  fail: "hsl(var(--chart-1))",
  critical: "hsl(var(--destructive))",
  high: "hsl(var(--chart-3))",
  medium: "hsl(var(--chart-4))",
  low: "hsl(var(--chart-5))",
  open: "hsl(var(--chart-1))",
  closed: "hsl(var(--chart-2))",
  trend: "hsl(var(--primary))",
};

const chartConfig = {
  passRate: {
    label: "Pass Rate",
    color: CHART_COLORS.pass,
  },
  inspections: {
    label: "Inspections",
    color: CHART_COLORS.trend,
  },
  open: {
    label: "Open Actions",
    color: CHART_COLORS.open,
  },
  closed: {
    label: "Closed Actions",
    color: CHART_COLORS.closed,
  },
  critical: {
    label: "Critical",
    color: CHART_COLORS.critical,
  },
  high: {
    label: "High",
    color: CHART_COLORS.high,
  },
  medium: {
    label: "Medium",
    color: CHART_COLORS.medium,
  },
  low: {
    label: "Low",
    color: CHART_COLORS.low,
  },
} satisfies const;

const SEVERITY_COLORS = [
  CHART_COLORS.critical,
  CHART_COLORS.high,
  CHART_COLORS.medium,
  CHART_COLORS.low,
];

function PassRateTrendChart({
  trendData,
}: {
  trendData: QualityMetricsData["trendData"];
}) {
  if (!trendData || trendData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No trend data available
      </div>
    );
  }

  return (
    <ResponsiveContainer height={250} width="100%">
      <LineChart data={trendData}>
        <CartesianGrid className="stroke-muted" strokeDasharray="3 3" />
        <XAxis
          className="text-xs"
          dataKey="period"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          className="text-xs"
          domain={[0, 100]}
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="overallPassRate"
          dot={{ fill: CHART_COLORS.pass, r: 3 }}
          name="Pass Rate (%)"
          stroke={CHART_COLORS.pass}
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function SeverityPieChart({
  severityBreakdown,
}: {
  severityBreakdown: QualityMetricsData["severityBreakdown"];
}) {
  if (severityBreakdown.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No open corrective actions
      </div>
    );
  }

  return (
    <ResponsiveContainer height={250} width="100%">
      <PieChart>
        <Pie
          cx="50%"
          cy="50%"
          data={severityBreakdown}
          dataKey="count"
          fill="#8884d8"
          label={({ severity, percentage }) =>
            `${severity}: ${percentage.toFixed(0)}%`
          }
          labelLine={false}
          outerRadius={80}
        >
          {severityBreakdown.map((entry, index) => (
            <Cell
              fill={SEVERITY_COLORS[index % SEVERITY_COLORS.length]}
              key={`cell-${index}`}
            />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CategoryBarChart({
  categoryBreakdown,
}: {
  categoryBreakdown: QualityMetricsData["categoryBreakdown"];
}) {
  if (categoryBreakdown.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        No category data available
      </div>
    );
  }

  return (
    <ResponsiveContainer height={250} width="100%">
      <BarChart data={categoryBreakdown}>
        <CartesianGrid className="stroke-muted" strokeDasharray="3 3" />
        <XAxis
          className="text-xs"
          dataKey="category"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="avgPassRate"
          fill={CHART_COLORS.pass}
          name="Avg Pass Rate (%)"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface QualityDashboardClientProps {
  orgId: string;
  initialData: QualityMetricsData | null;
}

function QualityDashboardClient({
  orgId,
  initialData,
}: QualityDashboardClientProps) {
  const tenantId = useTenantId();
  const [metrics, setMetrics] = useState<QualityMetricsData | null>(
    initialData
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  const fetchMetrics = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/quality/metrics?period=${selectedPeriod}&includeTrends=true`
      );
      if (response.ok) {
        const result = await response.json();
        setMetrics(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch quality metrics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, selectedPeriod]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Real-time updates
  useQualityRealtime({
    tenantId: tenantId || "",
    onInspectionUpdate: useCallback(() => {
      fetchMetrics();
    }, [fetchMetrics]),
    onCorrectiveActionUpdate: useCallback(() => {
      fetchMetrics();
    }, [fetchMetrics]),
  });

  if (!metrics) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold">Quality Dashboard Unavailable</h1>
        <p className="text-muted-foreground">
          Unable to load quality metrics. Please try again later.
        </p>
      </div>
    );
  }

  const severityVariantMap: Record<
    string,
    "default" | "destructive" | "secondary"
  > = {
    critical: "destructive",
    high: "default",
    medium: "secondary",
    low: "secondary",
  };

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">
            Quality Assurance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time quality metrics tracking with trend analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onChange={(e) => setSelectedPeriod(e.target.value)}
            value={selectedPeriod}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      <Separator />

      {/* Performance Overview Cards */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Overall Pass Rate</CardDescription>
              <CardTitle className="text-2xl">
                {metrics.summary.overallPassRate.toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs ${metrics.trends.passRateTrend >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {metrics.trends.passRateTrend >= 0 ? "↑" : "↓"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {metrics.trends.passRateTrend >= 0 ? "+" : ""}
                  {metrics.trends.passRateTrend.toFixed(1)} pts
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${metrics.summary.overallPassRate}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Total Inspections</CardDescription>
              <CardTitle className="text-2xl">
                {metrics.summary.totalInspections}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs ${metrics.trends.totalInspectionsTrend >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {metrics.trends.totalInspectionsTrend >= 0 ? "↑" : "↓"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {metrics.trends.totalInspectionsTrend >= 0 ? "+" : ""}
                  {metrics.trends.totalInspectionsTrend.toFixed(1)}%
                </span>
              </div>
              <p className="mt-2 text-muted-foreground text-xs">
                {metrics.summary.passedInspections} passed,{" "}
                {metrics.summary.failedInspections} failed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Open Actions</CardDescription>
              <CardTitle className="text-2xl">
                {metrics.summary.openCorrectiveActions}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    metrics.summary.criticalIssues > 0
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {metrics.summary.criticalIssues} critical
                </Badge>
              </div>
              <p className="mt-2 text-muted-foreground text-xs">
                {metrics.summary.closedCorrectiveActions} closed this period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Target Status</CardDescription>
              <CardTitle className="text-2xl">
                {metrics.performanceBenchmarks.onTarget
                  ? "On Track"
                  : "Attention Needed"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs ${metrics.performanceBenchmarks.onTarget ? "text-green-600" : "text-orange-600"}`}
                >
                  {metrics.performanceBenchmarks.onTarget ? "✓" : "!"}
                </span>
                <span className="text-muted-foreground text-xs">
                  Target: {metrics.performanceBenchmarks.targetPassRate}%
                </span>
              </div>
              <p className="mt-2 text-muted-foreground text-xs">
                {metrics.performanceBenchmarks.avgResponseTime.toFixed(1)}h avg
                response time
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pass Rate Trend</CardTitle>
            <CardDescription>Quality performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <PassRateTrendChart trendData={metrics.trendData} />
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Actions by Severity</CardTitle>
            <CardDescription>
              Distribution of corrective actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <SeverityPieChart severityBreakdown={metrics.severityBreakdown} />
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Category</CardTitle>
            <CardDescription>
              Average pass rates per inspection category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <CategoryBarChart categoryBreakdown={metrics.categoryBreakdown} />
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Benchmarks</CardTitle>
            <CardDescription>Key operational metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Completion Rate
                </span>
                <span className="font-semibold">
                  {metrics.performanceBenchmarks.completionRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${metrics.performanceBenchmarks.completionRate}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg Inspection Time
                </span>
                <span className="font-semibold">
                  {metrics.performanceBenchmarks.avgInspectionTime.toFixed(1)}h
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg Response Time
                </span>
                <span className="font-semibold">
                  {metrics.performanceBenchmarks.avgResponseTime.toFixed(1)}h
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Category Breakdown Table */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Category Details
        </h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Inspections</TableHead>
                  <TableHead className="text-right">Pass Rate</TableHead>
                  <TableHead className="text-right">Failed Items</TableHead>
                  <TableHead className="text-right">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.categoryBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="p-4 text-center text-muted-foreground"
                      colSpan={5}
                    >
                      No category data available
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.categoryBreakdown.map((category) => (
                    <TableRow key={category.category}>
                      <TableCell className="font-medium capitalize">
                        {category.category.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-right">
                        {category.totalInspections}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            category.avgPassRate >= 95
                              ? "text-green-600"
                              : category.avgPassRate >= 80
                                ? "text-yellow-600"
                                : "text-red-600"
                          }
                        >
                          {category.avgPassRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {category.failedItems}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            category.trend === "up"
                              ? "default"
                              : category.trend === "stable"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {category.trend}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      {/* Corrective Actions Severity Table */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Corrective Actions by Severity
        </h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.severityBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="p-4 text-center text-muted-foreground"
                      colSpan={3}
                    >
                      No open corrective actions
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.severityBreakdown.map((severity) => (
                    <TableRow key={severity.severity}>
                      <TableCell className="font-medium capitalize">
                        <Badge
                          variant={
                            severityVariantMap[severity.severity] || "secondary"
                          }
                        >
                          {severity.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {severity.count}
                      </TableCell>
                      <TableCell className="text-right">
                        {severity.percentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default QualityDashboardClient;
