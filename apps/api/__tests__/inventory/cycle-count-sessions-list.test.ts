/**
 * GET /api/inventory/cycle-count/sessions (list) — parallelization guard (#23).
 * Count-first route: `count` pending + `findMany` still fires => concurrent.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    cycleCountSession: { findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/inventory/cycle-count/sessions/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/inventory/cycle-count/sessions (list)", () => {
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
    vi.mocked(database.cycleCountSession.count).mockReturnValue(
      pending as never
    );
    vi.mocked(database.cycleCountSession.findMany).mockResolvedValue(
      [] as never
    );

    const p = GET(new Request("http://x/api/inventory/cycle-count/sessions"));

    await vi.waitFor(() => {
      expect(database.cycleCountSession.count).toHaveBeenCalledTimes(1);
    });
    // findMany fires while count is still pending — impossible in serial.
    expect(database.cycleCountSession.findMany).toHaveBeenCalledTimes(1);

    resolveCount(0);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.cycleCountSession.count).mockResolvedValue(25 as never);
    vi.mocked(database.cycleCountSession.findMany).mockResolvedValue([
      {
        id: "s1",
        tenantId: "tenant_test",
        totalVariance: { toNumber: () => 0 },
        variancePercentage: { toNumber: () => 0 },
      },
    ] as never);

    const res = await GET(
      new Request("http://x/api/inventory/cycle-count/sessions?limit=10&page=2")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/inventory/cycle-count/sessions")
    );
    expect(res.status).toBe(401);
    expect(database.cycleCountSession.findMany).not.toHaveBeenCalled();
    expect(database.cycleCountSession.count).not.toHaveBeenCalled();
  });
});
