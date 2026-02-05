"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
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
import {
  ChartContainer,
  ChartTooltipContent,
} from "@repo/design-system/components/ui/chart";
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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { generateSalesReportPdf } from "./actions.tsx";
import {
  type AnnualMetrics,
  buildDateColumnOptionsForUI,
  type CellValue,
  type DataRow,
  type FunnelValidationResult,
  getCreatedDateCol,
  getEventDateCol,
  loadSalesData,
  type MonthlyMetrics,
  type PeriodSummary,
  prepareSalesMetrics,
  type QuarterlyMetrics,
  type SalesData,
  validateFunnel,
  type WeeklyMetrics,
} from "./lib/sales-analytics";

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

const formatSignedNumber = (value: number) =>
  value >= 0 ? `+${formatNumber(value)}` : formatNumber(value);
const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

const formatDateRange = (start: Date, end: Date) =>
  `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

const formatDateForInput = (date: Date) => date.toISOString().split("T")[0];

const formatDateForFile = (date: Date) => date.toISOString().split("T")[0];

const parseInputDate = (value: string) => new Date(`${value}T00:00:00`);

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

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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
      ([key, value]) => normalizeKey(key).includes(candidate) && value
    );
    if (match) {
      return String(match[1]);
    }
  }
  const fallback = entries.find(
    ([_, value]) => typeof value === "string" && value.trim()
  );
  return fallback ? String(fallback[1]) : null;
};

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
  items.forEach((item) => {
    const rawValue = item[valueKey];
    const numeric =
      typeof rawValue === "number"
        ? rawValue
        : rawValue === null || rawValue === undefined
          ? Number.NaN
          : Number(rawValue);
    if (!Number.isFinite(numeric)) {
      return;
    }
    if (!top || numeric > top.value) {
      const labelValue = item[labelKey];
      const label = labelValue ? String(labelValue) : "Unknown";
      top = { label, value: numeric };
    }
  });
  return top;
};

interface KpiCardProps {
  label: string;
  value: string;
  subtext?: string;
}

const KpiCard = ({ label, value, subtext }: KpiCardProps) => (
  <Card>
    <CardHeader>
      <CardDescription>{label}</CardDescription>
      <CardTitle className="text-2xl">{value}</CardTitle>
    </CardHeader>
    {subtext ? (
      <CardContent>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    ) : null}
  </Card>
);

interface BarChartCardProps {
  title: string;
  description?: string;
  data: Array<{ label: string; value: number }>;
  valueFormatter?: (value: number) => string;
}

const BarChartCard = ({
  title,
  description,
  data,
  valueFormatter,
}: BarChartCardProps) => {
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));
  const chartConfig = {
    value: {
      label: title,
      color: "hsl(var(--chart-1))",
    },
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No data available.
          </div>
        ) : (
          <ChartContainer className="h-[280px] w-full" config={chartConfig}>
            <BarChart data={chartData}>
              <CartesianGrid className="stroke-muted" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                className="text-xs fill-muted-foreground"
                dataKey="name"
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) =>
                  valueFormatter
                    ? valueFormatter(Number(value))
                    : formatNumber(Number(value))
                }
                tickLine={false}
              />
              <ChartTooltipContent
                formatter={(value) => [
                  valueFormatter
                    ? valueFormatter(Number(value))
                    : formatNumber(Number(value)),
                  title,
                ]}
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

interface LineChartCardProps {
  title: string;
  description?: string;
  data: Array<{ label: string; value: number }>;
  valueFormatter?: (value: number) => string;
}

const LineChartCard = ({
  title,
  description,
  data,
  valueFormatter,
}: LineChartCardProps) => {
  const chartData = data.map((item) => ({
    name: item.label,
    value: item.value,
  }));
  const chartConfig = {
    value: {
      label: title,
      color: "hsl(var(--chart-1))",
    },
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No data available.
          </div>
        ) : (
          <ChartContainer className="h-[280px] w-full" config={chartConfig}>
            <LineChart data={chartData}>
              <CartesianGrid className="stroke-muted" strokeDasharray="3 3" />
              <XAxis
                axisLine={false}
                className="text-xs fill-muted-foreground"
                dataKey="name"
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) =>
                  valueFormatter
                    ? valueFormatter(Number(value))
                    : formatNumber(Number(value))
                }
                tickLine={false}
              />
              <ChartTooltipContent
                formatter={(value) => [
                  valueFormatter
                    ? valueFormatter(Number(value))
                    : formatNumber(Number(value)),
                  title,
                ]}
              />
              <Line
                dataKey="value"
                dot={false}
                stroke="var(--color-value)"
                strokeWidth={2}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

const getColumnsFromRows = (rows: DataRow[]) => {
  const columns = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => columns.add(key));
  });
  return Array.from(columns);
};

const getDateRange = (rows: DataRow[], column: string | null) => {
  if (!column) {
    return null;
  }
  const dates = rows
    .map((row) => toDateValue(row[column]))
    .filter((value): value is Date => Boolean(value));
  if (!dates.length) {
    return null;
  }
  const times = dates.map((date) => date.getTime());
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  return { min, max };
};

const formatCellValue = (value: unknown) => {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "number") {
    return formatNumber(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return value ? String(value) : "-";
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

interface ReportSummary {
  title: string;
  windowLabel: string;
  kpis: KpiCardProps[];
  highlights?: string[];
}

// Client-side PDF download component using server action
// @react-pdf/renderer is kept on the server to reduce client bundle size
const ReportDownload = ({
  summary,
  fileName,
}: {
  summary: ReportSummary;
  fileName: string;
}) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsPending(true);
    setError(null);
    try {
      const result = await generateSalesReportPdf(summary);
      if (!(result.success && result.data)) {
        setError(result.error ?? "Failed to generate PDF");
        return;
      }
      // Convert base64 to blob and download
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button disabled={isPending} onClick={handleDownload} variant="secondary">
        {isPending ? "Preparing PDF..." : "Download PDF"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

interface DataTableProps {
  rows: DataRow[];
  columns?: string[];
  maxRows?: number;
  emptyText?: string;
}

const DataTable = ({
  rows,
  columns,
  maxRows = 8,
  emptyText = "No data available.",
}: DataTableProps) => {
  const previewRows = rows.slice(0, maxRows);
  const resolvedColumns = columns ?? getColumnsFromRows(previewRows);
  const displayColumns = resolvedColumns.slice(0, 6);
  if (!(previewRows.length && displayColumns.length)) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>;
  }
  const isNumericColumn = (column: string) =>
    previewRows.some((row) => typeof row[column] === "number");

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {displayColumns.map((column) => (
              <TableHead
                className={isNumericColumn(column) ? "text-right" : undefined}
                key={column}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {previewRows.map((row, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {displayColumns.map((column) => (
                <TableCell
                  className={isNumericColumn(column) ? "text-right" : undefined}
                  key={`${rowIndex}-${column}`}
                >
                  {formatCellValue(row[column])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

interface ComparisonTableProps {
  summaries: PeriodSummary[];
}

const ComparisonTable = ({ summaries }: ComparisonTableProps) => (
  <div className="overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Leads</TableHead>
          <TableHead className="text-right">Qualified</TableHead>
          <TableHead className="text-right">Proposals</TableHead>
          <TableHead className="text-right">Won</TableHead>
          <TableHead className="text-right">Close Rate</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Events</TableHead>
          <TableHead className="text-right">Avg Event</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {summaries.map((summary) => (
          <TableRow key={summary.label}>
            <TableCell className="font-medium">{summary.label}</TableCell>
            <TableCell className="text-right">
              {formatNumber(summary.leadsReceived)}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(summary.qualifiedLeads)}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(summary.proposalsSent)}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(summary.eventsWon)}
            </TableCell>
            <TableCell className="text-right">
              {formatPercent(summary.closingRatio)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(summary.revenue)}
            </TableCell>
            <TableCell className="text-right">
              {formatNumber(summary.eventsClosed)}
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(summary.averageEventValue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

interface ValidationTableProps {
  results: FunnelValidationResult[];
}

const ValidationTable = ({ results }: ValidationTableProps) => {
  if (!results.length) {
    return <div className="text-sm text-muted-foreground">No results.</div>;
  }
  const isRateMetric = (metric: string) =>
    metric.toLowerCase().includes("ratio") ||
    metric.toLowerCase().includes("rate");

  const formatValidationValue = (value: number | null, metric: string) => {
    if (value === null) {
      return "-";
    }
    return isRateMetric(metric) ? formatPercent(value) : formatNumber(value);
  };

  const formatDelta = (value: number | null, metric: string) => {
    if (value === null) {
      return "-";
    }
    return isRateMetric(metric)
      ? formatSignedPercent(value)
      : formatSignedNumber(value);
  };

  const formatDeltaPct = (value: number | null) =>
    value === null ? "-" : formatSignedPercent(value);

  const statusVariant = (status: FunnelValidationResult["status"]) => {
    if (status === "Pass") {
      return "secondary" as const;
    }
    if (status === "Fail") {
      return "destructive" as const;
    }
    return "outline" as const;
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Expected</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Delta</TableHead>
            <TableHead className="text-right">Delta %</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((row) => (
            <TableRow key={row.metric}>
              <TableCell className="font-medium">{row.metric}</TableCell>
              <TableCell className="text-right">
                {formatValidationValue(row.expected, row.metric)}
              </TableCell>
              <TableCell className="text-right">
                {formatValidationValue(row.actual, row.metric)}
              </TableCell>
              <TableCell className="text-right">
                {formatDelta(row.delta, row.metric)}
              </TableCell>
              <TableCell className="text-right">
                {formatDeltaPct(row.delta_pct)}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

interface PricingSummaryTableProps {
  rows: QuarterlyMetrics["pricingSummary"];
}

const PricingSummaryTable = ({ rows }: PricingSummaryTableProps) => {
  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No pricing summary data.
      </div>
    );
  }
  const isPercentMetric = (metric: string) => {
    const normalized = metric.toLowerCase();
    return (
      normalized.includes("pct") ||
      normalized.includes("percent") ||
      normalized.includes("discount")
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.metric}>
              <TableCell className="font-medium">{row.metric}</TableCell>
              <TableCell className="text-right">
                {isPercentMetric(row.metric)
                  ? formatPercent(row.value)
                  : formatCurrency(row.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

interface SegmentSummaryTableProps {
  rows: QuarterlyMetrics["segmentSummary"];
}

const SegmentSummaryTable = ({ rows }: SegmentSummaryTableProps) => {
  if (!rows.length) {
    return (
      <div className="text-sm text-muted-foreground">No segment data.</div>
    );
  }
  const displayRows = rows.slice(0, 12);
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event Type</TableHead>
            <TableHead>Size Bucket</TableHead>
            <TableHead>Budget Tier</TableHead>
            <TableHead className="text-right">Count</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, index) => (
            <TableRow key={`${row.event_type}-${index}`}>
              <TableCell className="font-medium">{row.event_type}</TableCell>
              <TableCell>{row.size_bucket}</TableCell>
              <TableCell>{row.budget_tier}</TableCell>
              <TableCell className="text-right">
                {formatNumber(row.count)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(row.revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

interface FunnelBySourceTableProps {
  rows: QuarterlyMetrics["funnelBySource"];
}

const FunnelBySourceTable = ({ rows }: FunnelBySourceTableProps) => {
  if (!rows.length) {
    return <div className="text-sm text-muted-foreground">No funnel data.</div>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead Source</TableHead>
            <TableHead className="text-right">Inquiries</TableHead>
            <TableHead className="text-right">Qualified</TableHead>
            <TableHead className="text-right">Proposals</TableHead>
            <TableHead className="text-right">Won</TableHead>
            <TableHead className="text-right">Lost</TableHead>
            <TableHead className="text-right">Proposal Rate</TableHead>
            <TableHead className="text-right">Win Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.lead_source}>
              <TableCell className="font-medium">{row.lead_source}</TableCell>
              <TableCell className="text-right">
                {formatNumber(row.Inquiries)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.qualified)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.proposals)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.won)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(row.lost)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(row.proposal_rate)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(row.win_rate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
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
  const topCloser = getTopItem(
    monthly.closingBySalesperson,
    "salesperson",
    "win_rate"
  );
  if (topCloser) {
    highlights.push(
      `Best win rate: ${topCloser.label} (${formatPercent(topCloser.value)})`
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
  if (quarterly.opportunities[0]) {
    highlights.push(`Opportunity: ${quarterly.opportunities[0]}`);
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
  const topPackage = getTopItem(annual.topPackages, "package", "revenue");
  if (topPackage) {
    highlights.push(
      `Top package: ${topPackage.label} (${formatCurrency(topPackage.value)})`
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

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const buffer = await file.arrayBuffer();
      // Lazy load xlsx only when user uploads a file - keeps it out of initial bundle
      const xlsx = await import("xlsx");
      const workbook = xlsx.read(buffer, { type: "array", cellDates: true });
      const data = loadSalesData(workbook);
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

  const columns = useMemo(
    () => (salesData ? getColumnsFromRows(salesData.masterEvents) : []),
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
    return dateColumnOptions.detected.length
      ? dateColumnOptions.detected
      : columns;
  }, [columns, dateColumnOptions.detected, showAllColumns]);

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

  const metrics = useMemo(() => {
    if (!salesData) {
      return null;
    }
    const created = createdChoice ?? eventChoice;
    const event = eventChoice ?? createdChoice;
    if (!(created && event)) {
      return null;
    }
    const week = weekAnchor ? parseInputDate(weekAnchor) : new Date();
    const month = monthAnchor ? parseInputDate(monthAnchor) : new Date();
    const quarter = quarterAnchor ? parseInputDate(quarterAnchor) : new Date();
    return prepareSalesMetrics({
      salesData,
      createdChoice: created,
      eventChoice: event,
      weekAnchor: week,
      monthAnchor: month,
      quarterAnchor: quarter,
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

  const weeklySummary = useMemo(
    () => (metrics ? buildWeeklySummary(metrics.weekly) : null),
    [metrics]
  );
  const monthlySummary = useMemo(
    () => (metrics ? buildMonthlySummary(metrics.monthly) : null),
    [metrics]
  );
  const quarterlySummary = useMemo(
    () => (metrics ? buildQuarterlySummary(metrics.quarterly) : null),
    [metrics]
  );
  const annualSummary = useMemo(
    () => (metrics ? buildAnnualSummary(metrics.annual) : null),
    [metrics]
  );

  const createdRatio = createdChoice
    ? (dateColumnOptions.ratios[createdChoice] ?? 0)
    : 0;
  const eventRatio = eventChoice
    ? (dateColumnOptions.ratios[eventChoice] ?? 0)
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
        <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
        <p className="text-muted-foreground">
          Upload a workbook to explore weekly, monthly, quarterly, and annual
          sales performance.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Upload Workbook</CardTitle>
          <CardDescription>
            Upload the consolidated Excel file with RAW sheets and mapping tabs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Label htmlFor="sales-upload">Excel file</Label>
            <Input
              accept=".xlsx,.xls"
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
            <p className="text-sm text-muted-foreground">Parsing workbook...</p>
          ) : null}
          {loadError ? (
            <Alert variant="destructive">
              <AlertTitle>Workbook Error</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {salesData ? (
        <>
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
                    onValueChange={(value) => setCreatedChoice(value)}
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
                    onValueChange={(value) => setEventChoice(value)}
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
                    onChange={(event) => setWeekAnchor(event.target.value)}
                    type="date"
                    value={weekAnchor}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Month anchor</Label>
                  <Input
                    onChange={(event) => setMonthAnchor(event.target.value)}
                    type="date"
                    value={monthAnchor}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quarter anchor</Label>
                  <Input
                    onChange={(event) => setQuarterAnchor(event.target.value)}
                    type="date"
                    value={quarterAnchor}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workbook Snapshot</CardTitle>
              <CardDescription>
                Master Events: {formatNumber(salesData.masterEvents.length)} •
                Deals Lost: {formatNumber(salesData.dealsLost.length)} • Lead
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
                {createdRatio ? formatPercent(createdRatio) : "N/A"} • Range:{" "}
                {createdRange
                  ? `${createdRange.min.toLocaleDateString()} to ${createdRange.max.toLocaleDateString()}`
                  : "N/A"}
              </p>
              <p>
                Event Date coverage:{" "}
                {eventRatio ? formatPercent(eventRatio) : "N/A"} • Range:{" "}
                {eventRange
                  ? `${eventRange.min.toLocaleDateString()} to ${eventRange.max.toLocaleDateString()}`
                  : "N/A"}
              </p>
            </CardContent>
          </Card>

          {metrics ? (
            <Tabs className="space-y-6" defaultValue="weekly">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                <TabsTrigger value="annual">Annual</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="validation">Validation</TabsTrigger>
              </TabsList>

              <TabsContent className="space-y-6" value="weekly">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Metrics</CardTitle>
                    <CardDescription>
                      {formatDateRange(
                        metrics.weekly.window.start,
                        metrics.weekly.window.end
                      )}{" "}
                      • Created Date (funnel) / Event Date (revenue)
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
                  <BarChartCard
                    data={metrics.weekly.revenueByEventType.map((item) => ({
                      label: item.event_type,
                      value: item.revenue,
                    }))}
                    description="Booked revenue by event type in the selected week."
                    title="Revenue by Event Type"
                    valueFormatter={formatCurrency}
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
                          next._status = undefined;
                        }
                        return next;
                      })}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Export</CardTitle>
                    <CardDescription>
                      Download the weekly snapshot as a PDF.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {weeklySummary ? (
                      <ReportDownload
                        fileName={`weekly-sales-${formatDateForFile(
                          metrics.weekly.window.end
                        )}.pdf`}
                        summary={weeklySummary}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Complete the column mapping to enable exports.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

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
                  <BarChartCard
                    data={metrics.monthly.leadSourceBreakdown.map((item) => ({
                      label: item.lead_source,
                      value: item.count,
                    }))}
                    title="Lead Source Breakdown"
                  />
                  <BarChartCard
                    data={metrics.monthly.salesFunnel.map((item) => ({
                      label: item.stage,
                      value: item.count,
                    }))}
                    title="Sales Funnel"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <BarChartCard
                    data={metrics.monthly.closingBySalesperson.map((item) => ({
                      label: item.salesperson,
                      value: item.win_rate,
                    }))}
                    description="Win rate by salesperson."
                    title="Closing by Salesperson"
                    valueFormatter={formatPercent}
                  />
                  <BarChartCard
                    data={metrics.monthly.topPackages.map((item) => ({
                      label: item.package,
                      value: item.revenue,
                    }))}
                    title="Top Packages"
                    valueFormatter={formatCurrency}
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

                <Card>
                  <CardHeader>
                    <CardTitle>Export</CardTitle>
                    <CardDescription>
                      Download the monthly snapshot as a PDF.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {monthlySummary ? (
                      <ReportDownload
                        fileName={`monthly-sales-${formatDateForFile(
                          metrics.monthly.window.end
                        )}.pdf`}
                        summary={monthlySummary}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Complete the column mapping to enable exports.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
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
                  <BarChartCard
                    data={metrics.quarterly.funnelBySource.map((item) => ({
                      label: item.lead_source,
                      value: item.Inquiries,
                    }))}
                    title="Funnel by Source (Inquiries)"
                  />
                  <BarChartCard
                    data={metrics.quarterly.funnelBySource.map((item) => ({
                      label: item.lead_source,
                      value: item.win_rate,
                    }))}
                    title="Funnel Win Rate"
                    valueFormatter={formatPercent}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <BarChartCard
                    data={metrics.quarterly.venuePerformance.map((item) => ({
                      label: item.venue_source,
                      value: item.revenue,
                    }))}
                    description="Revenue by venue partner."
                    title="Venue Partner Performance"
                    valueFormatter={formatCurrency}
                  />
                  <LineChartCard
                    data={metrics.quarterly.pricingTrends.map((item) => ({
                      label: formatDateLabel(item.month),
                      value: item.avg_discount_rate,
                    }))}
                    description="Average discount rate for won events."
                    title="Avg Discount Rate"
                    valueFormatter={formatPercent}
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

                <Card>
                  <CardHeader>
                    <CardTitle>Export</CardTitle>
                    <CardDescription>
                      Download the quarterly snapshot as a PDF.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {quarterlySummary ? (
                      <ReportDownload
                        fileName={`quarterly-sales-${formatDateForFile(
                          metrics.quarterly.window.end
                        )}.pdf`}
                        summary={quarterlySummary}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Complete the column mapping to enable exports.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

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
                  <LineChartCard
                    data={metrics.annual.revenueByMonth.map((item) => ({
                      label: formatDateLabel(item.month),
                      value: item.revenue,
                    }))}
                    title="Revenue by Month"
                    valueFormatter={formatCurrency}
                  />
                  <BarChartCard
                    data={metrics.annual.revenueByEventType.map((item) => ({
                      label: item.event_type,
                      value: item.revenue,
                    }))}
                    title="Revenue by Event Type"
                    valueFormatter={formatCurrency}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <BarChartCard
                    data={metrics.annual.leadSourceBreakdown.map((item) => ({
                      label: item.lead_source,
                      value: item.count,
                    }))}
                    title="Lead Source Breakdown"
                  />
                  <BarChartCard
                    data={metrics.annual.salesFunnel.map((item) => ({
                      label: item.stage,
                      value: item.count,
                    }))}
                    title="Sales Funnel"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <BarChartCard
                    data={metrics.annual.closingBySalesperson.map((item) => ({
                      label: item.salesperson,
                      value: item.win_rate,
                    }))}
                    title="Closing by Salesperson"
                    valueFormatter={formatPercent}
                  />
                  <BarChartCard
                    data={metrics.annual.topPackages.map((item) => ({
                      label: item.package,
                      value: item.revenue,
                    }))}
                    title="Top Packages"
                    valueFormatter={formatCurrency}
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

                <Card>
                  <CardHeader>
                    <CardTitle>Export</CardTitle>
                    <CardDescription>
                      Download the annual snapshot as a PDF.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {annualSummary ? (
                      <ReportDownload
                        fileName={`annual-sales-${formatDateForFile(
                          metrics.annual.window.end
                        )}.pdf`}
                        summary={annualSummary}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Complete the column mapping to enable exports.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

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
                      <BarChartCard
                        data={metrics.summaries.map((summary) => ({
                          label: summary.label,
                          value: summary.revenue,
                        }))}
                        title="Revenue by Period"
                        valueFormatter={formatCurrency}
                      />
                      <BarChartCard
                        data={metrics.summaries.map((summary) => ({
                          label: summary.label,
                          value: summary.closingRatio,
                        }))}
                        title="Closing Ratio by Period"
                        valueFormatter={formatPercent}
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
          <AlertTitle>Load a workbook to begin</AlertTitle>
          <AlertDescription>
            The dashboard will appear after you upload an Excel workbook with
            the required sheets.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
