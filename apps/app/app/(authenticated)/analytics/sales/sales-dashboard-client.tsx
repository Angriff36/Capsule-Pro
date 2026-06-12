"use client";

import {
  CommandBand,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MonoLabel,
  OperationalColumn,
  PageBody,
  PageCanvas,
} from "@repo/design-system/components/blocks/page-shell";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/design-system/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SalesMetricsTabs } from "./components/sales-metrics-tabs";
import {
  buildDateColumnOptionsForUI,
  getCreatedDateCol,
  getEventDateCol,
  loadSalesData,
  prepareSalesMetrics,
  type SalesData,
  validateFunnel,
} from "./lib/sales-analytics";
import {
  formatDateForInput,
  formatNumber,
  formatPercent,
  getDateRange,
  mapRowsWithDates,
  parseInputDate,
} from "./lib/sales-helpers";

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
      if (!file) {
        return;
      }
      handleFile(file);
    },
    [handleFile]
  );

  // Column detection
  const columns = useMemo(
    () =>
      salesData
        ? Array.from(
            new Set(salesData.masterEvents.flatMap((row) => Object.keys(row)))
          )
        : [],
    [salesData]
  );

  const dateColumnOptions = useMemo(() => {
    if (!salesData) {
      return { detected: [], ratios: {} };
    }
    return buildDateColumnOptionsForUI(salesData.masterEvents);
  }, [salesData]);

  const columnOptions = useMemo(() => {
    if (!columns.length) {
      return [];
    }
    if (showAllColumns) {
      return columns;
    }
    return dateColumnOptions?.detected.length
      ? dateColumnOptions.detected
      : columns;
  }, [columns, dateColumnOptions?.detected, showAllColumns]);

  useEffect(() => {
    if (!(salesData && columnOptions.length)) {
      return;
    }
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
    if (!salesData || dateDefaultsSet) {
      return;
    }
    const createdColumn = createdChoice ?? eventChoice;
    const eventColumn = eventChoice ?? createdChoice;
    if (!(createdColumn || eventColumn)) {
      return;
    }

    const createdRange = getDateRange(
      salesData.masterEvents,
      createdColumn ?? null
    );
    const eventRange = getDateRange(
      salesData.masterEvents,
      eventColumn ?? null
    );
    if (!(createdRange || eventRange)) {
      return;
    }

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
    if (!salesData) {
      return null;
    }
    const created = createdChoice ?? eventChoice;
    const event = eventChoice ?? createdChoice;
    if (!(created && event)) {
      return null;
    }
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
    if (!salesData) {
      return null;
    }
    const created = createdChoice ?? eventChoice;
    const event = eventChoice ?? createdChoice;
    if (!(created && event)) {
      return null;
    }
    const mappedMaster = mapRowsWithDates(
      salesData.masterEvents,
      created,
      event
    );
    return validateFunnel(mappedMaster, salesData.calcsFunnel);
  }, [salesData, createdChoice, eventChoice]);

  // Flat data for chart builder
  const flatData = useMemo(() => {
    if (!salesData) {
      return [];
    }
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
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div>
            <MonoLabel tone="dark">Analytics</MonoLabel>
            <DisplayHeading size="md">Sales Analytics</DisplayHeading>
            <CommandBandLede>
              Upload a workbook to explore sales performance and build custom
              charts.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
      </CommandBand>

      <PageBody>
        <OperationalColumn>
          {/* Upload Card */}
          <Card tone="canvas">
            <CardHeader>
              <CardTitle>Upload Data</CardTitle>
              <CardDescription>
                Upload an Excel workbook (.xlsx/.xls) or CSV file with your
                sales data.
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
                  <p className="text-muted-foreground text-xs">
                    Loaded: {fileName}
                  </p>
                ) : null}
              </div>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Parsing file...</p>
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
              <Card tone="canvas">
                <CardHeader>
                  <CardTitle>Column Mapping</CardTitle>
                  <CardDescription>
                    Confirm the columns that represent created dates and event
                    dates for analysis.
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
                            <SelectItem
                              key={`created-${column}`}
                              value={column}
                            >
                              {column}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {createdRatio < 0.5 ? (
                        <p className="text-amber-600 text-xs">
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
                        <p className="text-amber-600 text-xs">
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
                      <DatePicker
                        onChange={(e) => setWeekAnchor(e.target.value)}
                        value={weekAnchor}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Month anchor</Label>
                      <DatePicker
                        onChange={(e) => setMonthAnchor(e.target.value)}
                        value={monthAnchor}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quarter anchor</Label>
                      <DatePicker
                        onChange={(e) => setQuarterAnchor(e.target.value)}
                        value={quarterAnchor}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Workbook Snapshot */}
              <Card tone="soft-stone">
                <CardHeader>
                  <CardTitle>Data Snapshot</CardTitle>
                  <CardDescription>
                    Master Events: {formatNumber(salesData.masterEvents.length)}{" "}
                    &middot; Deals Lost:{" "}
                    {formatNumber(salesData.dealsLost.length)} &middot; Lead
                    Source: {formatNumber(salesData.leadSource.length)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    RAW sheets loaded:{" "}
                    {formatNumber(Object.keys(salesData.rawSheets).length)}
                  </p>
                  <p>
                    Created Date coverage:{" "}
                    {createdRatio ? formatPercent(createdRatio) : "N/A"}{" "}
                    &middot; Range:{" "}
                    {createdRange
                      ? `${createdRange.min.toLocaleDateString()} to ${createdRange.max.toLocaleDateString()}`
                      : "N/A"}
                  </p>
                  <p>
                    Event Date coverage:{" "}
                    {eventRatio ? formatPercent(eventRatio) : "N/A"} &middot;
                    Range:{" "}
                    {eventRange
                      ? `${eventRange.min.toLocaleDateString()} to ${eventRange.max.toLocaleDateString()}`
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>

              {/* Main Tabs */}
              {metrics ? (
                <SalesMetricsTabs
                  flatData={flatData}
                  metrics={metrics}
                  salesData={salesData}
                  validation={validation}
                />
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
                The dashboard will appear after you upload an Excel workbook or
                CSV file.
              </AlertDescription>
            </Alert>
          )}
        </OperationalColumn>
      </PageBody>
    </PageCanvas>
  );
}
