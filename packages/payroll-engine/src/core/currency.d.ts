import Decimal from "decimal.js";
/**
 * Currency utility class for precise financial calculations
 * All internal calculations use Decimal.js for precision
 * Output is rounded to 2 decimal places (cents)
 */
export declare class Currency {
  private value;
  constructor(amount: number | string | Decimal);
  static zero(): Currency;
  static fromCents(cents: number): Currency;
  add(other: Currency | number): Currency;
  subtract(other: Currency | number): Currency;
  multiply(factor: number | Decimal): Currency;
  divide(divisor: number | Decimal): Currency;
  /**
   * Calculate percentage of this amount
   * @param percentage - Percentage as a number (e.g., 15 for 15%)
   */
  percentage(percentage: number): Currency;
  /**
   * Get the value rounded to 2 decimal places
   */
  toNumber(): number;
  /**
   * Get the value in cents (rounded to nearest cent)
   */
  toCents(): number;
  /**
   * Format as currency string
   */
  format(currencyCode?: string, locale?: string): string;
  isPositive(): boolean;
  isNegative(): boolean;
  isZero(): boolean;
  greaterThan(other: Currency | number): boolean;
  lessThan(other: Currency | number): boolean;
  equals(other: Currency | number): boolean;
  /**
   * Ensure non-negative value
   */
  nonNegative(): Currency;
  /**
   * Cap at a maximum value
   */
  cap(max: Currency | number): Currency;
  /**
   * Get the raw Decimal value
   */
  raw(): Decimal;
}
/**
 * Helper to create Currency instance
 */
export declare function money(amount: number | string): Currency;
/**
 * Sum an array of Currency values
 */
export declare function sumCurrency(amounts: Currency[]): Currency;
/**
 * Format date for payroll exports
 */
export declare function formatDate(
  date: Date,
  format?: "iso" | "us" | "qb"
): string;
//# sourceMappingURL=currency.d.ts.map
