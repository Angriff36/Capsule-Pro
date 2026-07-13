/**
 * GET /api/kitchen/recipes (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially. The
 * concurrency proof uses a controlled *pending* `findMany` promise: in a
 * `Promise.all` the `count` is invoked in the same synchronous burst as
 * `findMany`, so it fires WHILE `findMany` is still pending — impossible in a
 * serial `await findMany(); await count();` version.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    recipe: { findMany: vi.fn(), count: vi.fn() },
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
import { GET } from "@/app/api/kitchen/recipes/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/kitchen/recipes (list)", () => {
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
    vi.mocked(database.recipe.findMany).mockReturnValue(pending as never);
    vi.mocked(database.recipe.count).mockResolvedValue(7);

    const p = GET(new Request("http://x/api/kitchen/recipes?limit=10&page=2"));

    await vi.waitFor(() => {
      expect(database.recipe.findMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: count fires while findMany is still pending.
    expect(database.recipe.count).toHaveBeenCalledTimes(1);
    expect(database.recipe.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { tenantId: "tenant_test" },
          { deletedAt: null },
        ]),
      }),
    });

    resolveFindMany([{ id: "r1" }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.recipe.findMany).mockResolvedValue([
      { id: "r1", name: "A" },
      { id: "r2", name: "B" },
    ] as never);
    vi.mocked(database.recipe.count).mockResolvedValue(25);

    const res = await GET(
      new Request("http://x/api/kitchen/recipes?limit=10&page=2")
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
    const res = await GET(new Request("http://x/api/kitchen/recipes"));
    expect(res.status).toBe(401);
    expect(database.recipe.findMany).not.toHaveBeenCalled();
    expect(database.recipe.count).not.toHaveBeenCalled();
  });
});
