"use client";

import { NoDataState } from "@repo/design-system/components/blocks/illustrated-empty-states";
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
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Dot,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useReducer } from "react";

// Types for the multi-location dashboard data
interface LocationMetricBreakdown {
  locationId: string;
  locationName: string;
  value: number;
  formatted: string;
  change?: number;
  budgeted?: number;
  actual?: number;
  total?: number;
  completed?: number;
  itemCount?: number;
}

interface KPI {
  id: string;
  title: string;
  value: number;
  formatted: string;
  change: number;
  changeFormatted: string;
  trend: "up" | "down" | "neutral";
  category: string;
  locationBreakdown: LocationMetricBreakdown[];
}

interface Benchmark {
  id: string;
  title: string;
  currentValue: number;
  target: number;
  formatted: string;
  targetFormatted: string;
  status: "above" | "below" | "near";
  category: string;
}

interface LocationMetrics {
  revenue: number;
  revenueFormatted: string;
  laborUtilization: number;
  laborUtilizationFormatted: string;
  wasteCost: number;
  wasteCostFormatted: string;
  wastePercent: number;
  wastePercentFormatted: string;
  margin: number;
  marginFormatted: string;
  eventCount: number;
  completionRate: number;
  completionRateFormatted: string;
  inventoryValue: number;
  inventoryValueFormatted: string;
  staffCount: number;
  revenuePerStaff: number;
}

interface LocationComparison {
  locationId: string;
  locationName: string;
  isPrimary: boolean;
  metrics: LocationMetrics;
}

interface DashboardData {
  locations: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
    timezone: string | null;
  }>;
  summary: {
    totalLocations: number;
    totalRevenue: number;
    totalRevenueFormatted: string;
    totalStaff: number;
    reportPeriod: {
      start: string;
      end: string;
      previousStart: string;
      previousEnd: string;
    };
  };
  kpis: KPI[];
  benchmarks: Benchmark[];
  locationComparison: LocationComparison[];
  rankings: {
    topRevenue: LocationComparison[];
    topMargin: LocationComparison[];
    topCompletion: LocationComparison[];
    lowestWaste: LocationComparison[];
  };
}

interface MultiLocationDashboardClientProps {
  initialData: DashboardData;
}

type Period = "7d" | "30d" | "90d" | "12m";
type KPICategory = "financial" | "operational" | "inventory" | "productivity";

interface DashboardState {
  period: Period;
  selectedKPIs: string[];
  expandedKPI: string | null;
  expandedLocation: string | null;
  selectedCategories: KPICategory[];
  showBenchmarkAlertsOnly: boolean;
}

type DashboardAction =
  | { type: "SET_PERIOD"; payload: Period }
  | { type: "TOGGLE_KPI"; payload: string }
  | { type: "SET_EXPANDED_KPI"; payload: string | null }
  | { type: "SET_EXPANDED_LOCATION"; payload: string | null }
  | { type: "TOGGLE_CATEGORY"; payload: KPICategory }
  | { type: "TOGGLE_ALERTS_ONLY" };

function dashboardReducer(
  state: DashboardState,
  action: DashboardAction
): DashboardState {
  switch (action.type) {
    case "SET_PERIOD":
      return { ...state, period: action.payload };
    case "TOGGLE_KPI": {
      const selectedKPIs = state.selectedKPIs.includes(action.payload)
        ? state.selectedKPIs.filter((id) => id !== action.payload)
        : [...state.selectedKPIs, action.payload];
      return { ...state, selectedKPIs };
    }
    case "SET_EXPANDED_KPI":
      return { ...state, expandedKPI: action.payload };
    case "SET_EXPANDED_LOCATION":
      return {
        ...state,
        expandedLocation:
          state.expandedLocation === action.payload ? null : action.payload,
      };
    case "TOGGLE_CATEGORY": {
      const selectedCategories = state.selectedCategories.includes(
        action.payload
      )
        ? state.selectedCategories.filter((c) => c !== action.payload)
        : [...state.selectedCategories, action.payload];
      return { ...state, selectedCategories };
    }
    case "TOGGLE_ALERTS_ONLY":
      return {
        ...state,
        showBenchmarkAlertsOnly: !state.showBenchmarkAlertsOnly,
      };
    default:
      return state;
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};

const CATEGORY_LABELS: Record<KPICategory, string> = {
  financial: "Financial",
  operational: "Operational",
  inventory: "Inventory",
  productivity: "Productivity",
};

function MultiLocationDashboardClient({
  initialData,
}: MultiLocationDashboardClientProps) {
  const [state, dispatch] = useReducer(dashboardReducer, {
    period: "30d",
    selectedKPIs: initialData.kpis.map((kpi) => kpi.id),
    expandedKPI: null,
    expandedLocation: null,
    selectedCategories: ["financial", "operational"],
    showBenchmarkAlertsOnly: false,
  });

  const filteredKPIs = initialData.kpis.filter(
    (kpi) =>
      state.selectedKPIs.includes(kpi.id) &&
      state.selectedCategories.includes(kpi.category as KPICategory)
  );

  const filteredBenchmarks = state.showBenchmarkAlertsOnly
    ? initialData.benchmarks.filter((b) => b.status === "below")
    : initialData.benchmarks;

  const getTrendIcon = (trend: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-3 w-3 text-green-500" />;
      case "down":
        return <ArrowDown className="h-3 w-3 text-red-500" />;
      default:
        return <Dot className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getBenchmarkStatusIcon = (status: "above" | "below" | "near") => {
    switch (status) {
      case "above":
        return (
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-green-500" />
        );
      case "below":
        return <XCircle aria-hidden="true" className="h-4 w-4 text-red-500" />;
      case "near":
        return (
          <AlertTriangle
            aria-hidden="true"
            className="h-4 w-4 text-yellow-500"
          />
        );
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-3xl font-bold tracking-tight">
            Multi-Location Executive Dashboard
          </h1>
          <p className="text-muted-foreground">
            Compare performance across {initialData.summary.totalLocations}{" "}
            location{initialData.summary.totalLocations !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {formatDateRange(
              initialData.summary.reportPeriod.start,
              initialData.summary.reportPeriod.end
            )}
          </span>
        </div>
      </div>

      <Separator />

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Period:</span>
        {(Object.keys(PERIOD_LABELS) as Period[]).map((period) => (
          <button
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              state.period === period
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            key={period}
            onClick={() => dispatch({ type: "SET_PERIOD", payload: period })}
            type="button"
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">
              {initialData.summary.totalRevenueFormatted}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Staff</CardDescription>
            <CardTitle className="text-2xl">
              {initialData.summary.totalStaff}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Team members across locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Locations</CardDescription>
            <CardTitle className="text-2xl">
              {initialData.summary.totalLocations}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active locations being tracked
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Margin</CardDescription>
            <CardTitle className="text-2xl">
              {initialData.kpis.find((k) => k.id === "profit-margin")
                ?.formatted || "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Weighted average across locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Categories:</span>
        {(Object.keys(CATEGORY_LABELS) as KPICategory[]).map((category) => (
          <button
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors ${
              state.selectedCategories.includes(category)
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            key={category}
            onClick={() =>
              dispatch({ type: "TOGGLE_CATEGORY", payload: category })
            }
            type="button"
          >
            {state.selectedCategories.includes(category) ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <Dot className="h-3.5 w-3.5" />
            )}
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {/* KPIs Grid */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Key Performance Indicators
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredKPIs.map((kpi) => (
            <Card
              className={`cursor-pointer transition-colors ${
                state.expandedKPI === kpi.id ? "border-primary" : ""
              }`}
              key={kpi.id}
              onClick={() =>
                dispatch({
                  type: "SET_EXPANDED_KPI",
                  payload: state.expandedKPI === kpi.id ? null : kpi.id,
                })
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardDescription className="capitalize">
                    {kpi.title.toLowerCase()}
                  </CardDescription>
                  {getTrendIcon(kpi.trend)}
                </div>
                <CardTitle className="text-2xl">{kpi.formatted}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-medium ${
                      kpi.change >= 0
                        ? kpi.trend === "up"
                          ? "text-green-600"
                          : "text-red-600"
                        : kpi.trend === "down"
                          ? "text-green-600"
                          : "text-red-600"
                    }`}
                  >
                    {kpi.changeFormatted}
                  </span>
                </div>

                {state.expandedKPI === kpi.id && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Breakdown by Location
                    </p>
                    {kpi.locationBreakdown.map((breakdown) => (
                      <div
                        className="flex items-center justify-between text-sm"
                        key={breakdown.locationId}
                      >
                        <span className="text-muted-foreground">
                          {breakdown.locationName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {breakdown.formatted}
                          </span>
                          {breakdown.change !== undefined && (
                            <span
                              className={`text-xs ${
                                breakdown.change >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {breakdown.change >= 0 ? "+" : ""}
                              {breakdown.change.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Benchmarks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Performance Benchmarks
          </h2>
          <button
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm transition-colors ${
              state.showBenchmarkAlertsOnly
                ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => dispatch({ type: "TOGGLE_ALERTS_ONLY" })}
            type="button"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Show alerts only
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {filteredBenchmarks.map((benchmark) => (
            <Card
              className={`transition-colors ${
                benchmark.status === "below"
                  ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20"
                  : benchmark.status === "near"
                    ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/50 dark:bg-yellow-950/20"
                    : ""
              }`}
              key={benchmark.id}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardDescription className="text-xs">
                    {benchmark.title}
                  </CardDescription>
                  {getBenchmarkStatusIcon(benchmark.status)}
                </div>
                <CardTitle className="text-xl">{benchmark.formatted}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Target: {benchmark.targetFormatted}
                  </span>
                  <Badge
                    className="text-xs"
                    variant={
                      benchmark.status === "above"
                        ? "secondary"
                        : benchmark.status === "near"
                          ? "outline"
                          : "destructive"
                    }
                  >
                    {benchmark.status === "above"
                      ? "On track"
                      : benchmark.status === "near"
                        ? "Near target"
                        : "Needs attention"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Rankings */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Top Performers
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Highest Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {initialData.rankings.topRevenue.map((location, index) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={location.locationId}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                              ? "bg-gray-100 text-gray-600"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">
                        {location.locationName}
                      </span>
                      {location.isPrimary && (
                        <Badge className="text-xs" variant="secondary">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">
                      {location.metrics.revenueFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Highest Margins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {initialData.rankings.topMargin.map((location, index) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={location.locationId}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                              ? "bg-gray-100 text-gray-600"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">
                        {location.locationName}
                      </span>
                      {location.isPrimary && (
                        <Badge className="text-xs" variant="secondary">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">
                      {location.metrics.marginFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Best Completion Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {initialData.rankings.topCompletion.map((location, index) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={location.locationId}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                              ? "bg-gray-100 text-gray-600"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">
                        {location.locationName}
                      </span>
                      {location.isPrimary && (
                        <Badge className="text-xs" variant="secondary">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">
                      {location.metrics.completionRateFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-500" />
                Lowest Waste %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {initialData.rankings.lowestWaste.map((location, index) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={location.locationId}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                          index === 0
                            ? "bg-yellow-100 text-yellow-700"
                            : index === 1
                              ? "bg-gray-100 text-gray-600"
                              : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-muted-foreground">
                        {location.locationName}
                      </span>
                      {location.isPrimary && (
                        <Badge className="text-xs" variant="secondary">
                          Primary
                        </Badge>
                      )}
                    </div>
                    <span className="font-medium">
                      {location.metrics.wastePercentFormatted}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Location Comparison Table */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Location Comparison
        </h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Labor Util.</TableHead>
                    <TableHead className="text-right">Waste %</TableHead>
                    <TableHead className="text-right">Completion</TableHead>
                    <TableHead className="text-right">Rev/Staff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {initialData.locationComparison.length === 0 ? (
                    <TableRow>
                      <TableCell className="p-4" colSpan={7}>
                        <NoDataState
                          ambientIntensity={0.4}
                          ambientVariant="particles"
                          dataDescription="locations"
                          description="No locations found. Add locations to see comparisons."
                          enableAmbientAnimation={true}
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    initialData.locationComparison.map((location) => (
                      <>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          key={location.locationId}
                          onClick={() =>
                            dispatch({
                              type: "SET_EXPANDED_LOCATION",
                              payload: location.locationId,
                            })
                          }
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {state.expandedLocation ===
                              location.locationId ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span>{location.locationName}</span>
                              {location.isPrimary && (
                                <Badge className="text-xs" variant="secondary">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {location.metrics.revenueFormatted}
                          </TableCell>
                          <TableCell className="text-right">
                            {location.metrics.marginFormatted}
                          </TableCell>
                          <TableCell className="text-right">
                            {location.metrics.laborUtilizationFormatted}
                          </TableCell>
                          <TableCell className="text-right">
                            {location.metrics.wastePercentFormatted}
                          </TableCell>
                          <TableCell className="text-right">
                            {location.metrics.completionRateFormatted}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(location.metrics.revenuePerStaff)}
                          </TableCell>
                        </TableRow>
                        {state.expandedLocation === location.locationId && (
                          <TableRow>
                            <TableCell className="bg-muted/30" colSpan={7}>
                              <div className="grid gap-4 py-4 md:grid-cols-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Inventory Value
                                  </p>
                                  <p className="font-medium">
                                    {location.metrics.inventoryValueFormatted}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Waste Cost
                                  </p>
                                  <p className="font-medium">
                                    {location.metrics.wasteCostFormatted}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Event Count
                                  </p>
                                  <p className="font-medium">
                                    {location.metrics.eventCount}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Staff Count
                                  </p>
                                  <p className="font-medium">
                                    {location.metrics.staffCount}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export { MultiLocationDashboardClient };
export type { DashboardData, DashboardState };
