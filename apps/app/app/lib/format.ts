export {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyWhole,
} from "@repo/design-system/lib/format-currency";

/**
 * Format quantity with fixed decimals
 */
export function formatQuantity(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Parse an ISO date string to a local Date object without timezone shifts.
 * Use this for date-only values (like event dates) stored as ISO strings.
 *
 * @param isoString - ISO date string like "2024-03-15T00:00:00.000Z"
 * @returns Date object representing the same calendar date in local timezone
 */
export function parseISODateToLocal(isoString: string): Date {
  const dateStr = isoString.split("T")[0] ?? "";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year ?? Number.NaN, (month ?? Number.NaN) - 1, day);
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string | number | null | undefined
): string {
  if (date == null || date === "") {
    return "Never";
  }
  const d =
    typeof date === "string" ? parseISODateToLocal(date) : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return "Never";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Format date and time for display.
 * SCHEMA PLACEMENT / CONTRACT RULE: API sends ISO strings or null; UI formats with
 * this helper (or formatDate). Never call Intl.DateTimeFormat().format(value) on a
 * raw value — it throws "Invalid time value" on null/invalid. These helpers never throw.
 */
export function formatDateTime(
  date: Date | string | number | null | undefined
): string {
  if (date == null || date === "") {
    return "Never";
  }
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return "Never";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
