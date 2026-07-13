/**
 * GET /api/crm/clients/[id]/events (list) — parallelization guard (#23).
 * findMany-first route: `findMany` pending + `count` still fires => concurrent.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    event: { findMany: vi.fn(), count: vi.fn() },
    client: { findFirst: vi.fn() },
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

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/crm/clients/[id]/events/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const ctx = () => ({ params: Promise.resolve({ id: "c1" }) });

describe("GET /api/crm/clients/[id]/events (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.client.findFirst).mockResolvedValue({ id: "c1" } as never);
  });

  it("runs findMany + count concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.event.findMany).mockReturnValue(pending as never);
    vi.mocked(database.event.count).mockResolvedValue(0 as never);

    const p = GET(
      new Request("http://x/api/crm/clients/c1/events"),
      ctx() as never
    );

    await vi.waitFor(() => {
      expect(database.event.findMany).toHaveBeenCalledTimes(1);
    });
    expect(database.event.count).toHaveBeenCalledTimes(1);

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.event.findMany).mockResolvedValue([
      { id: "e1", title: "Event" },
    ] as never);
    vi.mocked(database.event.count).mockResolvedValue(7 as never);

    const res = await GET(
      new Request("http://x/api/crm/clients/c1/events?limit=10&offset=0"),
      ctx() as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({ limit: 10, offset: 0, total: 7 });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/crm/clients/c1/events"),
      ctx() as never
    );
    expect(res.status).toBe(401);
    expect(database.event.findMany).not.toHaveBeenCalled();
    expect(database.event.count).not.toHaveBeenCalled();
  });
});
