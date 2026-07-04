import { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";
import type { KpiCardProps } from "../components/kpi-card";
import type {
  AnnualMetrics,
  CellValue,
  DataRow,
  MonthlyMetrics,
  QuarterlyMetrics,
  WeeklyMetrics,
} from "./sales-analytics";

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export const formatSignedCurrency = (value: number) =>
  value >= 0 ? `+${formatCurrency(value)}` : formatCurrency(value);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);

export const formatSignedPercent = (value: number) =>
  value >= 0 ? `+${formatPercent(value)}` : formatPercent(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

export const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

export const formatDateRange = (start: Date, end: Date) =>
  `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

export const formatDateForInput = (date: Date) =>
  date.toISOString().split("T")[0] ?? "";

export const parseInputDate = (value: string) => new Date(`${value}T00:00:00`);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const toDateValue = (value: unknown): Date | null => {
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

export const getColumnsFromRows = (rows: DataRow[]) => {
  const columns = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key);
    }
  }
  return Array.from(columns);
};

export const getDateRange = (rows: DataRow[], column: string | null) => {
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
  return {
    min: new Date(Math.min(...times)),
    max: new Date(Math.max(...times)),
  };
};

export const mapRowsWithDates = (
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
    if (!Number.isFinite(numeric)) {
      continue;
    }
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

export const findRowLabel = (row: DataRow): string | null => {
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
    if (match) {
      return String(match[1]);
    }
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
  highlights?: string[];
  kpis: KpiCardProps[];
  title: string;
  windowLabel: string;
}

export const buildWeeklySummary = (weekly: WeeklyMetrics): ReportSummary => {
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
  const firstPending = weekly.topPending[0];
  const pendingLabel = firstPending ? findRowLabel(firstPending) : null;
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

export const buildMonthlySummary = (monthly: MonthlyMetrics): ReportSummary => {
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

export const buildQuarterlySummary = (
  quarterly: QuarterlyMetrics
): ReportSummary => {
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
  const topSegment = quarterly.segmentSummary
    .slice()
    .sort((a, b) => b.revenue - a.revenue)[0];
  if (topSegment) {
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

export const buildAnnualSummary = (annual: AnnualMetrics): ReportSummary => {
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

export { formatCurrency };
