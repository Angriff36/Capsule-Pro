/**
 * GET /api/inventory/cycle-count/audit-logs (list) — parallelization guard (#23).
 * Count-first route: `count` pending + `findMany` still fires => concurrent.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    cycleCountAuditLog: { findMany: vi.fn(), count: vi.fn() },
    cycleCountSession: { findFirst: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/inventory/cycle-count/audit-logs/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/inventory/cycle-count/audit-logs (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("runs count + findMany concurrently, not serially", async () => {
    let resolveCount!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveCount = r;
    });
    vi.mocked(database.cycleCountAuditLog.count).mockReturnValue(
      pending as never
    );
    vi.mocked(database.cycleCountAuditLog.findMany).mockResolvedValue(
      [] as never
    );

    const p = GET(
      new Request("http://x/api/inventory/cycle-count/audit-logs")
    );

    await vi.waitFor(() => {
      expect(database.cycleCountAuditLog.count).toHaveBeenCalledTimes(1);
    });
    expect(database.cycleCountAuditLog.findMany).toHaveBeenCalledTimes(1);

    resolveCount(0);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.cycleCountAuditLog.count).mockResolvedValue(8 as never);
    vi.mocked(database.cycleCountAuditLog.findMany).mockResolvedValue([
      { id: "a1", tenantId: "tenant_test" },
    ] as never);

    const res = await GET(
      new Request("http://x/api/inventory/cycle-count/audit-logs?limit=10&page=1")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 8,
      totalPages: 1,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/inventory/cycle-count/audit-logs")
    );
    expect(res.status).toBe(401);
    expect(database.cycleCountAuditLog.findMany).not.toHaveBeenCalled();
    expect(database.cycleCountAuditLog.count).not.toHaveBeenCalled();
  });
});
