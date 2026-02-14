"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChartBuilder } from "./components/chart-builder";
import { ComparisonTable } from "./components/comparison-table";
import { DataTable } from "./components/data-table";
import { FunnelBySourceTable } from "./components/funnel-by-source-table";
import { KpiCard, type KpiCardProps } from "./components/kpi-card";
import { PricingSummaryTable } from "./components/pricing-summary-table";
import { SegmentSummaryTable } from "./components/segment-summary-table";
import { ValidationTable } from "./components/validation-table";
import {
  barChartSpec,
  lineChartSpec,
  VegaChart,
} from "./components/vega-chart";
import {
  type AnnualMetrics,
  buildDateColumnOptionsForUI,
  type CellValue,
  type DataRow,
  getCreatedDateCol,
  getEventDateCol,
  loadSalesData,
  type MonthlyMetrics,
  prepareSalesMetrics,
  type QuarterlyMetrics,
  type SalesData,
  validateFunnel,
  type WeeklyMetrics,
} from "./lib/sales-analytics";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const formatSignedCurrency = (value: number) =>
  value >= 0 ? `+${formatCurrency(value)}` : formatCurrency(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);

const formatSignedPercent = (value: number) =>
  value >= 0 ? `+${formatPercent(value)}` : formatPercent(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

const formatDateRange = (start: Date, end: Date) =>
  `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

const formatDateForInput = (date: Date) => date.toISOString().split("T")[0];

const parseInputDate = (value: string) => new Date(`${value}T00:00:00`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
    const epoch = Math.round((value - 25_569) * 86_400 * 1000);
    const date = new Date(epoch);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const getColumnsFromRows = (rows: DataRow[]) => {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return Array.from(columns);
};

const getDateRange = (rows: DataRow[], column: string | null) => {
  if (!column) return null;
  const dates = rows
    .map((row) => toDateValue(row[column]))
    .filter((value): value is Date => Boolean(value));
  if (!dates.length) return null;
  const times = dates.map((date) => date.getTime());
  return {
    min: new Date(Math.min(...times)),
    max: new Date(Math.max(...times)),
  };
};

const mapRowsWithDates = (
  rows: DataRow[],
  createdChoice: string | null,
  eventChoice: string | null
) =>
  rows.map((row) => {
    const next: DataRow = { ...row };
    if (createdChoice && createdChoice in row) {
      next.created_date = row[createdChoice] ?? null;
    }
    if (eventChoice && eventChoice in row) {
      next.event_date = row[eventChoice] ?? null;
    }
    return next;
  });

interface TopItem {
  label: string;
  value: number;
}

const getTopItem = <T extends Record<string, CellValue>>(
  items: T[],
  labelKey: keyof T,
  valueKey: keyof T
): TopItem | null => {
  let top: TopItem | null = null;
  for (const item of items) {
    const rawValue = item[valueKey];
    const numeric =
      typeof rawValue === "number"
        ? rawValue
        : rawValue === null || rawValue === undefined
          ? Number.NaN
          : Number(rawValue);
    if (!Number.isFinite(numeric)) continue;
    if (!top || numeric > top.value) {
      const labelValue = item[labelKey];
      top = {
        label: labelValue ? String(labelValue) : "Unknown",
        value: numeric,
      };
    }
  }
  return top;
};

const findRowLabel = (row: DataRow): string | null => {
  const candidates = [
    "event",
    "event name",
    "client",
    "venue",
    "account",
    "company",
    "organization",
    "name",
  ];
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const match = entries.find(
      ([key, value]) =>
        key
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim()
          .includes(candidate) && value
    );
    if (match) return String(match[1]);
  }
  const fallback = entries.find(
    ([, value]) => typeof value === "string" && value.trim()
  );
  return fallback ? String(fallback[1]) : null;
};

// ---------------------------------------------------------------------------
// Report summary builders
// ---------------------------------------------------------------------------

interface ReportSummary {
  title: string;
  windowLabel: string;
  kpis: KpiCardProps[];
  highlights?: string[];
}

const buildWeeklySummary = (weekly: WeeklyMetrics): ReportSummary => {
  const highlights: string[] = [];
  const topRevenue = getTopItem(
    weekly.revenueByEventType,
    "event_type",
    "revenue"
  );
  if (topRevenue) {
    highlights.push(
      `Top revenue event type: ${topRevenue.label} (${formatCurrency(topRevenue.value)})`
    );
  }
  const topLost = getTopItem(weekly.trendingLost, "lost_reason", "count");
  if (topLost) {
    highlights.push(
      `Most common lost reason: ${topLost.label} (${formatNumber(topLost.value)})`
    );
  }
  const pendingLabel = weekly.topPending.length
    ? findRowLabel(weekly.topPending[0])
    : null;
  if (pendingLabel) {
    highlights.push(`Top pending item: ${pendingLabel}`);
  }
  return {
    title: "Weekly Sales Summary",
    windowLabel: formatDateRange(weekly.window.start, weekly.window.end),
    kpis: [
      { label: "Leads", value: formatNumber(weekly.leadsReceived) },
      { label: "Proposals", value: formatNumber(weekly.proposalsSent) },
      { label: "Won", value: formatNumber(weekly.eventsWon) },
      { label: "Closing Ratio", value: formatPercent(weekly.closingRatio) },
    ],
    highlights,
  };
};

const buildMonthlySummary = (monthly: MonthlyMetrics): ReportSummary => {
  const highlights: string[] = [];
  const topLead = getTopItem(
    monthly.leadSourceBreakdown,
    "lead_source",
    "count"
  );
  if (topLead) {
    highlights.push(
      `Top lead source: ${topLead.label} (${formatNumber(topLead.value)})`
    );
  }
  const topPackage = getTopItem(monthly.topPackages, "package", "revenue");
  if (topPackage) {
    highlights.push(
      `Top package: ${topPackage.label} (${formatCurrency(topPackage.value)})`
    );
  }
  const revenueSubtext =
    `MoM ${formatSignedCurrency(monthly.revenueMomDelta)} ` +
    `(${formatSignedPercent(monthly.revenueMomPct)}) · ` +
    `YoY ${formatSignedCurrency(monthly.revenueYoyDelta)} ` +
    `(${formatSignedPercent(monthly.revenueYoyPct)})`;
  return {
    title: "Monthly Sales Summary",
    windowLabel: formatDateRange(monthly.window.start, monthly.window.end),
    kpis: [
      {
        label: "Total Revenue",
        value: formatCurrency(monthly.totalRevenueBooked),
        subtext: revenueSubtext,
      },
      {
        label: "Events Closed",
        value: formatNumber(monthly.totalEventsClosed),
      },
      {
        label: "Average Event",
        value: formatCurrency(monthly.averageEventValue),
      },
      {
        label: "Pipeline Forecast",
        value: formatCurrency(monthly.pipelineForecast90),
        subtext: `Next 60 days ${formatCurrency(monthly.pipelineForecast60)}`,
      },
    ],
    highlights,
  };
};

const buildQuarterlySummary = (quarterly: QuarterlyMetrics): ReportSummary => {
  const highlights: string[] = [];
  const topVenue = getTopItem(
    quarterly.venuePerformance,
    "venue_source",
    "revenue"
  );
  if (topVenue) {
    highlights.push(
      `Top venue partner: ${topVenue.label} (${formatCurrency(topVenue.value)})`
    );
  }
  if (quarterly.segmentSummary.length) {
    const topSegment = quarterly.segmentSummary
      .slice()
      .sort((a, b) => b.revenue - a.revenue)[0];
    highlights.push(
      `Top segment: ${topSegment.event_type} / ${topSegment.size_bucket} / ${topSegment.budget_tier}`
    );
  }
  highlights.push(
    `Next quarter forecast: ${formatCurrency(quarterly.nextQuarterForecast)}`
  );
  if (quarterly.recommendations[0]) {
    highlights.push(`Recommendation: ${quarterly.recommendations[0]}`);
  }
  return {
    title: "Quarterly Sales Summary",
    windowLabel: formatDateRange(quarterly.window.start, quarterly.window.end),
    kpis: [
      {
        label: "Total Revenue",
        value: formatCurrency(quarterly.totalRevenueBooked),
      },
      {
        label: "Events Closed",
        value: formatNumber(quarterly.totalEventsClosed),
      },
      {
        label: "Average Event",
        value: formatCurrency(quarterly.averageEventValue),
      },
      {
        label: "Sales Cycle (days)",
        value: formatNumber(Math.round(quarterly.avgSalesCycleDays)),
      },
    ],
    highlights,
  };
};

const buildAnnualSummary = (annual: AnnualMetrics): ReportSummary => {
  const highlights: string[] = [];
  const topEventType = getTopItem(
    annual.revenueByEventType,
    "event_type",
    "revenue"
  );
  if (topEventType) {
    highlights.push(
      `Top event type: ${topEventType.label} (${formatCurrency(topEventType.value)})`
    );
  }
  const topLead = getTopItem(
    annual.leadSourceBreakdown,
    "lead_source",
    "count"
  );
  if (topLead) {
    highlights.push(
      `Top lead source: ${topLead.label} (${formatNumber(topLead.value)})`
    );
  }
  return {
    title: "Annual Sales Summary",
    windowLabel: formatDateRange(annual.window.start, annual.window.end),
    kpis: [
      {
        label: "Total Revenue",
        value: formatCurrency(annual.totalRevenueBooked),
        subtext: `YoY ${formatSignedCurrency(annual.revenueYoyDelta)} (${formatSignedPercent(annual.revenueYoyPct)})`,
      },
      { label: "Events Closed", value: formatNumber(annual.totalEventsClosed) },
      {
        label: "Average Event",
        value: formatCurrency(annual.averageEventValue),
      },
      {
        label: "Pipeline Forecast",
        value: formatCurrency(annual.pipelineForecast90),
        subtext: "Next 90 days",
      },
    ],
    highlights,
  };
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SalesDashboardClient() {
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [createdChoice, setCreatedChoice] = useState<string | null>(null);
  const [eventChoice, setEventChoice] = useState<string | null>(null);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [weekAnchor, setWeekAnchor] = useState<string>("");
  const [monthAnchor, setMonthAnchor] = useState<string>("");
  const [quarterAnchor, setQuarterAnchor] = useState<string>("");
  const [dateDefaultsSet, setDateDefaultsSet] = useState(false);

  // File upload handler - supports xlsx, xls, and csv
  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const buffer = await file.arrayBuffer();
      const xlsx = await import("xlsx");

      let workbook: ReturnType<typeof xlsx.read>;
      if (file.name.toLowerCase().endsWith(".csv")) {
        // Parse CSV as a workbook with a single sheet
        const text = new TextDecoder().decode(buffer);
        workbook = xlsx.read(text, { type: "string", cellDates: true });
      } else {
        workbook = xlsx.read(buffer, { type: "array", cellDates: true });
      }

      const data = await loadSalesData(workbook);
      setSalesData(data);
      setFileName(file.name);
      setDateDefaultsSet(false);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to parse workbook"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      handleFile(file);
    },
    [handleFile]
  );

  // Column detection
  const columns = useMemo(
    () => (salesData ? getColumnsFromRows(salesData.masterEvents) : []),
    [salesData]
  );

  const dateColumnOptions = useMemo(() => {
    if (!salesData) return { detected: [], ratios: {} };
    return buildDateColumnOptionsForUI(salesData.masterEvents);
  }, [salesData]);

  const columnOptions = useMemo(() => {
    if (!columns.length) return [];
    if (showAllColumns) return columns;
    return dateColumnOptions?.detected.length
      ? dateColumnOptions.detected
      : columns;
  }, [columns, dateColumnOptions?.detected, showAllColumns]);

  useEffect(() => {
    if (!(salesData && columnOptions.length)) return;
    if (!createdChoice) {
      setCreatedChoice(
        getCreatedDateCol(salesData.masterEvents) ?? columnOptions[0]
      );
    }
    if (!eventChoice) {
      setEventChoice(
        getEventDateCol(salesData.masterEvents) ?? columnOptions[0]
      );
    }
  }, [salesData, columnOptions, createdChoice, eventChoice]);

  useEffect(() => {
    if (!salesData || dateDefaultsSet) return;
    const createdColumn = createdChoice ?? eventChoice;
    const eventColumn = eventChoice ?? createdChoice;
    if (!(createdColumn || eventColumn)) return;

    const createdRange = getDateRange(
      salesData.masterEvents,
      createdColumn ?? null
    );
    const eventRange = getDateRange(
      salesData.masterEvents,
      eventColumn ?? null
    );
    if (!(createdRange || eventRange)) return;

    const anchor = eventRange?.max ?? createdRange?.max ?? new Date();
    setWeekAnchor(formatDateForInput(anchor));
    setMonthAnchor(
      formatDateForInput(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
    );
    const quarterStartMonth = Math.floor(anchor.getMonth() / 3) * 3;
    setQuarterAnchor(
      formatDateForInput(new Date(anchor.getFullYear(), quarterStartMonth, 1))
    );
    setDateDefaultsSet(true);
  }, [salesData, createdChoice, eventChoice, dateDefaultsSet]);

  // Compute metrics
  const metrics = useMemo(() => {
    if (!salesData) return null;
    const created = createdChoice ?? eventChoice;
    const event = eventChoice ?? createdChoice;
    if (!(created && event)) return null;
    return prepareSalesMetrics({
      salesData,
      createdChoice: created,
      eventChoice: event,
      weekAnchor: weekAnchor ? parseInputDate(weekAnchor) : new Date(),
      monthAnchor: monthAnchor ? parseInputDate(monthAnchor) : new Date(),
      quarterAnchor: quarterAnchor ? parseInputDate(quarterAnchor) : new Date(),
    });
  }, [
    salesData,
    createdChoice,
    eventChoice,
    weekAnchor,
    monthAnchor,
    quarterAnchor,
  ]);

  const validation = useMemo(() => {
    if (!salesData) return null;
    const created = createdChoice ?? eventChoice;
    const event = eventChoice ?? createdChoice;
    if (!(created && event)) return null;
    const mappedMaster = mapRowsWithDates(
      salesData.masterEvents,
      created,
      event
    );
    return validateFunnel(mappedMaster, salesData.calcsFunnel);
  }, [salesData, createdChoice, eventChoice]);

  // Flat data for chart builder
  const flatData = useMemo(() => {
    if (!salesData) return [];
    return salesData.masterEvents as Record<string, unknown>[];
  }, [salesData]);

  const createdRatio = createdChoice
    ? (dateColumnOptions?.ratios[createdChoice] ?? 0)
    : 0;
  const eventRatio = eventChoice
    ? (dateColumnOptions?.ratios[eventChoice] ?? 0)
    : 0;
  const createdRange = salesData
    ? getDateRange(salesData.masterEvents, createdChoice ?? eventChoice)
    : null;
  const eventRange = salesData
    ? getDateRange(salesData.masterEvents, eventChoice ?? createdChoice)
    : null;

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Sales Analytics</h1>
        <p className="text-muted-foreground">
          Upload a workbook to explore sales performance and build custom
          charts.
        </p>
      </div>

      <Separator />

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Data</CardTitle>
          <CardDescription>
            Upload an Excel workbook (.xlsx/.xls) or CSV file with your sales
            data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="sales-upload">Data file</Label>
            <Input
              accept=".xlsx,.xls,.csv"
              id="sales-upload"
              onChange={handleFileInput}
              type="file"
            />
            {fileName ? (
              <p className="text-xs text-muted-foreground">
                Loaded: {fileName}
              </p>
            ) : null}
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Parsing file...</p>
          ) : null}
          {loadError ? (
            <Alert variant="destructive">
              <AlertTitle>File Error</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {salesData ? (
        <>
          {/* Column Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Column Mapping</CardTitle>
              <CardDescription>
                Confirm the columns that represent created dates and event dates
                for analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Created Date column (funnel)</Label>
                  <Select
                    onValueChange={setCreatedChoice}
                    value={createdChoice ?? ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map((column) => (
                        <SelectItem key={`created-${column}`} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {createdRatio < 0.5 ? (
                    <p className="text-xs text-amber-600">
                      Created Date column has low date coverage.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Event Date column (revenue/pipeline)</Label>
                  <Select
                    onValueChange={setEventChoice}
                    value={eventChoice ?? ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columnOptions.map((column) => (
                        <SelectItem key={`event-${column}`} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {eventRatio < 0.5 ? (
                    <p className="text-xs text-amber-600">
                      Event Date column has low date coverage.
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={showAllColumns}
                  id="show-all-columns"
                  onCheckedChange={(checked) =>
                    setShowAllColumns(checked === true)
                  }
                />
                <Label htmlFor="show-all-columns">Show all columns</Label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Week anchor</Label>
                  <Input
                    onChange={(e) => setWeekAnchor(e.target.value)}
                    type="date"
                    value={weekAnchor}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Month anchor</Label>
                  <Input
                    onChange={(e) => setMonthAnchor(e.target.value)}
                    type="date"
                    value={monthAnchor}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quarter anchor</Label>
                  <Input
                    onChange={(e) => setQuarterAnchor(e.target.value)}
                    type="date"
                    value={quarterAnchor}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workbook Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle>Data Snapshot</CardTitle>
              <CardDescription>
                Master Events: {formatNumber(salesData.masterEvents.length)}{" "}
                &middot; Deals Lost: {formatNumber(salesData.dealsLost.length)}{" "}
                &middot; Lead Source:{" "}
                {formatNumber(salesData.leadSource.length)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                RAW sheets loaded:{" "}
                {formatNumber(Object.keys(salesData.rawSheets).length)}
              </p>
              <p>
                Created Date coverage:{" "}
                {createdRatio ? formatPercent(createdRatio) : "N/A"} &middot;
                Range:{" "}
                {createdRange
                  ? `${createdRange.min.toLocaleDateString()} to ${createdRange.max.toLocaleDateString()}`
                  : "N/A"}
              </p>
              <p>
                Event Date coverage:{" "}
                {eventRatio ? formatPercent(eventRatio) : "N/A"} &middot; Range:{" "}
                {eventRange
                  ? `${eventRange.min.toLocaleDateString()} to ${eventRange.max.toLocaleDateString()}`
                  : "N/A"}
              </p>
            </CardContent>
          </Card>

          {/* Main Tabs */}
          {metrics ? (
            <Tabs className="space-y-6" defaultValue="weekly">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                <TabsTrigger value="annual">Annual</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
                <TabsTrigger value="chart-builder">Chart Builder</TabsTrigger>
              </TabsList>

              {/* ============ WEEKLY ============ */}
              <TabsContent className="space-y-6" value="weekly">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Metrics</CardTitle>
                    <CardDescription>
                      {formatDateRange(
                        metrics.weekly.window.start,
                        metrics.weekly.window.end
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <KpiCard
                        label="Leads"
                        value={formatNumber(metrics.weekly.leadsReceived)}
                      />
                      <KpiCard
                        label="Proposals"
                        value={formatNumber(metrics.weekly.proposalsSent)}
                      />
                      <KpiCard
                        label="Won"
                        value={formatNumber(metrics.weekly.eventsWon)}
                      />
                      <KpiCard
                        label="Closing Ratio"
                        value={formatPercent(metrics.weekly.closingRatio)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <VegaChart
                    data={metrics.weekly.revenueByEventType.map((item) => ({
                      label: item.event_type,
                      value: item.revenue,
                    }))}
                    description="Booked revenue by event type in the selected week."
                    spec={barChartSpec({ showCurrency: true })}
                    title="Revenue by Event Type"
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Trending Lost Reasons</CardTitle>
                      <CardDescription>
                        Top loss reasons in the selected week.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={["lost_reason", "count"]}
                        emptyText="No lost reasons recorded."
                        maxRows={6}
                        rows={metrics.weekly.trendingLost as DataRow[]}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Upcoming / Pending</CardTitle>
                    <CardDescription>
                      Top pending events with the highest value.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      emptyText="No pending events in this window."
                      maxRows={5}
                      rows={metrics.weekly.topPending.map((row) => {
                        const next: DataRow = { ...row };
                        const statusValue = row._status;
                        if (statusValue !== undefined) {
                          next.status = statusValue;
                        }
                        return next;
                      })}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ MONTHLY ============ */}
              <TabsContent className="space-y-6" value="monthly">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Metrics</CardTitle>
                    <CardDescription>
                      {formatDateRange(
                        metrics.monthly.window.start,
                        metrics.monthly.window.end
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <KpiCard
                        label="Total Revenue"
                        subtext={
                          `MoM ${formatSignedCurrency(metrics.monthly.revenueMomDelta)} ` +
                          `(${formatSignedPercent(metrics.monthly.revenueMomPct)}) · ` +
                          `YoY ${formatSignedCurrency(metrics.monthly.revenueYoyDelta)} ` +
                          `(${formatSignedPercent(metrics.monthly.revenueYoyPct)})`
                        }
                        value={formatCurrency(
                          metrics.monthly.totalRevenueBooked
                        )}
                      />
                      <KpiCard
                        label="Events Closed"
                        value={formatNumber(metrics.monthly.totalEventsClosed)}
                      />
                      <KpiCard
                        label="Average Event"
                        value={formatCurrency(
                          metrics.monthly.averageEventValue
                        )}
                      />
                      <KpiCard
                        label="Pipeline Forecast"
                        subtext={`Next 60 days ${formatCurrency(metrics.monthly.pipelineForecast60)}`}
                        value={formatCurrency(
                          metrics.monthly.pipelineForecast90
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <VegaChart
                    data={metrics.monthly.leadSourceBreakdown.map((item) => ({
                      label: item.lead_source,
                      value: item.count,
                    }))}
                    spec={barChartSpec()}
                    title="Lead Source Breakdown"
                  />
                  <VegaChart
                    data={metrics.monthly.salesFunnel.map((item) => ({
                      label: item.stage,
                      value: item.count,
                    }))}
                    spec={barChartSpec()}
                    title="Sales Funnel"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <VegaChart
                    data={metrics.monthly.closingBySalesperson.map((item) => ({
                      label: item.salesperson,
                      value: item.win_rate,
                    }))}
                    description="Win rate by salesperson."
                    spec={barChartSpec()}
                    title="Closing by Salesperson"
                  />
                  <VegaChart
                    data={metrics.monthly.topPackages.map((item) => ({
                      label: item.package,
                      value: item.revenue,
                    }))}
                    spec={barChartSpec({ showCurrency: true })}
                    title="Top Packages"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Win/Loss Trends</CardTitle>
                      <CardDescription>
                        Top loss reasons this month.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={["lost_reason", "count"]}
                        maxRows={8}
                        rows={metrics.monthly.winLossTrends as DataRow[]}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Closing Performance</CardTitle>
                      <CardDescription>
                        Win/loss counts by salesperson.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={["salesperson", "won", "lost", "win_rate"]}
                        maxRows={8}
                        rows={metrics.monthly.closingBySalesperson.map(
                          (row) => ({
                            salesperson: row.salesperson,
                            won: row.won,
                            lost: row.lost,
                            win_rate: formatPercent(row.win_rate),
                          })
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ============ QUARTERLY ============ */}
              <TabsContent className="space-y-6" value="quarterly">
                <Card>
                  <CardHeader>
                    <CardTitle>Quarterly Metrics</CardTitle>
                    <CardDescription>
                      {formatDateRange(
                        metrics.quarterly.window.start,
                        metrics.quarterly.window.end
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <KpiCard
                        label="Total Revenue"
                        value={formatCurrency(
                          metrics.quarterly.totalRevenueBooked
                        )}
                      />
                      <KpiCard
                        label="Events Closed"
                        value={formatNumber(
                          metrics.quarterly.totalEventsClosed
                        )}
                      />
                      <KpiCard
                        label="Average Event"
                        value={formatCurrency(
                          metrics.quarterly.averageEventValue
                        )}
                      />
                      <KpiCard
                        label="Sales Cycle (days)"
                        value={formatNumber(
                          Math.round(metrics.quarterly.avgSalesCycleDays)
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <VegaChart
                    data={metrics.quarterly.funnelBySource.map((item) => ({
                      label: item.lead_source,
                      value: item.Inquiries,
                    }))}
                    spec={barChartSpec()}
                    title="Funnel by Source (Inquiries)"
                  />
                  <VegaChart
                    data={metrics.quarterly.funnelBySource.map((item) => ({
                      label: item.lead_source,
                      value: item.win_rate,
                    }))}
                    spec={barChartSpec()}
                    title="Funnel Win Rate"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <VegaChart
                    data={metrics.quarterly.venuePerformance.map((item) => ({
                      label: item.venue_source,
                      value: item.revenue,
                    }))}
                    description="Revenue by venue partner."
                    spec={barChartSpec({ showCurrency: true })}
                    title="Venue Partner Performance"
                  />
                  <VegaChart
                    data={metrics.quarterly.pricingTrends.map((item) => ({
                      label: formatDateLabel(item.month),
                      value: item.avg_discount_rate,
                    }))}
                    description="Average discount rate for won events."
                    spec={lineChartSpec()}
                    title="Avg Discount Rate"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Customer Segment Analysis</CardTitle>
                      <CardDescription>
                        Top 12 segments by revenue.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SegmentSummaryTable
                        rows={metrics.quarterly.segmentSummary}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Pricing Summary</CardTitle>
                      <CardDescription>
                        Budget vs actual performance.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PricingSummaryTable
                        rows={metrics.quarterly.pricingSummary}
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Funnel by Source Details</CardTitle>
                      <CardDescription>
                        Inquiry-to-win pipeline breakdown.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FunnelBySourceTable
                        rows={metrics.quarterly.funnelBySource}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Win/Loss Review</CardTitle>
                      <CardDescription>
                        Top loss reasons this quarter.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DataTable
                        columns={["lost_reason", "count"]}
                        maxRows={6}
                        rows={metrics.quarterly.winLossTrends as DataRow[]}
                      />
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Next Quarter Forecast</CardTitle>
                    <CardDescription>
                      Projected revenue based on current pipeline.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">
                      {formatCurrency(metrics.quarterly.nextQuarterForecast)}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {metrics.quarterly.recommendations.length ? (
                        metrics.quarterly.recommendations.map((item) => (
                          <div className="flex items-start gap-2" key={item}>
                            <Badge variant="secondary">Action</Badge>
                            <p className="text-sm text-muted-foreground">
                              {item}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No recommendations this quarter.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Opportunities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {metrics.quarterly.opportunities.length ? (
                        metrics.quarterly.opportunities.map((item) => (
                          <div className="flex items-start gap-2" key={item}>
                            <Badge variant="outline">Opportunity</Badge>
                            <p className="text-sm text-muted-foreground">
                              {item}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No opportunities flagged.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ============ ANNUAL ============ */}
              <TabsContent className="space-y-6" value="annual">
                <Card>
                  <CardHeader>
                    <CardTitle>Annual Metrics</CardTitle>
                    <CardDescription>
                      {formatDateRange(
                        metrics.annual.window.start,
                        metrics.annual.window.end
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <KpiCard
                        label="Total Revenue"
                        subtext={`YoY ${formatSignedCurrency(metrics.annual.revenueYoyDelta)} (${formatSignedPercent(metrics.annual.revenueYoyPct)})`}
                        value={formatCurrency(
                          metrics.annual.totalRevenueBooked
                        )}
                      />
                      <KpiCard
                        label="Events Closed"
                        value={formatNumber(metrics.annual.totalEventsClosed)}
                      />
                      <KpiCard
                        label="Average Event"
                        value={formatCurrency(metrics.annual.averageEventValue)}
                      />
                      <KpiCard
                        label="Pipeline Forecast"
                        subtext="Next 90 days"
                        value={formatCurrency(
                          metrics.annual.pipelineForecast90
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <VegaChart
                    data={metrics.annual.revenueByMonth.map((item) => ({
                      label: formatDateLabel(item.month),
                      value: item.revenue,
                    }))}
                    spec={lineChartSpec({ showCurrency: true })}
                    title="Revenue by Month"
                  />
                  <VegaChart
                    data={metrics.annual.revenueByEventType.map((item) => ({
                      label: item.event_type,
                      value: item.revenue,
                    }))}
                    spec={barChartSpec({ showCurrency: true })}
                    title="Revenue by Event Type"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <VegaChart
                    data={metrics.annual.leadSourceBreakdown.map((item) => ({
                      label: item.lead_source,
                      value: item.count,
                    }))}
                    spec={barChartSpec()}
                    title="Lead Source Breakdown"
                  />
                  <VegaChart
                    data={metrics.annual.salesFunnel.map((item) => ({
                      label: item.stage,
                      value: item.count,
                    }))}
                    spec={barChartSpec()}
                    title="Sales Funnel"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <VegaChart
                    data={metrics.annual.closingBySalesperson.map((item) => ({
                      label: item.salesperson,
                      value: item.win_rate,
                    }))}
                    spec={barChartSpec()}
                    title="Closing by Salesperson"
                  />
                  <VegaChart
                    data={metrics.annual.topPackages.map((item) => ({
                      label: item.package,
                      value: item.revenue,
                    }))}
                    spec={barChartSpec({ showCurrency: true })}
                    title="Top Packages"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Win/Loss Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      columns={["lost_reason", "count"]}
                      maxRows={8}
                      rows={metrics.annual.winLossTrends as DataRow[]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ COMPARISON ============ */}
              <TabsContent className="space-y-6" value="comparison">
                <Card>
                  <CardHeader>
                    <CardTitle>Comparative View</CardTitle>
                    <CardDescription>
                      Week, month, quarter, YTD, and annual side-by-side
                      performance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <VegaChart
                        data={metrics.summaries.map((s) => ({
                          label: s.label,
                          value: s.revenue,
                        }))}
                        spec={barChartSpec({ showCurrency: true })}
                        title="Revenue by Period"
                      />
                      <VegaChart
                        data={metrics.summaries.map((s) => ({
                          label: s.label,
                          value: s.closingRatio,
                        }))}
                        spec={barChartSpec()}
                        title="Closing Ratio by Period"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Period Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComparisonTable summaries={metrics.summaries} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ VALIDATION ============ */}
              <TabsContent className="space-y-6" value="validation">
                <Card>
                  <CardHeader>
                    <CardTitle>Funnel Validation</CardTitle>
                    <CardDescription>
                      Compare calculated funnel metrics against the CALCS_Funnel
                      sheet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {salesData.calcsFunnel.length === 0 ? (
                      <Alert>
                        <AlertTitle>CALCS_Funnel sheet not found</AlertTitle>
                        <AlertDescription>
                          Add the CALCS_Funnel sheet to enable validation
                          checks.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                    {validation ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              validation.passed ? "secondary" : "destructive"
                            }
                          >
                            {validation.passed ? "Pass" : "Fail"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Tolerance: 1%
                          </span>
                        </div>
                        <ValidationTable results={validation.results} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Select columns to run validation.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ CHART BUILDER ============ */}
              <TabsContent className="space-y-6" value="chart-builder">
                <Card>
                  <CardHeader>
                    <CardTitle>Chart Builder</CardTitle>
                    <CardDescription>
                      Build custom visualizations from your data. Choose from
                      50+ chart types, map your columns, and export as PNG or
                      SVG.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartBuilder data={flatData} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Alert>
              <AlertTitle>Waiting for selections</AlertTitle>
              <AlertDescription>
                Select columns to generate metrics.
              </AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <Alert>
          <AlertTitle>Load a file to begin</AlertTitle>
          <AlertDescription>
            The dashboard will appear after you upload an Excel workbook or CSV
            file.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
