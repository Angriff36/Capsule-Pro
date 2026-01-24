/**
 * Mock for Prisma generated client
 *
 * This mocks the PrismaClient and all generated types to prevent
 * loading the actual database module in tests.
 */

import { vi } from "vitest";

// Mock Prisma sql tag function
export const Prisma = {
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
  // Add other commonly used Prisma types/mocks
  PrismaClient: vi.fn(),
};

// Re-export everything that would normally come from generated/client
export const PrismaClient = vi.fn();
