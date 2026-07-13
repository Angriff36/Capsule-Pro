/**
 * GET /api/events/battle-boards (list) — parallelization + pagination guard.
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
    battleBoard: {
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
import { GET } from "@/app/api/events/battle-boards/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/events/battle-boards (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("runs findMany + count concurrently, not serially", async () => {
    // findMany stays pending (we control its resolution); count resolves at once.
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.battleBoard.findMany).mockReturnValue(pending as never);
    vi.mocked(database.battleBoard.count).mockResolvedValue(7);

    const p = GET(
      new Request("http://x/api/events/battle-boards?page=1&limit=10")
    );

    // Wait until execution reaches the query layer (findMany invoked).
    await vi.waitFor(() => {
      expect(database.battleBoard.findMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: count fires while findMany is still pending. A serial
    // `await findMany; await count` could not reach count here.
    expect(database.battleBoard.count).toHaveBeenCalledTimes(1);
    expect(database.battleBoard.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: "tenant_test" }),
    });

    resolveFindMany([{ id: "b1" }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct totalPages math", async () => {
    vi.mocked(database.battleBoard.findMany).mockResolvedValue([
      { id: "b1" },
      { id: "b2" },
    ] as never);
    vi.mocked(database.battleBoard.count).mockResolvedValue(25);

    const res = await GET(
      new Request("http://x/api/events/battle-boards?page=2&limit=10")
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
    const res = await GET(new Request("http://x/api/events/battle-boards"));
    expect(res.status).toBe(401);
    expect(database.battleBoard.findMany).not.toHaveBeenCalled();
    expect(database.battleBoard.count).not.toHaveBeenCalled();
  });
});
