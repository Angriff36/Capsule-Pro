"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Search,
  TrendingDown,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  type DepletionForecast,
  type ForecastAlert,
  type ForecastPoint,
  formatDate,
  generateReorderSuggestions,
  getConfidenceColor,
  getDepletionForecast,
  getDepletionText,
  getForecastAlerts,
  getReorderSuggestions,
  getUrgencyColor,
  type ReorderSuggestion,
} from "../../../lib/use-forecasts";

// Get all inventory items (simplified - in production would use real API)
const COMMON_SKUS = [
  "SKU001", // Example: Chicken Breast
  "SKU002", // Example: Ground Beef
  "SKU003", // Example: Salmon Fillet
  "SKU004", // Example: Pasta
  "SKU005", // Example: Rice
  "SKU006", // Example: Olive Oil
  "SKU007", // Example: Tomatoes
  "SKU008", // Example: Lettuce
  "SKU009", // Example: Butter
  "SKU010", // Example: Flour
];

export const ForecastsPageClient = () => {
  // Search state
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [safetyStockDays, setSafetyStockDays] = useState<number>(3);

  // Data state
  const [forecast, setForecast] = useState<DepletionForecast | null>(null);
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<ReorderSuggestion[]>([]);
  const [alerts, setAlerts] = useState<ForecastAlert[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Dialog state
  const [_selectedForecastDetail, setSelectedForecastDetail] =
    useState<DepletionForecast | null>(null);

  // Fetch forecast for selected SKU
  const fetchForecast = useCallback(async () => {
    if (!selectedSku) {
      toast.error("Please select or enter a SKU");
      return;
    }

    setIsLoading(true);
    try {
      const data = await getDepletionForecast(selectedSku, horizonDays);
      setForecast(data);
      setSelectedForecastDetail(data);
      // Also fetch suggestions for this SKU
      const suggestionData = await getReorderSuggestions(
        selectedSku,
        leadTimeDays,
        safetyStockDays
      );
      setSuggestions(suggestionData);
      toast.success(`Forecast loaded for ${selectedSku}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch forecast";
      toast.error(message);
      setForecast(null);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSku, horizonDays, leadTimeDays, safetyStockDays]);

  // Fetch all reorder suggestions
  const fetchAllSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getReorderSuggestions(
        undefined,
        leadTimeDays,
        safetyStockDays
      );
      setAllSuggestions(data);
      toast.success(`Loaded ${data.length} reorder suggestions`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch suggestions";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [leadTimeDays, safetyStockDays]);

  // Fetch forecast alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const data = await getForecastAlerts(7, 14);
      setAlerts(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch alerts";
      toast.error(message);
    }
  }, []);

  // Generate new suggestions
  const handleGenerateSuggestions = useCallback(
    async (save = false) => {
      setIsGenerating(true);
      try {
        const data = await generateReorderSuggestions(
          selectedSku,
          leadTimeDays,
          safetyStockDays,
          save
        );
        setAllSuggestions(data.suggestions);
        if (selectedSku) {
          setSuggestions(
            data.suggestions.filter(
              (s: ReorderSuggestion) => s.sku === selectedSku
            )
          );
        }
        toast.success(`Generated ${data.count} reorder suggestions`);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate suggestions";
        toast.error(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedSku, leadTimeDays, safetyStockDays]
  );

  // Load all suggestions and alerts on mount
  useEffect(() => {
    fetchAllSuggestions();
    fetchAlerts();
  }, [fetchAllSuggestions, fetchAlerts]);

  // Calculate summary stats
  const criticalCount = allSuggestions.filter(
    (s) => s.urgency === "critical"
  ).length;
  const warningCount = allSuggestions.filter(
    (s) => s.urgency === "warning"
  ).length;
  const depletingSoonCount =
    forecast &&
    forecast.daysUntilDepletion !== null &&
    forecast.daysUntilDepletion <= 7
      ? 1
      : 0;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      {/* Page Header */}
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">
          Depletion Forecasting
        </h1>
        <p className="text-muted-foreground">
          Predict inventory depletion and generate reorder alerts
        </p>
      </div>
      <Separator />

      {/* Performance Overview Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Performance Overview
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total Alerts</CardDescription>
              <CardTitle>{allSuggestions.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Items requiring attention
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Critical</CardDescription>
              <CardTitle className="text-destructive">
                {criticalCount}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Immediate action required
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Warning</CardDescription>
              <CardTitle>{warningCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              May deplete soon
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Depleting Soon</CardDescription>
              <CardTitle>{depletingSoonCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Within 7 days
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Forecast Analysis Section */}
      <section className="space-y-4">
        <Tabs className="space-y-4" defaultValue="forecast">
          <TabsList>
            <TabsTrigger value="forecast">Forecast Analysis</TabsTrigger>
            <TabsTrigger value="alerts">
              Reorder Alerts
              {allSuggestions.length > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {allSuggestions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Forecast Analysis Tab */}
          <TabsContent className="space-y-4" value="forecast">
            {/* Search/Filter Card */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Forecast</CardTitle>
                <CardDescription>
                  Enter a SKU to predict when inventory will deplete based on
                  upcoming events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <div className="flex gap-2">
                      <Select
                        onValueChange={setSelectedSku}
                        value={selectedSku}
                      >
                        <SelectTrigger className="flex-1" id="sku">
                          <SelectValue placeholder="Select SKU" />
                        </SelectTrigger>
                        <SelectContent>
                          {COMMON_SKUS.map((sku) => (
                            <SelectItem key={sku} value={sku}>
                              {sku}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => {
                          const input = document.getElementById(
                            "manual-sku"
                          ) as HTMLInputElement;
                          if (input?.value) {
                            setSelectedSku(input.value);
                          }
                        }}
                        size="icon"
                        variant="outline"
                      >
                        <Search className="size-4" />
                      </Button>
                    </div>
                    <Input
                      className="mt-2"
                      id="manual-sku"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setSelectedSku((e.target as HTMLInputElement).value);
                        }
                      }}
                      placeholder="Or enter custom SKU"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="horizon">Forecast Horizon (Days)</Label>
                    <Input
                      id="horizon"
                      max={365}
                      min={1}
                      onChange={(e) =>
                        setHorizonDays(
                          Number.parseInt(e.target.value, 10) || 30
                        )
                      }
                      type="number"
                      value={horizonDays}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="leadTime">Lead Time (Days)</Label>
                    <Input
                      id="leadTime"
                      max={90}
                      min={1}
                      onChange={(e) =>
                        setLeadTimeDays(
                          Number.parseInt(e.target.value, 10) || 7
                        )
                      }
                      type="number"
                      value={leadTimeDays}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="safetyStock">Safety Stock (Days)</Label>
                    <Input
                      id="safetyStock"
                      max={30}
                      min={0}
                      onChange={(e) =>
                        setSafetyStockDays(
                          Number.parseInt(e.target.value, 10) || 3
                        )
                      }
                      type="number"
                      value={safetyStockDays}
                    />
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    disabled={!selectedSku || isLoading}
                    onClick={fetchForecast}
                  >
                    <Activity className="mr-2 size-4" />
                    Generate Forecast
                  </Button>
                  <Button
                    disabled={isLoading}
                    onClick={fetchAllSuggestions}
                    variant="outline"
                  >
                    <RefreshCw
                      className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh Suggestions
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Forecast Results */}
            {forecast && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Forecast Results: {forecast.sku}</span>
                    <Badge variant={getConfidenceColor(forecast.confidence)}>
                      Confidence: {forecast.confidence.toUpperCase()}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Current Stock: {forecast.currentStock} units | Depletion:{" "}
                    {getDepletionText(forecast.daysUntilDepletion)}
                    {forecast.depletionDate &&
                      ` (${formatDate(forecast.depletionDate)})`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Summary Stats */}
                  <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground">
                        Current Stock
                      </div>
                      <div className="text-2xl font-bold">
                        {forecast.currentStock}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground">
                        Days Until Depletion
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          forecast.daysUntilDepletion !== null &&
                          forecast.daysUntilDepletion <= 7
                            ? "text-destructive"
                            : ""
                        }`}
                      >
                        {forecast.daysUntilDepletion ?? "N/A"}
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm text-muted-foreground">
                        Confidence Level
                      </div>
                      <div className="text-2xl font-bold capitalize">
                        {forecast.confidence}
                      </div>
                    </div>
                  </div>

                  {/* Forecast Chart */}
                  <div className="mb-6">
                    <h3 className="mb-4 font-semibold">Depletion Trend</h3>
                    {(() => {
                      // Prepare chart data
                      const chartData = forecast.forecast.map((point) => ({
                        date: new Date(point.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                        stock: Math.max(0, point.projectedStock),
                        usage: point.usage,
                        hasEvent: point.eventName ? true : false,
                        eventName: point.eventName || "",
                      }));

                      // Find depletion date for reference line
                      const depletionPoint = forecast.forecast.find(
                        (p) => p.projectedStock <= 0
                      );

                      const chartConfig = {
                        stock: {
                          label: "Projected Stock",
                          color: "hsl(var(--chart-1))",
                        },
                        usage: {
                          label: "Daily Usage",
                          color: "hsl(var(--chart-2))",
                        },
                      };

                      return (
                        <ChartContainer
                          className="h-[300px] w-full"
                          config={chartConfig}
                        >
                          <AreaChart data={chartData}>
                            <CartesianGrid
                              className="stroke-muted"
                              strokeDasharray="3 3"
                            />
                            <XAxis
                              axisLine={false}
                              className="text-xs fill-muted-foreground"
                              dataKey="date"
                              tickLine={false}
                            />
                            <YAxis
                              axisLine={false}
                              className="text-xs fill-muted-foreground"
                              tickLine={false}
                            />
                            <ChartTooltipContent
                              formatter={(
                                value: string | number,
                                name: string
                              ) => {
                                const numValue =
                                  typeof value === "number"
                                    ? value
                                    : Number.parseFloat(value);
                                if (name === "stock") {
                                  return [
                                    `${numValue.toFixed(0)} units`,
                                    "Projected Stock",
                                  ];
                                }
                                if (name === "usage") {
                                  return [
                                    `${numValue.toFixed(1)}`,
                                    "Daily Usage",
                                  ];
                                }
                                return [value, name];
                              }}
                              labelFormatter={(label) => {
                                return `Date: ${label}`;
                              }}
                            />
                            <Area
                              dataKey="stock"
                              dot={false}
                              fill="var(--color-stock)"
                              fillOpacity={0.2}
                              stroke="var(--color-stock)"
                              strokeWidth={2}
                              type="monotone"
                            />
                            {depletionPoint && (
                              <ReferenceLine
                                label={{
                                  value: "Depletion",
                                  position: "insideBottomRight",
                                }}
                                stroke="hsl(var(--destructive))"
                                strokeDasharray="5 5"
                                x={new Date(
                                  depletionPoint.date
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              />
                            )}
                          </AreaChart>
                        </ChartContainer>
                      );
                    })()}
                    {forecast.depletionDate && (
                      <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="size-4 text-destructive" />
                        <span>
                          Predicted depletion:{" "}
                          {formatDate(forecast.depletionDate)} (
                          {forecast.daysUntilDepletion} days)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Historical Usage Comparison */}
                  {forecast.forecast.length > 0 && (
                    <div className="mb-6">
                      <h3 className="mb-4 font-semibold">Daily Usage Trend</h3>
                      {(() => {
                        const usageChartData = forecast.forecast.map(
                          (point) => ({
                            date: new Date(point.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            ),
                            usage: point.usage,
                            isEvent: point.eventName ? true : false,
                          })
                        );

                        const chartConfig = {
                          usage: {
                            label: "Daily Usage",
                            color: "hsl(var(--chart-3))",
                          },
                        };

                        return (
                          <ChartContainer
                            className="h-[200px] w-full"
                            config={chartConfig}
                          >
                            <LineChart data={usageChartData}>
                              <CartesianGrid
                                className="stroke-muted"
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                axisLine={false}
                                className="text-xs fill-muted-foreground"
                                dataKey="date"
                                tickLine={false}
                              />
                              <YAxis
                                axisLine={false}
                                className="text-xs fill-muted-foreground"
                                tickLine={false}
                              />
                              <ChartTooltipContent
                                formatter={(value: string | number) => {
                                  const numValue =
                                    typeof value === "number"
                                      ? value
                                      : Number.parseFloat(value);
                                  return [
                                    `${numValue.toFixed(1)} units`,
                                    "Usage",
                                  ];
                                }}
                                labelFormatter={(label) => `Date: ${label}`}
                              />
                              <Line
                                dataKey="usage"
                                dot={(props: {
                                  payload: { isEvent: boolean };
                                }) => {
                                  const { payload } = props;
                                  return (
                                    <circle
                                      cx={0}
                                      cy={0}
                                      fill={
                                        payload.isEvent
                                          ? "hsl(var(--destructive))"
                                          : "hsl(var(--chart-3))"
                                      }
                                      r={payload.isEvent ? 5 : 3}
                                    />
                                  );
                                }}
                                stroke="var(--color-usage)"
                                strokeWidth={2}
                                type="monotone"
                              />
                            </LineChart>
                          </ChartContainer>
                        );
                      })()}
                      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <div className="size-3 rounded-full bg-[hsl(var(--chart-3))]" />
                          <span>Regular usage</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="size-3 rounded-full bg-[hsl(var(--destructive))]" />
                          <span>Event spike</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forecast Table */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">
                            Projected Stock
                          </TableHead>
                          <TableHead className="text-right">Usage</TableHead>
                          <TableHead>Event</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {forecast.forecast.map(
                          (point: ForecastPoint, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                {formatDate(point.date)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={`font-bold ${
                                    point.projectedStock <= 0
                                      ? "text-destructive"
                                      : ""
                                  }`}
                                >
                                  {point.projectedStock.toFixed(0)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {point.usage > 0 ? point.usage.toFixed(1) : "-"}
                              </TableCell>
                              <TableCell>
                                {point.eventName ? (
                                  <span className="text-xs text-muted-foreground">
                                    {point.eventName}
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Depletion Alert */}
                  {forecast.depletionDate && (
                    <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-destructive" />
                        <div className="font-semibold text-destructive">
                          Stock Depletion Predicted
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-destructive/80">
                        This item is predicted to run out of stock on{" "}
                        {formatDate(forecast.depletionDate)} (
                        {forecast.daysUntilDepletion} days from now). Consider
                        placing a reorder soon.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Suggestions for Selected SKU */}
            {suggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Reorder Suggestions for {selectedSku}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {suggestions.map((suggestion, index) => (
                      <div
                        className="flex items-start gap-4 rounded-lg border p-4"
                        key={index}
                      >
                        <Badge variant={getUrgencyColor(suggestion.urgency)}>
                          {suggestion.urgency.toUpperCase()}
                        </Badge>
                        <div className="flex-1">
                          <div className="font-semibold">{suggestion.sku}</div>
                          <div className="text-sm text-muted-foreground">
                            {suggestion.justification}
                          </div>
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Current Stock:</span>{" "}
                            {suggestion.currentStock} |{" "}
                            <span className="font-medium">Reorder Point:</span>{" "}
                            {suggestion.reorderPoint} |{" "}
                            <span className="font-medium">
                              Recommended Order:
                            </span>{" "}
                            <span className="font-bold text-primary">
                              {suggestion.recommendedOrderQty} units
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Reorder Alerts Tab */}
          <TabsContent className="space-y-4" value="alerts">
            {/* Forecast-Based Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Depletion Alerts</span>
                  <Button
                    disabled={isLoading}
                    onClick={fetchAlerts}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw
                      className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </CardTitle>
                <CardDescription>
                  Items forecasted to run out within 14 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="mb-4 size-12 text-green-500" />
                    <h3 className="text-lg font-semibold">All Clear!</h3>
                    <p className="text-sm text-muted-foreground">
                      No items are forecasted to deplete within 14 days.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Critical Alerts (7 days) */}
                    {alerts.filter((a) => a.urgency === "critical").length >
                      0 && (
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-2 font-semibold text-destructive">
                          <AlertTriangle className="size-4" />
                          Critical (
                          {
                            alerts.filter((a) => a.urgency === "critical")
                              .length
                          }
                          )
                        </h4>
                        <div className="space-y-2">
                          {alerts
                            .filter((a) => a.urgency === "critical")
                            .map((alert, index) => (
                              <div
                                className="flex items-start gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4"
                                key={`critical-${index}`}
                              >
                                <Badge variant="destructive">
                                  {alert.daysUntilDepletion} days
                                </Badge>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold">
                                      {alert.sku}
                                    </div>
                                    <Badge
                                      className="capitalize"
                                      variant={getConfidenceColor(
                                        alert.confidence
                                      )}
                                    >
                                      {alert.confidence}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    Current: {alert.currentStock} units |
                                    Depletion: {formatDate(alert.depletionDate)}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Button
                                      onClick={() => {
                                        toast.success(
                                          `Reorder request created for ${alert.sku}`
                                        );
                                      }}
                                      size="sm"
                                      variant="destructive"
                                    >
                                      <ArrowDown className="mr-1 size-3" />
                                      Request Reorder
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Warning Alerts (14 days) */}
                    {alerts.filter((a) => a.urgency === "warning").length >
                      0 && (
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-2 font-semibold text-orange-500">
                          <TrendingDown className="size-4" />
                          Warning (
                          {alerts.filter((a) => a.urgency === "warning").length}
                          )
                        </h4>
                        <div className="space-y-2">
                          {alerts
                            .filter((a) => a.urgency === "warning")
                            .map((alert, index) => (
                              <div
                                className="flex items-start gap-4 rounded-lg border border-orange-500/50 bg-orange-500/5 p-4"
                                key={`warning-${index}`}
                              >
                                <Badge
                                  className="bg-orange-500 text-white"
                                  variant="secondary"
                                >
                                  {alert.daysUntilDepletion} days
                                </Badge>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="font-semibold">
                                      {alert.sku}
                                    </div>
                                    <Badge
                                      className="capitalize"
                                      variant={getConfidenceColor(
                                        alert.confidence
                                      )}
                                    >
                                      {alert.confidence}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    Current: {alert.currentStock} units |
                                    Depletion: {formatDate(alert.depletionDate)}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Button
                                      onClick={() => {
                                        toast.success(
                                          `Reorder request created for ${alert.sku}`
                                        );
                                      }}
                                      size="sm"
                                      variant="outline"
                                    >
                                      <ArrowRight className="mr-1 size-3" />
                                      Request Reorder
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reorder Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Reorder Suggestions</span>
                  <Button
                    disabled={isGenerating}
                    onClick={() => handleGenerateSuggestions(false)}
                    size="sm"
                  >
                    <RefreshCw
                      className={`mr-2 size-4 ${isGenerating ? "animate-spin" : ""}`}
                    />
                    Regenerate
                  </Button>
                </CardTitle>
                <CardDescription>
                  Items that need to be reordered based on forecast analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allSuggestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="mb-4 size-12 text-green-500" />
                    <h3 className="text-lg font-semibold">All Clear!</h3>
                    <p className="text-sm text-muted-foreground">
                      No reorder alerts at this time. All inventory is above
                      reorder points.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allSuggestions.map((suggestion, index) => (
                      <div
                        className="flex items-start gap-4 rounded-lg border p-4"
                        key={index}
                      >
                        <Badge variant={getUrgencyColor(suggestion.urgency)}>
                          {suggestion.urgency.toUpperCase()}
                        </Badge>
                        <div className="flex-1">
                          <div className="font-semibold">{suggestion.sku}</div>
                          <div className="text-sm text-muted-foreground">
                            {suggestion.justification}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            <span>
                              <span className="font-medium">Current:</span>{" "}
                              {suggestion.currentStock}
                            </span>
                            <span>
                              <span className="font-medium">
                                Reorder Point:
                              </span>{" "}
                              {suggestion.reorderPoint}
                            </span>
                            <span>
                              <span className="font-medium">Lead Time:</span>{" "}
                              {suggestion.leadTimeDays} days
                            </span>
                            <span className="font-bold text-primary">
                              <span className="font-medium">Order:</span>{" "}
                              {suggestion.recommendedOrderQty} units
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            toast.success(
                              `Purchase order created for ${suggestion.sku}`
                            );
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Create PO
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
};
