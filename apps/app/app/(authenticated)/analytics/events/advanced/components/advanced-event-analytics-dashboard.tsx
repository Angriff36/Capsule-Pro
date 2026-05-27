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
import { Button } from "@repo/design-system/components/ui/button";
import {
  CommandBand,
  CommandBandActions,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageBody,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  DollarSign,
  Users,
  Percent,
  Calendar,
} from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { VegaChart, barChartSpec, lineChartSpec } from "../../../sales/components/vega-chart";
import type { TopLevelSpec } from "vega-lite";

interface AdvancedAnalyticsData {
  summary: {
    totalEvents: number;
    totalRevenue: number;
    averageMargin: number;
    averageGuestCount: number;
    revenueTrend: "up" | "down" | "stable";
    marginTrend: "up" | "down" | "stable";
  };
  profitabilityTrends: Array<{
    period: string;
    revenue: number;
    margin: number;
    events: number;
  }>;
  topMenuItems: Array<{
    dishId: string;
    dishName: string;
    category: string | null;
    eventCount: number;
    avgMarginPerEvent: number;
    totalRevenue: number;
  }>;
  clientPreferences: Array<{
    clientId: string;
    clientName: string;
    eventCount: number;
    totalRevenue: number;
    avgMargin: number;
    preferredEventTypes: string[];
    preferredVenues: string[];
  }>;
  eventTypeAnalysis: Array<{
    eventType: string;
    eventCount: number;
    avgRevenue: number;
    avgMargin: number;
    avgGuestCount: number;
  }>;
  predictiveInsights: {
    nextSeasonForecast: {
      expectedEvents: number;
      expectedRevenue: number;
      confidence: "low" | "medium" | "high";
    };
    recommendedActions: Array<{
      type: "pricing" | "menu" | "venue" | "cost_control";
      priority: "high" | "medium" | "low";
      title: string;
      description: string;
      potentialImpact: string;
    }>;
    riskFactors: Array<{
      type: string;
      severity: "high" | "medium" | "low";
      description: string;
      mitigation: string;
    }>;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up")
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === "down")
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const ConfidenceBadge = ({
  confidence,
}: {
  confidence: "low" | "medium" | "high";
}) => {
  const variants = {
    low: "destructive",
    medium: "default",
    high: "secondary",
  } as const;
  return (
    <Badge variant={variants[confidence]} className="text-xs">
      {confidence} confidence
    </Badge>
  );
};

const PriorityBadge = ({
  priority,
}: {
  priority: "high" | "medium" | "low";
}) => {
  const colors = {
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  return (
    <Badge className={`text-xs ${colors[priority]}`}>{priority} priority</Badge>
  );
};

export function AdvancedEventAnalyticsDashboard() {
  const [data, setData] = useState<AdvancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("12m");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiFetch(
          `/api/analytics/events/advanced?period=${selectedPeriod}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Failed to load advanced analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedPeriod]);

  const handleExportCSV = () => {
    if (!data) return;

    const rows: string[][] = [];

    // Summary section
    rows.push(["ADVANCED EVENT ANALYTICS REPORT"]);
    rows.push([`Period: Last ${selectedPeriod.replace("m", " months")}`]);
    rows.push(["Generated:", new Date().toISOString()]);
    rows.push([]);

    // Summary metrics
    rows.push(["SUMMARY METRICS"]);
    rows.push(["Total Events", data.summary.totalEvents.toString()]);
    rows.push(["Total Revenue", formatCurrency(data.summary.totalRevenue)]);
    rows.push(["Average Margin", `${data.summary.averageMargin.toFixed(2)}%`]);
    rows.push(["Average Guest Count", data.summary.averageGuestCount.toFixed(0)]);
    rows.push(["Revenue Trend", data.summary.revenueTrend]);
    rows.push(["Margin Trend", data.summary.marginTrend]);
    rows.push([]);

    // Profitability trends
    rows.push(["PROFITABILITY TRENDS"]);
    rows.push(["Period", "Revenue", "Margin", "Events"]);
    data.profitabilityTrends.forEach((t) => {
      rows.push([t.period, formatCurrency(t.revenue), `${t.margin.toFixed(2)}%`, t.events.toString()]);
    });
    rows.push([]);

    // Top menu items
    rows.push(["TOP MENU ITEMS"]);
    rows.push(["Dish Name", "Category", "Event Count", "Avg Margin", "Total Revenue"]);
    data.topMenuItems.forEach((item) => {
      rows.push([
        item.dishName,
        item.category || "N/A",
        item.eventCount.toString(),
        formatCurrency(item.avgMarginPerEvent),
        formatCurrency(item.totalRevenue),
      ]);
    });
    rows.push([]);

    // Client preferences
    rows.push(["CLIENT PREFERENCES"]);
    rows.push(["Client", "Event Count", "Total Revenue", "Avg Margin", "Preferred Types"]);
    data.clientPreferences.forEach((client) => {
      rows.push([
        client.clientName,
        client.eventCount.toString(),
        formatCurrency(client.totalRevenue),
        `${client.avgMargin.toFixed(2)}%`,
        client.preferredEventTypes.join("; "),
      ]);
    });
    rows.push([]);

    // Event type analysis
    rows.push(["EVENT TYPE ANALYSIS"]);
    rows.push(["Event Type", "Count", "Avg Revenue", "Avg Margin", "Avg Guests"]);
    data.eventTypeAnalysis.forEach((type) => {
      rows.push([
        type.eventType,
        type.eventCount.toString(),
        formatCurrency(type.avgRevenue),
        `${type.avgMargin.toFixed(2)}%`,
        type.avgGuestCount.toFixed(0),
      ]);
    });

    // Create CSV content
    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `advanced-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...new Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-24 animate-pulse bg-muted rounded" />
                <div className="h-8 w-32 mt-2 animate-pulse bg-muted rounded" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Error loading analytics</h3>
          <p className="text-sm text-muted-foreground text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No analytics data available</h3>
          <p className="text-sm text-muted-foreground">
            Analytics data will appear as events are completed
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const revenueTrendData = data.profitabilityTrends.map((t) => ({
    label: t.period,
    value: t.revenue,
  }));

  const marginTrendData = data.profitabilityTrends.map((t) => ({
    label: t.period,
    value: t.margin,
  }));

  const eventTypeData = data.eventTypeAnalysis.map((t) => ({
    label: t.eventType,
    value: t.eventCount,
  }));

  const clientRevenueData = data.clientPreferences.slice(0, 10).map((c) => ({
    label: c.clientName.length > 20 ? c.clientName.slice(0, 20) + "..." : c.clientName,
    value: c.totalRevenue,
  }));

  const menuItemData = data.topMenuItems.slice(0, 10).map((m) => ({
    label: m.dishName.length > 25 ? m.dishName.slice(0, 25) + "..." : m.dishName,
    value: m.eventCount,
  }));

  return (
    <>
      <CommandBand>
        <CommandBandHeader>
          <MonoLabel tone="dark">Analytics</MonoLabel>
          <DisplayHeading size="md">Advanced Event Analytics</DisplayHeading>
          <CommandBandLede>
            Comprehensive insights into event performance, profitability trends,
            and predictive analytics.
          </CommandBandLede>
        </CommandBandHeader>
        <CommandBandActions>
          <Select onValueChange={setSelectedPeriod} value={selectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="on-dark" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </CommandBandActions>
      </CommandBand>

      <MetricBand>
        <MetricCell>
          <MetricValue>{data.summary.totalEvents}</MetricValue>
          <MetricLabel>Total events · in selected period</MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>{formatCurrency(data.summary.totalRevenue)}</MetricValue>
          <MetricLabel>
            Total revenue ·{" "}
            {data.summary.revenueTrend === "up"
              ? "Growing"
              : data.summary.revenueTrend === "down"
                ? "Declining"
                : "Stable"}
          </MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>{data.summary.averageMargin.toFixed(1)}%</MetricValue>
          <MetricLabel>
            Avg margin ·{" "}
            {data.summary.marginTrend === "up"
              ? "Improving"
              : data.summary.marginTrend === "down"
                ? "Declining"
                : "Stable"}
          </MetricLabel>
        </MetricCell>
        <MetricCell>
          <MetricValue>{data.summary.averageGuestCount.toFixed(0)}</MetricValue>
          <MetricLabel>Avg guests · per event</MetricLabel>
        </MetricCell>
      </MetricBand>

      <PageBody>
        <OperationalColumn>
          {/* Profitability Trends Charts */}
          <SectionHeader title="Profitability Trends" />
        <div className="grid gap-6 md:grid-cols-2">
          <VegaChart
            spec={lineChartSpec({
              xTitle: "Period",
              yTitle: "Revenue",
              showCurrency: true,
            })}
            data={revenueTrendData}
            title="Revenue Over Time"
            description="Monthly revenue trends for the selected period"
            height={250}
          />

          <VegaChart
            spec={lineChartSpec({
              xTitle: "Period",
              yTitle: "Margin (%)",
              color: "hsl(142, 76%, 36%)",
            })}
            data={marginTrendData}
            title="Margin Trends"
            description="Monthly profit margin percentage"
            height={250}
          />
        </div>

          <SectionHeader title="Event & Menu Analysis" />
        <div className="grid gap-6 md:grid-cols-2">
          <VegaChart
            spec={barChartSpec({
              xTitle: "Event Type",
              yTitle: "Events",
            })}
            data={eventTypeData}
            title="Events by Type"
            description="Distribution of events by type"
            height={300}
          />

          <VegaChart
            spec={barChartSpec({
              xTitle: "Menu Item",
              yTitle: "Event Count",
              color: "hsl(280, 65%, 45%)",
            })}
            data={menuItemData}
            title="Most Popular Menu Items"
            description="Top menu items by event frequency"
            height={300}
          />
        </div>

          <SectionHeader title="Client Revenue Analysis" />
        <VegaChart
          spec={barChartSpec({
            xTitle: "Client",
            yTitle: "Revenue",
            showCurrency: true,
          })}
          data={clientRevenueData}
          title="Top Clients by Revenue"
          description="Revenue contribution by top clients"
          height={300}
        />

        {data.clientPreferences.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Client Preferences Detail</CardTitle>
              <CardDescription>
                Detailed breakdown of client preferences and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium">Client</th>
                      <th className="py-2 text-right font-medium">Events</th>
                      <th className="py-2 text-right font-medium">Revenue</th>
                      <th className="py-2 text-right font-medium">Avg Margin</th>
                      <th className="py-2 text-left font-medium">Preferred Types</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clientPreferences.slice(0, 10).map((client) => (
                      <tr className="border-b hover:bg-muted/50" key={client.clientId}>
                        <td className="py-2">{client.clientName}</td>
                        <td className="py-2 text-right">{client.eventCount}</td>
                        <td className="py-2 text-right">
                          {formatCurrency(client.totalRevenue)}
                        </td>
                        <td className="py-2 text-right">
                          {client.avgMargin.toFixed(1)}%
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {client.preferredEventTypes.slice(0, 2).map((type) => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                            {client.preferredEventTypes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{client.preferredEventTypes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

          <SectionHeader
            title="Predictive Insights & Recommendations"
            icon={<Lightbulb className="h-4 w-4" />}
          />

        <div className="grid gap-6 md:grid-cols-3">
          {/* Forecast Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Next Season Forecast</CardTitle>
              <CardDescription>
                AI-powered predictions for upcoming quarter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Expected Events</div>
                <div className="text-2xl font-bold">
                  {data.predictiveInsights.nextSeasonForecast.expectedEvents}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Expected Revenue</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.predictiveInsights.nextSeasonForecast.expectedRevenue)}
                </div>
              </div>
              <div>
                <ConfidenceBadge
                  confidence={data.predictiveInsights.nextSeasonForecast.confidence}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recommendations Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Recommended Actions</CardTitle>
              <CardDescription>
                AI-generated suggestions based on your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.predictiveInsights.recommendedActions.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">Everything looks good! No urgent actions needed.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.predictiveInsights.recommendedActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{action.title}</span>
                          <PriorityBadge priority={action.priority} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {action.description}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Potential impact: {action.potentialImpact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Risk Factors */}
        {data.predictiveInsights.riskFactors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Risk Factors
              </CardTitle>
              <CardDescription>
                Areas requiring attention to maintain performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {data.predictiveInsights.riskFactors.map((risk, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      risk.severity === "high"
                        ? "border-l-red-500 bg-red-50 dark:bg-red-950/20"
                        : risk.severity === "medium"
                          ? "border-l-orange-500 bg-orange-50 dark:bg-orange-950/20"
                          : "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{risk.type}</h4>
                      <Badge
                        variant={risk.severity === "high" ? "destructive" : "outline"}
                        className="text-xs"
                      >
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                    <p className="text-xs font-medium">
                      Mitigation: {risk.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        </OperationalColumn>
      </PageBody>
    </>
  );
}
