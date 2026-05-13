"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  MetricBand,
  MetricCell,
  MetricLabel,
  MetricValue,
} from "@repo/design-system/components/blocks/page-shell";
import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";
import { Download } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface InitialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  collectedPayments: number;
  pendingPayments: number;
  paidInvoicesCount: number;
  overdueInvoicesCount: number;
}

interface ReportLineItem {
  category: string;
  accountName: string;
  amount: number;
  percentage: number;
}

interface ReportData {
  type: string;
  startDate: string;
  endDate: string;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };
  lineItems: ReportLineItem[];
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const REPORT_TYPES = [
  { value: "income_statement", label: "Income Statement (P&L)" },
  { value: "balance_sheet", label: "Balance Sheet" },
  { value: "cash_flow", label: "Cash Flow Statement" },
  { value: "custom", label: "Custom Report" },
] as const;

function formatPercentage(value: number): string {
  if (value === 0) return "0.0%";
  return `${value >= 0 ? "" : ""}${value.toFixed(1)}%`;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getStartOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

function getStartOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function FinancialReportingClient({
  initialMetrics,
}: {
  initialMetrics: InitialMetrics;
}) {
  const [reportType, setReportType] = useState<string>("income_statement");
  const [startDate, setStartDate] = useState(getStartOfYear());
  const [endDate, setEndDate] = useState(getToday());
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [metrics, setMetrics] = useState(initialMetrics);

  /* ---- fetch report ---- */
  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate,
        endDate,
      });
      const res = await apiFetch(
        `/api/accounting/financial-reports?${params.toString()}`
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          (errBody as Record<string, string>).error || "Failed to generate report"
        );
      }
      const data = (await res.json()) as ReportData;
      setReportData(data);
      setMetrics({
        totalRevenue: data.summary.totalRevenue,
        totalExpenses: data.summary.totalExpenses,
        netIncome: data.summary.netIncome,
        collectedPayments: initialMetrics.collectedPayments,
        pendingPayments: initialMetrics.pendingPayments,
        paidInvoicesCount: initialMetrics.paidInvoicesCount,
        overdueInvoicesCount: initialMetrics.overdueInvoicesCount,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate report"
      );
    } finally {
      setIsLoading(false);
    }
  }, [reportType, startDate, endDate, initialMetrics]);

  /* ---- export CSV ---- */
  const handleExport = useCallback(() => {
    if (!reportData) return;

    const headers = ["Category", "Account", "Amount", "Percentage"];
    const rows = reportData.lineItems.map((item) => [
      item.category,
      item.accountName,
      item.amount.toFixed(2),
      formatPercentage(item.percentage),
    ]);
    rows.push([
      "Total",
      "Net Income",
      reportData.summary.netIncome.toFixed(2),
      "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${reportType}-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [reportData, reportType, startDate, endDate]);

  /* ---- quick date presets ---- */
  const setPreset = useCallback((preset: string) => {
    const today = new Date();
    switch (preset) {
      case "this_month":
        setStartDate(getStartOfMonth());
        setEndDate(getToday());
        break;
      case "last_month": {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(start.toISOString().split("T")[0]);
        setEndDate(end.toISOString().split("T")[0]);
        break;
      }
      case "this_quarter": {
        const qStart = new Date(
          today.getFullYear(),
          Math.floor(today.getMonth() / 3) * 3,
          1
        );
        setStartDate(qStart.toISOString().split("T")[0]);
        setEndDate(getToday());
        break;
      }
      case "ytd":
        setStartDate(getStartOfYear());
        setEndDate(getToday());
        break;
      case "all_time":
        setStartDate("2020-01-01");
        setEndDate(getToday());
        break;
    }
  }, []);

  /* ---- render ---- */
  return (
    <>
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Report Type
          </label>
          <Select onValueChange={setReportType} value={reportType}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Period
          </label>
          <Select onValueChange={setPreset} value="">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Quick select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            From
          </label>
          <input
            className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => setStartDate(e.target.value)}
            type="date"
            value={startDate}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            To
          </label>
          <input
            className="flex h-9 w-[150px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onChange={(e) => setEndDate(e.target.value)}
            type="date"
            value={endDate}
          />
        </div>

        <div className="flex gap-2">
          <Button disabled={isLoading} onClick={loadReport} size="sm">
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
          {reportData && (
            <Button
              onClick={handleExport}
              size="sm"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-[22px] border border-hairline bg-canvas p-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Total Revenue
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {metrics.paidInvoicesCount} paid invoices
          </div>
        </div>
        <div className="rounded-[22px] border border-hairline bg-canvas p-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Total Expenses
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(metrics.totalExpenses)}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Write-offs and adjustments
          </div>
        </div>
        <div className="rounded-[22px] border border-hairline bg-canvas p-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Net Income
          </div>
          <div className="mt-2 text-2xl font-semibold text-ink">
            {formatCurrency(metrics.netIncome)}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Revenue minus expenses
          </div>
        </div>
      </div>

      {/* Report Table */}
      {!reportData && !isLoading && (
        <div className="rounded-[22px] border border-dashed border-hairline bg-canvas p-8 text-sm text-muted-foreground">
          Select a report type and date range, then click &quot;Generate
          Report&quot; to view your financial data.
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {reportData && !isLoading && (
        <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
          {/* Table header */}
          <div className="grid grid-cols-[1.2fr_1.5fr_0.8fr_0.6fr] gap-4 border-b border-hairline px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>Category</span>
            <span>Account</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Share</span>
          </div>

          {/* Table rows grouped by category */}
          {(() => {
            const categories = [
              ...new Set(reportData.lineItems.map((i) => i.category)),
            ];
            const rows: React.ReactNode[] = [];

            for (const category of categories) {
              const items = reportData.lineItems.filter(
                (i) => i.category === category
              );
              const categoryTotal = items.reduce((s, i) => s + i.amount, 0);

              rows.push(
                <div
                  className="grid grid-cols-[1.2fr_1.5fr_0.8fr_0.6fr] gap-4 border-b border-hairline bg-soft-stone/30 px-5 py-2 text-sm font-semibold text-ink"
                  key={`cat-${category}`}
                >
                  <span>{category}</span>
                  <span />
                  <span className="text-right">
                    {formatCurrency(categoryTotal)}
                  </span>
                  <span className="text-right text-muted-foreground">
                    {formatPercentage(
                      metrics.totalRevenue > 0
                        ? (categoryTotal / metrics.totalRevenue) * 100
                        : 0
                    )}
                  </span>
                </div>
              );

              for (const item of items) {
                rows.push(
                  <div
                    className="grid grid-cols-[1.2fr_1.5fr_0.8fr_0.6fr] gap-4 border-b border-hairline px-5 py-3 text-sm last:border-b-0"
                    key={`${category}-${item.accountName}`}
                  >
                    <span className="pl-4 text-muted-foreground" />
                    <span className="text-ink">{item.accountName}</span>
                    <span className="text-right font-medium text-ink">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="text-right text-muted-foreground">
                      {formatPercentage(item.percentage)}
                    </span>
                  </div>
                );
              }
            }

            return rows;
          })()}

          {/* Totals row */}
          <div className="grid grid-cols-[1.2fr_1.5fr_0.8fr_0.6fr] gap-4 border-t-2 border-hairline bg-soft-stone/50 px-5 py-4 text-sm font-semibold text-ink">
            <span>Total</span>
            <span>Net Income</span>
            <span className="text-right">
              {formatCurrency(reportData.summary.netIncome)}
            </span>
            <span className="text-right text-muted-foreground">
              {metrics.totalRevenue > 0
                ? formatPercentage(
                    (reportData.summary.netIncome / metrics.totalRevenue) * 100
                  )
                : "0.0%"}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
