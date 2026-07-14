/**
 * GET /api/events/contracts/expiring (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's first `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch). Pins item #7: the downstream
 * groupBy + event + client enrichment reads ALSO run in one `Promise.all`
 * (3 serial round-trips → 1 batch).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    eventContract: { findMany: vi.fn(), count: vi.fn() },
    contractSignature: { groupBy: vi.fn() },
    event: { findMany: vi.fn() },
    client: { findMany: vi.fn() },
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn() },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/events/contracts/expiring/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/events/contracts/expiring (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.contractSignature.groupBy).mockResolvedValue([]);
    vi.mocked(database.event.findMany).mockResolvedValue([]);
    vi.mocked(database.client.findMany).mockResolvedValue([]);
  });

  it("runs findMany + count concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.eventContract.findMany).mockReturnValue(
      pending as never
    );
    vi.mocked(database.eventContract.count).mockResolvedValue(42);

    const p = GET(
      new Request(
        "http://x/api/events/contracts/expiring?days=30&page=1&limit=10"
      )
    );

    await vi.waitFor(() => {
      expect(database.eventContract.findMany).toHaveBeenCalledTimes(1);
    });

    expect(database.eventContract.count).toHaveBeenCalledTimes(1);
    expect(database.eventContract.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: "tenant_test" }),
    });

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct totalPages math", async () => {
    vi.mocked(database.eventContract.findMany).mockResolvedValue([
      {
        id: "c1",
        eventId: "e1",
        clientId: null,
        contractNumber: "C001",
        title: "Contract 1",
        status: "sent",
        documentType: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    vi.mocked(database.eventContract.count).mockResolvedValue(25);

    const res = await GET(
      new Request(
        "http://x/api/events/contracts/expiring?days=30&page=2&limit=10"
      )
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

  it("runs groupBy + event + client enrichment concurrently, not serially", async () => {
    vi.mocked(database.eventContract.findMany).mockResolvedValue([
      {
        id: "c1",
        eventId: "e1",
        clientId: "cl1",
        contractNumber: "C001",
        title: "Contract 1",
        status: "sent",
        documentType: null,
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);
    vi.mocked(database.eventContract.count).mockResolvedValue(1);

    // Hold groupBy pending — event.findMany + client.findMany must still fire in
    // the same synchronous burst (fails if the three reads are awaited serially).
    let resolveGroupBy!: (v: unknown) => void;
    vi.mocked(database.contractSignature.groupBy).mockReturnValue(
      new Promise((r) => {
        resolveGroupBy = r;
      }) as never
    );
    vi.mocked(database.event.findMany).mockResolvedValue([]);
    vi.mocked(database.client.findMany).mockResolvedValue([]);

    const p = GET(
      new Request("http://x/api/events/contracts/expiring?days=30")
    );

    await vi.waitFor(() => {
      expect(database.contractSignature.groupBy).toHaveBeenCalledTimes(1);
      expect(database.event.findMany).toHaveBeenCalledTimes(1);
      expect(database.client.findMany).toHaveBeenCalledTimes(1);
    });

    resolveGroupBy([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/events/contracts/expiring")
    );
    expect(res.status).toBe(401);
    expect(database.eventContract.findMany).not.toHaveBeenCalled();
    expect(database.eventContract.count).not.toHaveBeenCalled();
  });
});
