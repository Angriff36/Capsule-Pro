/**
 * GET /api/events/reports (list) — parallelization + pagination guard.
 *
 * Pins item #23: the list route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially. The concurrency
 * proof uses a controlled *pending* `findMany` promise: in a `Promise.all` the
 * `count` is invoked in the same synchronous burst as `findMany` (array
 * construction), so it fires WHILE `findMany` is still pending. A serial
 * `await findMany(); await count();` version could not call `count` until
 * `findMany` resolves — so this test fails if reverted to serial.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    eventReport: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/events/reports/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/events/reports (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org_test",
      userId: "user_test",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("runs findMany + count concurrently, not serially", async () => {
    // findMany stays pending (we control its resolution); count resolves at once.
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.eventReport.findMany).mockReturnValue(pending as never);
    vi.mocked(database.eventReport.count).mockResolvedValue(7);

    const p = GET(new Request("http://x/api/events/reports?page=1&limit=10"));

    // Wait until execution reaches the query layer (findMany invoked).
    await vi.waitFor(() => {
      expect(database.eventReport.findMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: count fires while findMany is still pending. A serial
    // `await findMany; await count` could not reach count here.
    expect(database.eventReport.count).toHaveBeenCalledTimes(1);
    expect(database.eventReport.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: "tenant_test" }),
    });

    resolveFindMany([{ id: "r1" }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct totalPages math", async () => {
    vi.mocked(database.eventReport.findMany).mockResolvedValue([
      { id: "r1" },
      { id: "r2" },
    ] as never);
    vi.mocked(database.eventReport.count).mockResolvedValue(25);

    const res = await GET(
      new Request("http://x/api/events/reports?page=2&limit=10")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request("http://x/api/events/reports"));
    expect(res.status).toBe(401);
    expect(database.eventReport.findMany).not.toHaveBeenCalled();
    expect(database.eventReport.count).not.toHaveBeenCalled();
  });
});
