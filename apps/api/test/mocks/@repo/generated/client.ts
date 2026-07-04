/**
 * Mock for Prisma generated client
 *
 * This mocks the PrismaClient and all generated types to prevent
 * loading the actual database module in tests.
 */

import { vi } from "vitest";

/**
 * Minimal `Prisma.Decimal` stand-in.
 *
 * `manifest/runtime/src/numeric-boundary.ts` does money/ratio math with
 * `new Prisma.Decimal(v).plus|times|dividedBy(...).greaterThan(...).toNumber()`.
 * It imports `Prisma` from `@repo/database/standalone`, which re-exports it from
 * this generated-client module — so the mock must expose a chainable Decimal or
 * the runtime throws "Prisma.Decimal is not a constructor". JS-number backed
 * arithmetic is sufficient for the values exercised in these unit tests.
 */
class MockDecimal {
  private readonly n: number;
  constructor(v: number | string | MockDecimal) {
    this.n = v instanceof MockDecimal ? v.n : Number(v);
  }
  private static num(v: number | string | MockDecimal): number {
    return v instanceof MockDecimal ? v.n : Number(v);
  }
  plus(v: number | string | MockDecimal) {
    return new MockDecimal(this.n + MockDecimal.num(v));
  }
  minus(v: number | string | MockDecimal) {
    return new MockDecimal(this.n - MockDecimal.num(v));
  }
  times(v: number | string | MockDecimal) {
    return new MockDecimal(this.n * MockDecimal.num(v));
  }
  dividedBy(v: number | string | MockDecimal) {
    return new MockDecimal(this.n / MockDecimal.num(v));
  }
  greaterThan(v: number | string | MockDecimal) {
    return this.n > MockDecimal.num(v);
  }
  lessThan(v: number | string | MockDecimal) {
    return this.n < MockDecimal.num(v);
  }
  toNumber() {
    return this.n;
  }
  toString() {
    return String(this.n);
  }
}

// Mock Prisma sql tag function
export const Prisma: Record<string, unknown> = {
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    get sql() {
      return strings.reduce(
        (acc, str, i) =>
          acc + str + (values[i] !== undefined ? String(values[i]) : ""),
        ""
      );
    },
  })),
  join: vi.fn((parts: unknown[], separator: string) => {
    return parts.filter(Boolean).join(separator);
  }),
  empty: {},
  Decimal: MockDecimal,
  // Add other commonly used Prisma types/mocks
  PrismaClient: vi.fn(),
};

// Re-export everything that would normally come from generated/client
export const PrismaClient: unknown = vi.fn();
