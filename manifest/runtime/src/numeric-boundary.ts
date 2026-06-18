/**
 * Money and ratio math at manifest runtime boundaries.
 *
 * Uses Prisma.Decimal instead of IEEE float so roll-ups and comparisons do not
 * drift (e.g. 0.1 + 0.2 !== 0.3 in raw JS).
 */
import { Prisma } from "@repo/database/standalone";

type MoneyInput = number | string | null | undefined;

function toDecimal(value: MoneyInput): Prisma.Decimal | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  try {
    return new Prisma.Decimal(value);
  } catch {
    return null;
  }
}

/** Sum money values with decimal precision; returns a JS number for manifest use. */
export function sumPrecise(values: Iterable<MoneyInput>): number {
  let total = new Prisma.Decimal(0);
  for (const value of values) {
    const decimal = toDecimal(value);
    if (decimal) {
      total = total.plus(decimal);
    }
  }
  return total.toNumber();
}

/** True when `left` is strictly greater than `right` (money-safe). */
export function isMoneyGreaterThan(
  left: MoneyInput,
  right: MoneyInput
): boolean {
  const a = toDecimal(left);
  const b = toDecimal(right);
  if (!(a && b)) {
    return false;
  }
  return a.greaterThan(b);
}

/** `(part / whole) * 100`, or 0 when whole is not positive. */
export function percentOf(part: number, whole: number): number {
  if (!(Number.isFinite(part) && Number.isFinite(whole)) || whole <= 0) {
    return 0;
  }
  return new Prisma.Decimal(part)
    .dividedBy(whole)
    .times(100)
    .toNumber();
}
