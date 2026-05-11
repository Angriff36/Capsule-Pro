export interface FormatCurrencyOptions {
  fractionDigits?: number;
  currency?: string;
  locale?: string;
  nullDisplay?: string;
  compact?: boolean;
}

function formatCompact(value: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency;
  if (value >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${symbol}${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrency(
  value: number | string | null | undefined,
  options?: FormatCurrencyOptions,
): string {
  const {
    fractionDigits = 2,
    currency = "USD",
    locale = "en-US",
    nullDisplay = "--",
    compact = false,
  } = options ?? {};

  if (value == null) return nullDisplay;

  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;

  if (Number.isNaN(numeric)) return nullDisplay;

  if (compact) return formatCompact(numeric, currency);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(numeric);
}

export function formatCurrencyWhole(
  value: number | string | null | undefined,
): string {
  return formatCurrency(value, { fractionDigits: 0 });
}

export function formatCurrencyCompact(
  value: number | string | null | undefined,
): string {
  return formatCurrency(value, { compact: true });
}
