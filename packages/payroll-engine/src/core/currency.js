var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.Currency = void 0;
exports.money = money;
exports.sumCurrency = sumCurrency;
exports.formatDate = formatDate;
const decimal_js_1 = __importDefault(require("decimal.js"));
// Configure Decimal.js for financial calculations
decimal_js_1.default.set({
  precision: 20,
  rounding: decimal_js_1.default.ROUND_HALF_UP,
});
/**
 * Currency utility class for precise financial calculations
 * All internal calculations use Decimal.js for precision
 * Output is rounded to 2 decimal places (cents)
 */
class Currency {
  value;
  constructor(amount) {
    this.value = new decimal_js_1.default(amount);
  }
  static zero() {
    return new Currency(0);
  }
  static fromCents(cents) {
    return new Currency(new decimal_js_1.default(cents).dividedBy(100));
  }
  add(other) {
    const otherValue =
      other instanceof Currency ? other.value : new decimal_js_1.default(other);
    return new Currency(this.value.plus(otherValue));
  }
  subtract(other) {
    const otherValue =
      other instanceof Currency ? other.value : new decimal_js_1.default(other);
    return new Currency(this.value.minus(otherValue));
  }
  multiply(factor) {
    return new Currency(this.value.times(factor));
  }
  divide(divisor) {
    if (new decimal_js_1.default(divisor).isZero()) {
      throw new Error("Division by zero");
    }
    return new Currency(this.value.dividedBy(divisor));
  }
  /**
   * Calculate percentage of this amount
   * @param percentage - Percentage as a number (e.g., 15 for 15%)
   */
  percentage(percentage) {
    return new Currency(this.value.times(percentage).dividedBy(100));
  }
  /**
   * Get the value rounded to 2 decimal places
   */
  toNumber() {
    return this.value
      .toDecimalPlaces(2, decimal_js_1.default.ROUND_HALF_UP)
      .toNumber();
  }
  /**
   * Get the value in cents (rounded to nearest cent)
   */
  toCents() {
    return this.value.times(100).round().toNumber();
  }
  /**
   * Format as currency string
   */
  format(currencyCode = "USD", locale = "en-US") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    }).format(this.toNumber());
  }
  isPositive() {
    return this.value.isPositive();
  }
  isNegative() {
    return this.value.isNegative();
  }
  isZero() {
    return this.value.isZero();
  }
  greaterThan(other) {
    const otherValue =
      other instanceof Currency ? other.value : new decimal_js_1.default(other);
    return this.value.greaterThan(otherValue);
  }
  lessThan(other) {
    const otherValue =
      other instanceof Currency ? other.value : new decimal_js_1.default(other);
    return this.value.lessThan(otherValue);
  }
  equals(other) {
    const otherValue =
      other instanceof Currency ? other.value : new decimal_js_1.default(other);
    return this.value.toDecimalPlaces(2).equals(otherValue);
  }
  /**
   * Ensure non-negative value
   */
  nonNegative() {
    return this.value.isNegative() ? Currency.zero() : this;
  }
  /**
   * Cap at a maximum value
   */
  cap(max) {
    const maxValue =
      max instanceof Currency ? max.value : new decimal_js_1.default(max);
    return this.value.greaterThan(maxValue) ? new Currency(maxValue) : this;
  }
  /**
   * Get the raw Decimal value
   */
  raw() {
    return this.value;
  }
}
exports.Currency = Currency;
/**
 * Helper to create Currency instance
 */
function money(amount) {
  return new Currency(amount);
}
/**
 * Sum an array of Currency values
 */
function sumCurrency(amounts) {
  return amounts.reduce((sum, amount) => sum.add(amount), Currency.zero());
}
/**
 * Format date for payroll exports
 */
function formatDate(date, format = "iso") {
  switch (format) {
    case "iso":
      return date.toISOString().split("T")[0];
    case "us":
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    case "qb":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    default:
      return date.toISOString().split("T")[0];
  }
}
