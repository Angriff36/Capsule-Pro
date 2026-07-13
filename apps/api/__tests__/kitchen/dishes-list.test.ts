/**
 * GET /api/kitchen/dishes (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially. Controlled
 * pending-`findMany` concurrency proof — fails if reverted to serial.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    dish: { findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class InvariantError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/kitchen/dishes/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/kitchen/dishes (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("runs findMany + count concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.dish.findMany).mockReturnValue(pending as never);
    vi.mocked(database.dish.count).mockResolvedValue(7);

    const p = GET(new Request("http://x/api/kitchen/dishes?limit=10&page=2"));

    await vi.waitFor(() => {
      expect(database.dish.findMany).toHaveBeenCalledTimes(1);
    });

    expect(database.dish.count).toHaveBeenCalledTimes(1);
    expect(database.dish.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { tenantId: "tenant_test" },
          { deletedAt: null },
        ]),
      }),
    });

    resolveFindMany([{ id: "d1" }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.dish.findMany).mockResolvedValue([
      { id: "d1", name: "A" },
      { id: "d2", name: "B" },
    ] as never);
    vi.mocked(database.dish.count).mockResolvedValue(25);

    const res = await GET(
      new Request("http://x/api/kitchen/dishes?limit=10&page=2")
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
    const res = await GET(new Request("http://x/api/kitchen/dishes"));
    expect(res.status).toBe(401);
    expect(database.dish.findMany).not.toHaveBeenCalled();
    expect(database.dish.count).not.toHaveBeenCalled();
  });
});
