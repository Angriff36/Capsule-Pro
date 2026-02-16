/**
 * Mock for @repo/database package
 *
 * This mock prevents loading the actual database module which requires
 * server-only environment and Prisma client generation.
 */

import { vi } from "vitest";

type PrismaSqlFn = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => {
  strings: TemplateStringsArray;
  values: unknown[];
  readonly sql: string;
};

type PrismaJoinFn = (parts: unknown[], separator: unknown) => string;

// Mock Prisma sql tag function and all exports from generated/client
const sqlImpl: PrismaSqlFn = vi.fn((strings, ...values) => ({
  strings,
  values,
  get sql() {
    return strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + (values[i] !== undefined ? String(values[i]) : ""),
      ""
    );
  },
}));

const joinImpl: PrismaJoinFn = vi.fn((parts, separator) => {
  return parts.filter(Boolean).join(separator);
});

export const Prisma: {
  sql: PrismaSqlFn;
  join: PrismaJoinFn;
  empty: {};
  PrismaClient: unknown;
} = {
  sql: sqlImpl,
  join: joinImpl,
  empty: {},
  // Add other commonly used Prisma types/mocks
  PrismaClient: vi.fn(),
};

// Re-export all Prisma types (you can add more as needed)
export const PrismaClient: unknown = vi.fn();

// Helper to create a mock Prisma model
function createMockModel() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

// Mock database instance
export const database: Record<string, unknown> = {
  $queryRaw: vi.fn(),
  $transaction: vi.fn(),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $on: vi.fn(),
  $use: vi.fn(),
  // Add Prisma models
  prepTask: createMockModel(),
  outboxEvent: createMockModel(),
  menu: createMockModel(),
  menuDish: createMockModel(),
  recipe: createMockModel(),
  recipeVersion: createMockModel(),
  ingredient: createMockModel(),
  recipeIngredient: createMockModel(),
  dish: createMockModel(),
  prepList: createMockModel(),
  prepListItem: createMockModel(),
  inventoryItem: createMockModel(),
  station: createMockModel(),
  units: createMockModel(),
  recipe_steps: createMockModel(),
};

// Mock tenantDatabase function
export const tenantDatabase = vi.fn(() => database);
