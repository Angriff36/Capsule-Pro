/**
 * @responsibility Derive screen-reader-friendly summaries and ARIA labels from chart data
 * @tags accessibility, aria, charts, vega-lite, utilities
 *
 * Pure functions — no React, no DOM. Fully unit-testable.
 * Consumed by `VegaChart` to provide accessible descriptions of data visualizations.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single labelled data point as consumed by the bar/line chart helpers. */
export interface ChartDatum {
  label: unknown;
  value: unknown;
  [key: string]: unknown;
}

export type TrendDirection = "up" | "down" | "flat" | "unknown";

export interface ChartSummary {
  /** Arithmetic mean of numeric values. */
  average: number;
  /** Label of the row with the smallest value (null if indeterminate). */
  bottomLabel: string | null;
  /** Number of data points. */
  count: number;
  /** True when every numeric value is identical. */
  isFlat: boolean;
  /** Largest numeric value. */
  max: number;
  /** Smallest numeric value. */
  min: number;
  /** Label of the row with the largest value (null if indeterminate). */
  topLabel: string | null;
  /** Sum of all numeric values. */
  total: number;
  /** Overall trend across the ordered series (unknown for < 2 points). */
  trend: TrendDirection;
}

export interface GenerateSummaryOptions {
  /** Treat values as currency when formatting the narration. */
  currency?: boolean;
  /** Override the field name holding the category label (default "label"). */
  labelField?: string;
  /** Override the field name holding the quantitative value (default "value"). */
  valueField?: string;
}

// ---------------------------------------------------------------------------
// Core derivation
// ---------------------------------------------------------------------------

/** Coerce an unknown cell value into a finite number, or NaN if not numeric. */
function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    // Strip currency symbols, thousands separators and surrounding whitespace.
    const cleaned = value.replace(/[$,\s]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") {
      return Number.NaN;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

/** Coerce an unknown label into a trimmed string. */
function toLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value).trim();
}

/**
 * Derive a structured {@link ChartSummary} from a chart's data array.
 *
 * Returns a zeroed summary when the input is empty or contains no numeric
 * values, so callers never have to null-check.
 */
export function generateChartSummary(
  data: readonly Record<string, unknown>[] | null | undefined,
  options?: GenerateSummaryOptions
): ChartSummary {
  const empty: ChartSummary = {
    count: 0,
    total: 0,
    min: 0,
    max: 0,
    average: 0,
    topLabel: null,
    bottomLabel: null,
    trend: "unknown",
    isFlat: true,
  };

  if (!data || data.length === 0) {
    return empty;
  }

  const valueField = options?.valueField ?? "value";
  const labelField = options?.labelField ?? "label";

  const points = data
    .map((row) => {
      const raw = row[valueField];
      return {
        label: toLabel(row[labelField]),
        value: toFiniteNumber(raw),
      };
    })
    .filter((p) => Number.isFinite(p.value));

  if (points.length === 0) {
    return empty;
  }

  let total = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let topLabel: string | null = null;
  let bottomLabel: string | null = null;

  for (const point of points) {
    total += point.value;
    if (point.value < min) {
      min = point.value;
      bottomLabel = point.label;
    }
    if (point.value > max) {
      max = point.value;
      topLabel = point.label;
    }
  }

  const average = total / points.length;
  const isFlat = min === max;

  // Trend requires at least two points and is derived from first vs last.
  let trend: TrendDirection = "unknown";
  if (points.length >= 2) {
    const first = points[0]?.value ?? 0;
    const last = points.at(-1)?.value ?? first;
    if (first === last) {
      trend = "flat";
    } else if (last > first) {
      trend = "up";
    } else {
      trend = "down";
    }
  }

  return {
    count: points.length,
    total,
    min,
    max,
    average,
    topLabel: topLabel || null,
    bottomLabel: bottomLabel || null,
    trend,
    isFlat,
  };
}

// ---------------------------------------------------------------------------
// Narration
// ---------------------------------------------------------------------------

/** Format a numeric value for human reading. */
function formatValue(value: number, currency?: boolean): string {
  if (currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

const TREND_WORDS: Record<TrendDirection, string> = {
  up: "trending upward",
  down: "trending downward",
  flat: "flat",
  unknown: "",
};

/**
 * Produce a single plain-language sentence describing the series for an
 * `aria-label` or live region announcement.
 */
export function summarizeForScreenReader(
  summary: ChartSummary,
  options?: GenerateSummaryOptions & { unit?: string }
): string {
  if (summary.count === 0) {
    return "Chart has no data to display.";
  }

  const unit = options?.unit ?? (options?.currency ? "revenue" : "value");
  const parts: string[] = [];

  parts.push(
    `Chart shows ${summary.count} ${summary.count === 1 ? "point" : "points"}.`
  );

  parts.push(
    `${capitalize(unit)} ranges from ${formatValue(
      summary.min,
      options?.currency
    )} to ${formatValue(summary.max, options?.currency)}, averaging ${formatValue(
      summary.average,
      options?.currency
    )}.`
  );

  if (summary.topLabel) {
    parts.push(
      `Highest ${unit}: ${summary.topLabel} at ${formatValue(
        summary.max,
        options?.currency
      )}.`
    );
  }
  if (summary.bottomLabel && summary.bottomLabel !== summary.topLabel) {
    parts.push(
      `Lowest ${unit}: ${summary.bottomLabel} at ${formatValue(
        summary.min,
        options?.currency
      )}.`
    );
  }

  const trendWord = TREND_WORDS[summary.trend];
  if (trendWord) {
    parts.push(`The series is ${trendWord}.`);
  }

  return parts.join(" ");
}

/**
 * Compose the final `aria-label` for a chart container, combining the
 * human title, an optional author-provided description, and the derived
 * data summary.
 */
export function buildChartAriaLabel(params: {
  title?: string | null;
  description?: string | null;
  summaryText: string;
}): string {
  const segments: string[] = [];
  if (params.title) {
    segments.push(params.title);
  }
  if (params.description) {
    segments.push(params.description);
  }
  segments.push(params.summaryText);
  return segments.join(" ");
}

/**
 * Produce a short plain-language paragraph for the visible companion panel
 * that narrates the key data points. Intentionally readable by sighted
 * users and screen readers alike.
 */
export function narrateSummary(
  summary: ChartSummary,
  options?: GenerateSummaryOptions & { unit?: string }
): string {
  if (summary.count === 0) {
    return "No data is available for this chart.";
  }

  const unit = options?.unit ?? (options?.currency ? "revenue" : "value");
  const sentences: string[] = [];

  // Headline finding.
  if (summary.topLabel) {
    sentences.push(
      `${summary.topLabel} leads with ${formatValue(
        summary.max,
        options?.currency
      )} (${capitalize(unit)}).`
    );
  } else {
    sentences.push(
      `Peak ${unit} is ${formatValue(summary.max, options?.currency)}.`
    );
  }

  // Spread / average.
  sentences.push(
    `Across ${summary.count} ${
      summary.count === 1 ? "entry" : "entries"
    }, values average ${formatValue(summary.average, options?.currency)}.`
  );

  // Trend.
  const trendWord = TREND_WORDS[summary.trend];
  if (trendWord) {
    sentences.push(`Values are ${trendWord} over the series.`);
  }

  // Bottom performer, when distinct.
  if (
    summary.bottomLabel &&
    summary.bottomLabel !== summary.topLabel &&
    !summary.isFlat
  ) {
    sentences.push(
      `${summary.bottomLabel} sits lowest at ${formatValue(
        summary.min,
        options?.currency
      )}.`
    );
  }

  return sentences.join(" ");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function capitalize(text: string): string {
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}
