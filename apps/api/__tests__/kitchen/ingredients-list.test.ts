/**
 * GET /api/kitchen/ingredients (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially. Controlled
 * pending-`findMany` concurrency proof — fails if reverted to serial.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    ingredient: { findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/kitchen/ingredients/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/kitchen/ingredients (list)", () => {
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
    vi.mocked(database.ingredient.findMany).mockReturnValue(pending as never);
    vi.mocked(database.ingredient.count).mockResolvedValue(7);

    const p = GET(
      new Request("http://x/api/kitchen/ingredients?limit=10&page=2")
    );

    await vi.waitFor(() => {
      expect(database.ingredient.findMany).toHaveBeenCalledTimes(1);
    });

    expect(database.ingredient.count).toHaveBeenCalledTimes(1);
    expect(database.ingredient.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { tenantId: "tenant_test" },
          { deletedAt: null },
        ]),
      }),
    });

    resolveFindMany([{ id: "i1" }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.ingredient.findMany).mockResolvedValue([
      { id: "i1", name: "A" },
      { id: "i2", name: "B" },
    ] as never);
    vi.mocked(database.ingredient.count).mockResolvedValue(25);

    const res = await GET(
      new Request("http://x/api/kitchen/ingredients?limit=10&page=2")
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
    const res = await GET(new Request("http://x/api/kitchen/ingredients"));
    expect(res.status).toBe(401);
    expect(database.ingredient.findMany).not.toHaveBeenCalled();
    expect(database.ingredient.count).not.toHaveBeenCalled();
  });
});
