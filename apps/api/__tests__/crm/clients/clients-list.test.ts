/**
 * GET /api/crm/clients (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially. Controlled
 * pending-`findMany` concurrency proof — fails if reverted to serial.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    client: { findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class InvariantError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
  // crm/clients' ./validation calls invariant() for pagination/filter parsing.
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
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/crm/clients/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/crm/clients (list)", () => {
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
    vi.mocked(database.client.findMany).mockReturnValue(pending as never);
    vi.mocked(database.client.count).mockResolvedValue(7);

    const p = GET(new Request("http://x/api/crm/clients?limit=10&page=2"));

    await vi.waitFor(() => {
      expect(database.client.findMany).toHaveBeenCalledTimes(1);
    });

    expect(database.client.count).toHaveBeenCalledTimes(1);
    expect(database.client.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { tenantId: "tenant_test" },
          { deletedAt: null },
        ]),
      }),
    });

    resolveFindMany([{ id: "c1" }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.client.findMany).mockResolvedValue([
      { id: "c1", companyName: "A" },
      { id: "c2", companyName: "B" },
    ] as never);
    vi.mocked(database.client.count).mockResolvedValue(25);

    const res = await GET(new Request("http://x/api/crm/clients?limit=10&page=2"));
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
    const res = await GET(new Request("http://x/api/crm/clients"));
    expect(res.status).toBe(401);
    expect(database.client.findMany).not.toHaveBeenCalled();
    expect(database.client.count).not.toHaveBeenCalled();
  });
});
