"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
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
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

type ReportFormat = "csv" | "qbxml" | "qbOnlineCsv" | "json";

interface PayrollPeriod {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
}

interface ReportConfig {
  periodId: string;
  format: ReportFormat;
  aggregate?: boolean;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

const formatOptions: Array<{
  value: ReportFormat;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "csv",
    label: "CSV",
    icon: <FileSpreadsheetIcon className="h-4 w-4" />,
  },
  {
    value: "qbxml",
    label: "QuickBooks XML",
    icon: <FileTextIcon className="h-4 w-4" />,
  },
  {
    value: "qbOnlineCsv",
    label: "QuickBooks Online CSV",
    icon: <FileSpreadsheetIcon className="h-4 w-4" />,
  },
  { value: "json", label: "JSON", icon: <FileTextIcon className="h-4 w-4" /> },
];

export default function PayrollReportsPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<ReportFormat>("csv");
  const [aggregate, setAggregate] = useState(false);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/payroll/periods?limit=50");

      if (!response.ok) {
        throw new Error("Failed to fetch payroll periods");
      }

      const data = await response.json();
      setPeriods(data.data || []);
    } catch (error) {
      console.error("Error fetching payroll periods:", error);
      toast.error("Failed to load payroll periods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleExportReport = async () => {
    if (!selectedPeriodId) {
      toast.error("Please select a payroll period");
      return;
    }

    setActionLoading(true);
    try {
      const params = new URLSearchParams({
        format: selectedFormat,
      });

      if (aggregate) {
        params.set("aggregate", "true");
      }

      const response = await apiFetch(
        `/api/payroll/reports/${selectedPeriodId}?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export report");
      }

      // For JSON format, display in a dialog, for others download as file
      if (selectedFormat === "json") {
        const data = await response.json();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payroll-report-${selectedPeriodId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const extension =
          selectedFormat === "csv" || selectedFormat === "qbOnlineCsv"
            ? "csv"
            : "xml";
        a.download = `payroll-report-${selectedPeriodId}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      toast.success("Report exported successfully");
      setExportDialogOpen(false);
      setSelectedPeriodId("");
      setSelectedFormat("csv");
      setAggregate(false);
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export report"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openExportDialog = (periodId: string) => {
    setSelectedPeriodId(periodId);
    setExportDialogOpen(true);
  };

  const getPeriodLabel = (period: PayrollPeriod) => {
    return `${formatDate(period.periodStart)} - ${formatDate(period.periodEnd)}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-foreground">
            Payroll Reports
          </h1>
          <p className="text-muted-foreground text-sm">
            Export payroll reports in various formats
          </p>
        </div>
      </div>

      <Separator />

      <section>
        <h2 className="font-medium text-sm text-muted-foreground mb-4">
          Export by Period
        </h2>
        {loading ? (
          <Card className="p-8 text-center">
            <Loader2Icon className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
          </Card>
        ) : periods.length === 0 ? (
          <Card className="p-8 text-center">
            <FileTextIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              No payroll periods found
            </p>
            <p className="text-muted-foreground text-sm">
              Create a payroll period and generate payroll to export reports
            </p>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">
                          {getPeriodLabel(period)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              period.status === "open" ? "default" : "outline"
                            }
                          >
                            {period.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => openExportDialog(period.id)}
                            size="sm"
                            variant="outline"
                          >
                            <DownloadIcon className="mr-2 h-4 w-4" />
                            Export
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Export Dialog */}
      <Dialog onOpenChange={setExportDialogOpen} open={exportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Payroll Report</DialogTitle>
            <DialogDescription>
              Choose the format and options for your payroll report export.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <Select
                onValueChange={(value) =>
                  setSelectedFormat(value as ReportFormat)
                }
                value={selectedFormat}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(selectedFormat === "qbxml" ||
              selectedFormat === "qbOnlineCsv") && (
              <div className="flex items-center space-x-2">
                <input
                  checked={aggregate}
                  className="h-4 w-4"
                  id="aggregate"
                  onChange={(e) => setAggregate(e.target.checked)}
                  type="checkbox"
                />
                <Label className="cursor-pointer text-sm" htmlFor="aggregate">
                  Aggregate as single entry (for QuickBooks import)
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={actionLoading || !selectedPeriodId}
              onClick={handleExportReport}
              variant="default"
            >
              {actionLoading && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Export Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Format Guide Section */}
      <section className="space-y-4">
        <h2 className="font-medium text-sm text-muted-foreground">
          Export Format Guide
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheetIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">CSV</h3>
                  <p className="text-muted-foreground text-sm">
                    Standard CSV format compatible with Excel, Google Sheets,
                    and most spreadsheet applications.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">QuickBooks XML</h3>
                  <p className="text-muted-foreground text-sm">
                    QBXML format for importing into QuickBooks Desktop. Supports
                    aggregate import option.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheetIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">QuickBooks Online CSV</h3>
                  <p className="text-muted-foreground text-sm">
                    Specialized CSV format for QuickBooks Online imports.
                    Supports aggregate import option.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <FileTextIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">JSON</h3>
                  <p className="text-muted-foreground text-sm">
                    Machine-readable JSON format for integration with other
                    systems and custom processing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
