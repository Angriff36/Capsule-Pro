/**
 * GET /api/kitchen/allergens/warnings (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    allergenWarning: { findMany: vi.fn(), count: vi.fn() },
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
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      const err = new Error(message);
      err.name = "InvariantError";
      throw err;
    }
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/kitchen/allergens/warnings/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/kitchen/allergens/warnings (list)", () => {
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
    vi.mocked(database.allergenWarning.findMany).mockReturnValue(
      pending as never
    );
    vi.mocked(database.allergenWarning.count).mockResolvedValue(12);

    const p = GET(new NextRequest("http://x/api/kitchen/allergens/warnings"));

    await vi.waitFor(() => {
      expect(database.allergenWarning.findMany).toHaveBeenCalledTimes(1);
    });

    expect(database.allergenWarning.count).toHaveBeenCalledTimes(1);
    expect(database.allergenWarning.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: "tenant_test" }),
    });

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.allergenWarning.findMany).mockResolvedValue([
      { id: "w1", severity: "high" },
      { id: "w2", severity: "low" },
    ] as never);
    vi.mocked(database.allergenWarning.count).mockResolvedValue(30);

    const res = await GET(
      new NextRequest("http://x/api/kitchen/allergens/warnings?limit=10&offset=5")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.warnings).toHaveLength(2);
    expect(body.pagination).toEqual({
      total: 30,
      limit: 10,
      offset: 5,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new NextRequest("http://x/api/kitchen/allergens/warnings")
    );
    expect(res.status).toBe(401);
    expect(database.allergenWarning.findMany).not.toHaveBeenCalled();
    expect(database.allergenWarning.count).not.toHaveBeenCalled();
  });
});
