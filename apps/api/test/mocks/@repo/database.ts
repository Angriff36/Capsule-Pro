/**
 * Mock for @repo/database package
 *
 * This mock prevents loading the actual database module which requires
 * server-only environment and Prisma client generation.
 */

import { vi } from "vitest";

// Mock Prisma sql tag function and all exports from generated/client
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

// Re-export all Prisma types (you can add more as needed)
export const PrismaClient = vi.fn();

// Mock database instance
export const database = {
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $on: vi.fn(),
  $use: vi.fn(),
};

// Mock tenantDatabase function
export const tenantDatabase = vi.fn(() => database);
