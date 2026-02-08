"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
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
import { AlertCircle, Download, FileUp } from "lucide-react";
import { useState } from "react";

type ReportType = "weekly" | "monthly" | "quarterly";

interface DateRange {
  min: string;
  max: string;
}

export default function SalesReportingPage() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const downloadSampleData = () => {
    const a = document.createElement("a");
    a.href = "/sample-sales-data.csv";
    a.download = "sample-sales-data.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length === 0) return;

      // Find date columns
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
        setError('No date column found. File should have a "date" column.');
        return;
      }

      // Parse dates from rows
      const dates: Date[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(",");
        const dateStr = cells[dateColIndex]?.replace(/"/g, "").trim();
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) dates.push(d);
        }
      }

      if (dates.length === 0) {
        setError("No valid dates found in the file.");
        return;
      }

      // Find min/max dates
      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      const formatDate = (d: Date) => d.toISOString().split("T")[0];
      setDateRange({
        min: formatDate(minDate),
        max: formatDate(maxDate),
      });

      // Auto-set end date to max, start date based on report type
      setEndDate(formatDate(maxDate));

      // Calculate smart start date based on report type
      const start = new Date(maxDate);
      if (reportType === "weekly") {
        start.setDate(start.getDate() - 7);
      } else if (reportType === "monthly") {
        start.setMonth(start.getMonth() - 1);
      } else {
        start.setMonth(start.getMonth() - 3);
      }
      setStartDate(formatDate(start > minDate ? start : minDate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newFiles = event.target.files;
    setFiles(newFiles);
    setError(null);
    setDateRange(null);

    if (newFiles && newFiles.length > 0) {
      await analyzeFile(newFiles[0]);
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

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Sales Reporting (PDF Engine)
            </h1>
            <p className="text-muted-foreground">
              Generate professional PDF sales reports from CSV/XLSX files using
              the @capsule-pro/sales-reporting package. This is a separate
              implementation from the existing Analytics page for comparison.
            </p>
          </div>
          <Button onClick={downloadSampleData} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Sample Data
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Sales Report</CardTitle>
          <CardDescription>
            Upload CSV or XLSX files containing sales data and configure your
            report settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Sales Data Files (CSV or XLSX)</Label>
            <div className="flex items-center gap-2">
              <Input
                accept=".csv,.xlsx,.xls"
                disabled={isGenerating}
                id="file-upload"
                multiple
                onChange={handleFileChange}
                type="file"
              />
              <FileUp className="h-5 w-5 text-muted-foreground" />
            </div>
            {files && files.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {files.length} file{files.length > 1 ? "s" : ""} selected
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

          {/* Date Range */}
          <div className="space-y-2">
            {dateRange && (
              <Alert>
                <AlertDescription>
                  📅 Data found from <strong>{dateRange.min}</strong> to{" "}
                  <strong>{dateRange.max}</strong> (
                  {Math.ceil(
                    (new Date(dateRange.max).getTime() -
                      new Date(dateRange.min).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}{" "}
                  days)
                </AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  disabled={isGenerating || isAnalyzing}
                  id="start-date"
                  max={dateRange?.max}
                  min={dateRange?.min}
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
                  max={dateRange?.max}
                  min={dateRange?.min}
                  onChange={(e) => setEndDate(e.target.value)}
                  type="date"
                  value={endDate}
                />
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name (Optional)</Label>
            <Input
              disabled={isGenerating}
              id="company-name"
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Capsule Catering Co."
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
            disabled={isGenerating}
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
            ratio, lost opportunities, top 3 pending deals
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
