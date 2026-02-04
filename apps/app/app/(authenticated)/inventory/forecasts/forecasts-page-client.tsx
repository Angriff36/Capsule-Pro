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
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type DepletionForecast,
  type ForecastPoint,
  formatDate,
  generateReorderSuggestions,
  getConfidenceColor,
  getDepletionForecast,
  getDepletionText,
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

  // Load all suggestions on mount
  useEffect(() => {
    fetchAllSuggestions();
  }, [fetchAllSuggestions]);

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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Reorder Alerts</span>
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
                        <Button size="sm" variant="outline">
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
