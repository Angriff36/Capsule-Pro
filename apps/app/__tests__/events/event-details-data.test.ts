/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockQueryRaw = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: <T extends (...args: any[]) => any>(fn: T) => fn,
  };
});

vi.mock("@repo/database", () => ({
  database: {
    event: { findFirst: vi.fn(), findMany: vi.fn() },
    eventGuest: { count: vi.fn(), groupBy: vi.fn() },
    eventStaffAssignment: { count: vi.fn() },
    eventContract: { count: vi.fn() },
    $queryRaw: mockQueryRaw,
  },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
  },
}));

import { getEventPrepLists } from "../../app/(authenticated)/events/[eventId]/event-details-data";

interface SqlMock {
  strings: TemplateStringsArray;
  values: unknown[];
}

function isSqlMock(value: unknown): value is SqlMock {
  return (
    typeof value === "object" &&
    value !== null &&
    "strings" in value &&
    "values" in value
  );
}

describe("event details data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryRaw.mockResolvedValue([]);
  });

  it("does not reference missing prep_list is_active column", async () => {
    await getEventPrepLists("tenant-1", "event-1");

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    const sql = mockQueryRaw.mock.calls[0]?.[0];

    expect(isSqlMock(sql)).toBe(true);
    expect(sql?.strings.join(" ")).not.toContain('is_active AS "isActive"');
  });
});
