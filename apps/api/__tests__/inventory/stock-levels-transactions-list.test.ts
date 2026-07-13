/**
 * GET /api/inventory/stock-levels/transactions (list) — parallelization guard.
 *
 * Pins item #23: `count` + `findMany` run CONCURRENTLY in one `Promise.all`
 * (2 serial round-trips → 1 batch). Count-first route: making `count` pending
 * and asserting `findMany` still fires proves concurrency — serial
 * `await count` would block and never reach findMany.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    inventoryTransaction: { findMany: vi.fn(), count: vi.fn() },
    inventoryItem: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/inventory/stock-levels/transactions/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/inventory/stock-levels/transactions (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.inventoryItem.findMany).mockResolvedValue([] as never);
  });

  it("runs count + findMany concurrently, not serially", async () => {
    let resolveCount!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveCount = r;
    });
    vi.mocked(database.inventoryTransaction.count).mockReturnValue(
      pending as never
    );
    vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue(
      [] as never
    );

    const p = GET(
      new Request("http://x/api/inventory/stock-levels/transactions")
    );

    await vi.waitFor(() => {
      expect(database.inventoryTransaction.count).toHaveBeenCalledTimes(1);
    });
    // findMany fires synchronously alongside the still-pending count —
    // impossible under serial `await count; await findMany`.
    expect(database.inventoryTransaction.findMany).toHaveBeenCalledTimes(1);

    resolveCount(0);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.inventoryTransaction.count).mockResolvedValue(12 as never);
    vi.mocked(database.inventoryTransaction.findMany).mockResolvedValue([
      {
        id: "t1",
        itemId: "i1",
        tenantId: "tenant_test",
        storageLocationId: null,
        employeeId: null,
      },
    ] as never);

    const res = await GET(
      new Request(
        "http://x/api/inventory/stock-levels/transactions?limit=10&page=2"
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 12,
      totalPages: 2,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/inventory/stock-levels/transactions")
    );
    expect(res.status).toBe(401);
    expect(database.inventoryTransaction.findMany).not.toHaveBeenCalled();
    expect(database.inventoryTransaction.count).not.toHaveBeenCalled();
  });
});
