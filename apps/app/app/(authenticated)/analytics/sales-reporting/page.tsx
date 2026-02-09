"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
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
import { Switch } from "@repo/design-system/components/ui/switch";
import { AlertCircle, Download, FileUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ReportType = "weekly" | "monthly" | "quarterly";

interface DateRange {
  min: string;
  max: string;
}

interface ColumnOption {
  name: string;
  coverage: number;
  isDetected: boolean;
}

interface ParsedData {
  dateRange: DateRange | null;
  columns: ColumnOption[];
  detectedDateColumn: string | null;
  rowCount: number;
}

export default function SalesReportingPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedDateColumn, setSelectedDateColumn] = useState<string>("");
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadSampleData = () => {
    const a = document.createElement("a");
    a.href = "/sample-sales-data.csv";
    a.download = "sample-sales-data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Smart Excel/CSV parsing with date column detection
  const analyzeFile = useCallback(async (file: File): Promise<ParsedData> => {
    const buffer = await file.arrayBuffer();
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isExcel) {
      // CSV parsing (existing logic)
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length === 0) {
        return {
          dateRange: null,
          columns: [],
          detectedDateColumn: null,
          rowCount: 0,
        };
      }

      const header = lines[0].toLowerCase();
      const headerCells = header.split(",");
      const dateColumns = [
        "date",
        "record_date",
        "entry_date",
        "event_date",
        "created_date",
      ];
      const dateColIndex = headerCells.findIndex((cell) =>
        dateColumns.some((col) => cell.includes(col))
      );

      if (dateColIndex === -1) {
        return {
          dateRange: null,
          columns: [],
          detectedDateColumn: null,
          rowCount: lines.length - 1,
        };
      }

      const dates: Date[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(",");
        const dateStr = cells[dateColIndex]?.replace(/"/g, "").trim();
        if (dateStr) {
          const d = new Date(dateStr);
          if (!Number.isNaN(d.getTime())) dates.push(d);
        }
      }

      if (dates.length === 0) {
        return {
          dateRange: null,
          columns: [],
          detectedDateColumn: null,
          rowCount: lines.length - 1,
        };
      }

      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      return {
        dateRange: { min: formatDate(minDate), max: formatDate(maxDate) },
        columns: [
          {
            name: headerCells[dateColIndex],
            coverage: dates.length / (lines.length - 1),
            isDetected: true,
          },
        ],
        detectedDateColumn: headerCells[dateColIndex],
        rowCount: lines.length - 1,
      };
    }

    // Excel parsing with smart date detection
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

    const allRows: Record<string, unknown>[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
        raw: true,
      }) as Record<string, unknown>[];
      allRows.push(...rows);
    }

    if (allRows.length === 0) {
      return {
        dateRange: null,
        columns: [],
        detectedDateColumn: null,
        rowCount: 0,
      };
    }

    // Get all column names
    const columnsSet = new Set<string>();
    for (const row of allRows) {
      Object.keys(row).forEach((key) => columnsSet.add(key));
    }
    const allColumns = Array.from(columnsSet);

    // Score each column for date likelihood (from your sales module)
    const scoredColumns: Array<{
      name: string;
      score: number;
      coverage: number;
    }> = [];

    for (const column of allColumns) {
      const normalized = column.toLowerCase().replace(/[^a-z0-9]+/g, " ");
      let score = 0;

      // Name-based scoring
      if (normalized.includes("date")) score += 3;
      if (
        normalized.includes("created") ||
        normalized.includes("inquiry") ||
        normalized.includes("lead")
      )
        score += 2;
      if (normalized.includes("event") || normalized.includes("start"))
        score += 1;

      // Date coverage calculation
      const values = allRows
        .map((row) => row[column])
        .filter(
          (value): value is Date | string | number =>
            value !== null && value !== undefined
        );
      if (values.length === 0) continue;

      const allNumeric = values.every((value) => typeof value === "number");
      if (allNumeric && score === 0) continue; // Skip numeric columns with no date hints

      // Try to parse each value as a date
      let validDates = 0;
      for (const value of values) {
        let date: Date | null = null;

        if (value instanceof Date) {
          date = Number.isNaN(value.getTime()) ? null : value;
        } else if (typeof value === "number") {
          // Excel serial date
          const epoch = Math.round((value - 25_569) * 86_400 * 1000);
          const d = new Date(epoch);
          date = Number.isNaN(d.getTime()) ? null : d;
        } else if (typeof value === "string") {
          const d = new Date(value);
          date = Number.isNaN(d.getTime()) ? null : d;
        }

        if (date) validDates++;
      }

      const coverage = values.length > 0 ? validDates / values.length : 0;
      if (coverage === 0) continue;

      // Bonus if all values are dates
      const allDates = values.every((value) => value instanceof Date);
      if (allDates) score += 4;

      score += coverage * 2;

      scoredColumns.push({ name: column, score, coverage });
    }

    // Sort by score (descending), then by coverage
    scoredColumns.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.coverage - a.coverage;
    });

    // Detect date column (score >= 2 or coverage >= 0.2)
    const detected = scoredColumns.find(
      (col) => col.score >= 2 || col.coverage >= 0.2
    );
    const detectedDateColumn = detected?.name ?? null;

    // Calculate date range from detected column
    let dateRange: DateRange | null = null;
    if (detectedDateColumn) {
      const dates: Date[] = [];
      for (const row of allRows) {
        const value = row[detectedDateColumn];
        let date: Date | null = null;

        if (value instanceof Date) {
          date = Number.isNaN(value.getTime()) ? null : value;
        } else if (typeof value === "number") {
          const epoch = Math.round((value - 25_569) * 86_400 * 1000);
          const d = new Date(epoch);
          date = Number.isNaN(d.getTime()) ? null : d;
        } else if (typeof value === "string") {
          const d = new Date(value);
          date = Number.isNaN(d.getTime()) ? null : d;
        }

        if (date) dates.push(date);
      }

      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
        const formatDate = (d: Date) => d.toISOString().split("T")[0];
        dateRange = { min: formatDate(minDate), max: formatDate(maxDate) };
      }
    }

    // Format columns for display
    const columns: ColumnOption[] = scoredColumns.slice(0, 10).map((col) => ({
      name: col.name,
      coverage: col.coverage,
      isDetected: col.score >= 2 || col.coverage >= 0.2,
    }));

    return {
      dateRange,
      columns,
      detectedDateColumn,
      rowCount: allRows.length,
    };
  }, []);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newFiles = event.target.files;
    setFiles(newFiles);
    setError(null);
    setParsedData(null);

    if (newFiles && newFiles.length > 0) {
      setIsAnalyzing(true);
      try {
        const data = await analyzeFile(newFiles[0]);

        if (!data.dateRange) {
          setError(
            'No valid date column found. Please ensure your file has a date column (e.g., "date", "created_date", "event_date").'
          );
          return;
        }

        setParsedData(data);
        setSelectedDateColumn(
          data.detectedDateColumn ?? data.columns[0]?.name ?? ""
        );

        // Auto-set end date to max, start date based on report type
        if (data.dateRange) {
          setEndDate(data.dateRange.max);

          const start = new Date(data.dateRange.max);
          if (reportType === "weekly") {
            start.setDate(start.getDate() - 7);
          } else if (reportType === "monthly") {
            start.setMonth(start.getMonth() - 1);
          } else {
            start.setMonth(start.getMonth() - 3);
          }

          const minDate = new Date(data.dateRange.min);
          setStartDate(
            start > minDate
              ? start.toISOString().split("T")[0]
              : data.dateRange.min
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze file");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleGenerateReport = async () => {
    if (!files || files.length === 0) {
      setError("Please select at least one CSV or XLSX file");
      return;
    }

    if (!(startDate && endDate)) {
      setError("Please provide both start and end dates");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formData = new FormData();

      // Add files
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      // Add configuration
      const config = {
        reportType,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        companyName: companyName || undefined,
        ...(selectedDateColumn ? { dateColumn: selectedDateColumn } : {}),
      };

      formData.append("config", JSON.stringify(config));

      // Call the API
      const response = await fetch("/api/sales-reporting/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate report");
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-report-${reportType}-${startDate}-to-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Update start date when report type changes
  useEffect(() => {
    if (parsedData?.dateRange) {
      const end = new Date(parsedData.dateRange.max);
      const start = new Date(end);
      if (reportType === "weekly") {
        start.setDate(start.getDate() - 7);
      } else if (reportType === "monthly") {
        start.setMonth(start.getMonth() - 1);
      } else {
        start.setMonth(start.getMonth() - 3);
      }

      const minDate = new Date(parsedData.dateRange.min);
      setStartDate(
        start > minDate
          ? start.toISOString().split("T")[0]
          : parsedData.dateRange.min
      );
    }
  }, [reportType, parsedData]);

  const canGenerate = parsedData !== null && startDate && endDate;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Sales Reporting</h1>
            <p className="text-muted-foreground">
              Generate professional PDF sales reports from your data files.
            </p>
          </div>
          <Button onClick={downloadSampleData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Sample Data
          </Button>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Sales Report</CardTitle>
          <CardDescription>
            Upload your sales data and configure your report settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Sales Data File (CSV or XLSX)</Label>
            <div className="flex items-center gap-2">
              <Input
                accept=".csv,.xlsx,.xls"
                disabled={isGenerating}
                id="file-upload"
                onChange={handleFileChange}
                type="file"
              />
              <FileUp className="h-5 w-5 text-muted-foreground" />
            </div>
            {parsedData && (
              <p className="text-sm text-muted-foreground">
                Loaded {parsedData.rowCount} rows from file
              </p>
            )}
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select
              disabled={isGenerating}
              onValueChange={(value) => setReportType(value as ReportType)}
              value={reportType}
            >
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly Report</SelectItem>
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="quarterly">Quarterly Report</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Display */}
          {parsedData?.dateRange && (
            <Alert>
              <AlertDescription className="space-y-1">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  <span>
                    Data found from <strong>{parsedData.dateRange.min}</strong>{" "}
                    to <strong>{parsedData.dateRange.max}</strong>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {Math.ceil(
                    (new Date(parsedData.dateRange.max).getTime() -
                      new Date(parsedData.dateRange.min).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days of data
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Date Range Controls */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  disabled={isGenerating || isAnalyzing}
                  id="start-date"
                  max={parsedData?.dateRange?.max}
                  min={parsedData?.dateRange?.min}
                  onChange={(e) => setStartDate(e.target.value)}
                  type="date"
                  value={startDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  disabled={isGenerating || isAnalyzing}
                  id="end-date"
                  max={parsedData?.dateRange?.max}
                  min={parsedData?.dateRange?.min}
                  onChange={(e) => setEndDate(e.target.value)}
                  type="date"
                  value={endDate}
                />
              </div>
            </div>
          </div>

          {/* Advanced Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="advanced-mode">Advanced Options</Label>
              <p className="text-xs text-muted-foreground">
                Customize date column selection
              </p>
            </div>
            <Switch
              checked={showAdvanced}
              disabled={isAnalyzing}
              id="advanced-mode"
              onCheckedChange={setShowAdvanced}
            />
          </div>

          {/* Advanced Section */}
          {showAdvanced && parsedData && parsedData.columns.length > 0 && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="date-column">Date Column</Label>
                <Select
                  disabled={isGenerating}
                  onValueChange={setSelectedDateColumn}
                  value={selectedDateColumn}
                >
                  <SelectTrigger className="w-[200px]" id="date-column">
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {parsedData.columns.map((col) => (
                      <SelectItem key={col.name} value={col.name}>
                        <div className="flex items-center gap-2">
                          <span>{col.name}</span>
                          {col.isDetected && (
                            <Badge className="text-xs" variant="secondary">
                              {(col.coverage * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Detected Columns</p>
                <div className="flex flex-wrap gap-2">
                  {parsedData.columns.map((col) => (
                    <Badge
                      className="cursor-pointer"
                      key={col.name}
                      onClick={() => setSelectedDateColumn(col.name)}
                      variant={col.isDetected ? "default" : "outline"}
                    >
                      {col.name} ({(col.coverage * 100).toFixed(0)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name (Optional)</Label>
            <Input
              disabled={isGenerating}
              id="company-name"
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Mangia Catering Co."
              type="text"
              value={companyName}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Generate Button */}
          <Button
            className="w-full"
            disabled={isGenerating || !canGenerate}
            onClick={handleGenerateReport}
            size="lg"
          >
            {isGenerating ? (
              <>Generating Report...</>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Generate PDF Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Reports</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Revenue by event type, leads received, proposals sent, closing
            ratio, lost opportunities, top pending deals
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Reports</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Total revenue vs previous month and YoY, avg event value, lead
            source breakdown, funnel metrics, win/loss trends
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quarterly Reports</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Customer segment analysis, sales cycle length, pricing trends,
            referral performance, recommendations
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
