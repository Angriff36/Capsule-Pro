/**
 * Brand Voice Utilities
 *
 * Enforces Mangia brand conventions:
 * - Date format: MM.dd.yy (e.g., 02.12.23)
 * - Time format: H AM/PM (e.g., 5 PM, 3 AM)
 * - Ampersand: use "and" or "+" instead of "&"
 * - No hyphens within line breaks of body text
 */

// Regex patterns for validation
const BRAND_DATE_PATTERN = /^\d{2}\.\d{2}\.\d{2}$/;
const BRAND_TIME_PATTERN = /^\d{1,2}\s(?:AM|PM)$/i;

/**
 * Format a date according to Mangia brand guidelines (MM.dd.yy)
 * @example
 * formatBrandDate(new Date('2023-02-12')) // "02.12.23"
 */
export function formatBrandDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}.${day}.${year}`;
}

/**
 * Format a time according to Mangia brand guidelines (H AM/PM)
 * @example
 * formatBrandTime(new Date('2023-02-12 17:30')) // "5 PM"
 * formatBrandTime(new Date('2023-02-12 03:00')) // "3 AM"
 */
export function formatBrandTime(date: Date): string {
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  return `${displayHours} ${ampm}`;
}

/**
 * Format a date and time together according to brand guidelines
 * @example
 * formatBrandDateTime(new Date('2023-02-12 17:30')) // "02.12.23 at 5 PM"
 */
export function formatBrandDateTime(date: Date): string {
  return `${formatBrandDate(date)} at ${formatBrandTime(date)}`;
}

/**
 * Convert ampersands in text according to brand guidelines
 * Replaces "&" with "and" or "+", preferring "+" in informal contexts
 * @example
 * replaceBrandAmpersand('peanut butter & jelly') // "peanut butter and jelly"
 * replaceBrandAmpersand('coffee & pastries', 'plus') // "coffee + pastries"
 */
export function replaceBrandAmpersand(
  text: string,
  format: "and" | "plus" = "and"
): string {
  const replacement = format === "plus" ? "+" : "and";
  return text.replace(/&/g, replacement);
}

/**
 * Normalize a date string to brand format
 * Accepts various date formats and returns MM.dd.yy
 * @example
 * normalizeBrandDate('2-13-23') // "02.13.23"
 * normalizeBrandDate('02/13/2023') // "02.13.23"
 * normalizeBrandDate('2023-02-13') // "02.13.23"
 */
export function normalizeBrandDate(dateStr: string): string {
  // Try parsing various formats
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  return formatBrandDate(date);
}

/**
 * Validate if a string follows brand date format (MM.dd.yy)
 * @example
 * isBrandDateFormat('02.12.23') // true
 * isBrandDateFormat('2-12-23') // false
 */
export function isBrandDateFormat(dateStr: string): boolean {
  return BRAND_DATE_PATTERN.test(dateStr);
}

/**
 * Validate if a string follows brand time format (H AM/PM)
 * @example
 * isBrandTimeFormat('5 PM') // true
 * isBrandTimeFormat('5:00 PM') // false
 */
export function isBrandTimeFormat(timeStr: string): boolean {
  return BRAND_TIME_PATTERN.test(timeStr);
}
