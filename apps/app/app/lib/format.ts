/**
 * Format utility functions for displaying values
 */

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

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
  const dateStr = isoString.split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null): string {
  if (!date) {
    return "Never";
  }
  const d = typeof date === "string" ? parseISODateToLocal(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string | null): string {
  if (!date) {
    return "Never";
  }
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
