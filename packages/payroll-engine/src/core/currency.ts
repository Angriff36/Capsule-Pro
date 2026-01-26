import Decimal from "decimal.js";

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Currency utility class for precise financial calculations
 * All internal calculations use Decimal.js for precision
 * Output is rounded to 2 decimal places (cents)
 */
export class Currency {
  private value: Decimal;

  constructor(amount: number | string | Decimal) {
    this.value = new Decimal(amount);
  }

  static zero(): Currency {
    return new Currency(0);
  }

  static fromCents(cents: number): Currency {
    return new Currency(new Decimal(cents).dividedBy(100));
  }

  add(other: Currency | number): Currency {
    const otherValue =
      other instanceof Currency ? other.value : new Decimal(other);
    return new Currency(this.value.plus(otherValue));
  }

  subtract(other: Currency | number): Currency {
    const otherValue =
      other instanceof Currency ? other.value : new Decimal(other);
    return new Currency(this.value.minus(otherValue));
  }

  multiply(factor: number | Decimal): Currency {
    return new Currency(this.value.times(factor));
  }

  divide(divisor: number | Decimal): Currency {
    if (new Decimal(divisor).isZero()) {
      throw new Error("Division by zero");
    }
    return new Currency(this.value.dividedBy(divisor));
  }

  /**
   * Calculate percentage of this amount
   * @param percentage - Percentage as a number (e.g., 15 for 15%)
   */
  percentage(percentage: number): Currency {
    return new Currency(this.value.times(percentage).dividedBy(100));
  }

  /**
   * Get the value rounded to 2 decimal places
   */
  toNumber(): number {
    return this.value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
  }

  /**
   * Get the value in cents (rounded to nearest cent)
   */
  toCents(): number {
    return this.value.times(100).round().toNumber();
  }

  /**
   * Format as currency string
   */
  format(currencyCode = "USD", locale = "en-US"): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    }).format(this.toNumber());
  }

  isPositive(): boolean {
    return this.value.isPositive();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  greaterThan(other: Currency | number): boolean {
    const otherValue =
      other instanceof Currency ? other.value : new Decimal(other);
    return this.value.greaterThan(otherValue);
  }

  lessThan(other: Currency | number): boolean {
    const otherValue =
      other instanceof Currency ? other.value : new Decimal(other);
    return this.value.lessThan(otherValue);
  }

  equals(other: Currency | number): boolean {
    const otherValue =
      other instanceof Currency ? other.value : new Decimal(other);
    return this.value.toDecimalPlaces(2).equals(otherValue);
  }

  /**
   * Ensure non-negative value
   */
  nonNegative(): Currency {
    return this.value.isNegative() ? Currency.zero() : this;
  }

  /**
   * Cap at a maximum value
   */
  cap(max: Currency | number): Currency {
    const maxValue = max instanceof Currency ? max.value : new Decimal(max);
    return this.value.greaterThan(maxValue) ? new Currency(maxValue) : this;
  }

  /**
   * Get the raw Decimal value
   */
  raw(): Decimal {
    return this.value;
  }
}

/**
 * Helper to create Currency instance
 */
export function money(amount: number | string): Currency {
  return new Currency(amount);
}

/**
 * Sum an array of Currency values
 */
export function sumCurrency(amounts: Currency[]): Currency {
  return amounts.reduce((sum, amount) => sum.add(amount), Currency.zero());
}

/**
 * Format date for payroll exports
 */
type DateFormat = "iso" | "us" | "qb";

const dateFormatters: Record<DateFormat, (date: Date) => string> = {
  iso: (date) => date.toISOString().split("T")[0],
  us: (date) =>
    `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`,
  qb: (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
};

export function formatDate(date: Date, format: DateFormat = "iso"): string {
  const formatter = dateFormatters[format] ?? dateFormatters.iso;
  return formatter(date);
}
