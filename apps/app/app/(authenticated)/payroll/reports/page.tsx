"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
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
import { listPayrollPeriods } from "@/app/lib/manifest-client.generated";
import {
  CommandBand,
  CommandBandBody,
  CommandBandHeader,
  CommandBandLede,
  DisplayHeading,
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
  MonoLabel,
  OperationalColumn,
  PageCanvas,
  SectionHeader,
} from "@repo/design-system/components/blocks/page-shell";

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
      const result = await listPayrollPeriods({ limit: 50 });
      setPeriods(result.data as unknown as PayrollPeriod[]);
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

  const openPeriods = periods.filter((p) => p.status === "open").length;
  const closedPeriods = periods.filter((p) => p.status === "closed").length;

  return (
    <PageCanvas>
      <CommandBand>
        <CommandBandHeader>
          <div className="space-y-4">
            <MonoLabel tone="dark">Operations / Payroll</MonoLabel>
            <DisplayHeading size="md">Payroll Reports</DisplayHeading>
            <CommandBandLede>
              Export payroll reports in CSV, QuickBooks, and JSON formats.
            </CommandBandLede>
          </div>
        </CommandBandHeader>
        <CommandBandBody>
          <MetricBand cols={3}>
            <MetricCell>
              <MetricLabel>Open</MetricLabel>
              <MetricValue>{openPeriods}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Closed</MetricLabel>
              <MetricValue>{closedPeriods}</MetricValue>
            </MetricCell>
            <MetricCell>
              <MetricLabel>Total</MetricLabel>
              <MetricValue>{periods.length}</MetricValue>
            </MetricCell>
          </MetricBand>
        </CommandBandBody>
      </CommandBand>

      <OperationalColumn>
        <SectionHeader
          eyebrow="Periods"
          title="Export by Period"
          count={periods.length > 0 ? `${periods.length}` : undefined}
        />
        {loading ? (
          <div className="flex items-center justify-center rounded-[22px] border border-hairline bg-canvas p-12">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : periods.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[22px] border border-hairline bg-canvas p-12 text-center">
            <FileTextIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg text-muted-foreground">
              No payroll periods found
            </p>
            <p className="text-sm text-muted-foreground">
              Create a payroll period and generate payroll to export reports
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
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
        )}
      </OperationalColumn>

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
      <OperationalColumn>
        <SectionHeader
          eyebrow="Reference"
          title="Export Format Guide"
        />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-[22px] border border-hairline bg-canvas p-4">
            <FileSpreadsheetIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="mb-1 font-semibold">CSV</h3>
              <p className="text-sm text-muted-foreground">
                Standard CSV format compatible with Excel, Google Sheets,
                and most spreadsheet applications.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[22px] border border-hairline bg-canvas p-4">
            <FileTextIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="mb-1 font-semibold">QuickBooks XML</h3>
              <p className="text-sm text-muted-foreground">
                QBXML format for importing into QuickBooks Desktop. Supports
                aggregate import option.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[22px] border border-hairline bg-canvas p-4">
            <FileSpreadsheetIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="mb-1 font-semibold">QuickBooks Online CSV</h3>
              <p className="text-sm text-muted-foreground">
                Specialized CSV format for QuickBooks Online imports.
                Supports aggregate import option.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[22px] border border-hairline bg-canvas p-4">
            <FileTextIcon className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="mb-1 font-semibold">JSON</h3>
              <p className="text-sm text-muted-foreground">
                Machine-readable JSON format for integration with other
                systems and custom processing.
              </p>
            </div>
          </div>
        </div>
      </OperationalColumn>
    </PageCanvas>
  );
}
