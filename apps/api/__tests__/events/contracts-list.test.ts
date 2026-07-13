/**
 * GET /api/events/contracts (list) — parallelization regression guard.
 *
 * Pins items #23 + #7 on a flagship-surface route. The original GET ran a
 * 4-deep serial waterfall — `eventContract.findMany` → `event.findMany` →
 * `client.findMany` → `eventContract.count` — i.e. 4 round-trips. The
 * parallel version is 2 batches:
 *   1. `findMany(contracts)` ‖ `count`  — both keyed solely on `whereClause`
 *      (the count has no data dependency on the page rows).
 *   2. `findMany(events)` ‖ `findMany(clients)` — both depend only on the
 *      contract page's eventIds/clientIds, not on each other.
 *
 * The concurrency proofs use a controlled *pending* promise: inside a
 * `Promise.all` the second query is invoked in the same synchronous burst as
 * the first (array construction), so it fires WHILE the first is still
 * pending. A serial `await a; await b` could not reach `b` until `a` resolves
 * — so these tests fail if reverted to serial.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    eventContract: { findMany: vi.fn(), count: vi.fn() },
    event: { findMany: vi.fn() },
    client: { findMany: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/events/contracts/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const contractFindMany = database.eventContract.findMany as ReturnType<
  typeof vi.fn
>;
const contractCount = database.eventContract.count as ReturnType<typeof vi.fn>;
const eventFindMany = database.event.findMany as ReturnType<typeof vi.fn>;
const clientFindMany = database.client.findMany as ReturnType<typeof vi.fn>;

describe("GET /api/events/contracts (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    eventFindMany.mockResolvedValue([]);
    clientFindMany.mockResolvedValue([]);
  });

  it("runs findMany + count concurrently in the first batch (#23)", async () => {
    // contracts.findMany stays pending; count resolves at once.
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    contractFindMany.mockReturnValue(pending as never);
    contractCount.mockResolvedValue(7);

    const p = GET(new Request("http://x/api/events/contracts?page=1&limit=10"));

    await vi.waitFor(() => {
      expect(contractFindMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: count fires while contracts.findMany is still pending.
    // A serial `await findMany; await count` could not reach count here.
    expect(contractCount).toHaveBeenCalledTimes(1);
    expect(contractCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ AND: expect.any(Array) }),
    });

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("runs event + client detail fetches concurrently in the second batch (#7)", async () => {
    contractFindMany.mockResolvedValue([
      { id: "c1", eventId: "e1", clientId: "cl1" },
    ] as never);
    contractCount.mockResolvedValue(1);

    // event.findMany stays pending; assert client.findMany fires in the same batch.
    let resolveEvents!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveEvents = r;
    });
    eventFindMany.mockReturnValue(pending as never);

    const p = GET(new Request("http://x/api/events/contracts"));

    await vi.waitFor(() => {
      expect(eventFindMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: client.findMany fires while event.findMany is still pending.
    // A serial `await events; await clients` could not reach clients here.
    expect(clientFindMany).toHaveBeenCalledTimes(1);

    resolveEvents([{ id: "e1", title: "Event 1", eventDate: null }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("enriches contracts with event/client lookups + correct pagination math", async () => {
    contractFindMany.mockResolvedValue([
      { id: "c1", eventId: "e1", clientId: "cl1" },
      { id: "c2", eventId: null, clientId: "cl2" },
    ] as never);
    contractCount.mockResolvedValue(25);
    eventFindMany.mockResolvedValue([
      { id: "e1", title: "Gala", eventDate: "2026-08-01" },
    ] as never);
    clientFindMany.mockResolvedValue([
      { id: "cl1", companyName: "Acme", firstName: "A", lastName: "B" },
      { id: "cl2", companyName: null, firstName: "C", lastName: "D" },
    ] as never);

    const res = await GET(
      new Request("http://x/api/events/contracts?page=2&limit=10")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    // Enrichment: c1 has an event + client; c2 has a null event (no eventId).
    expect(body.data[0].event).toMatchObject({ id: "e1", title: "Gala" });
    expect(body.data[0].client).toMatchObject({ id: "cl1" });
    expect(body.data[1].event).toBeNull();
    expect(body.data[1].client).toMatchObject({ id: "cl2" });
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request("http://x/api/events/contracts"));
    expect(res.status).toBe(401);
    expect(contractFindMany).not.toHaveBeenCalled();
    expect(contractCount).not.toHaveBeenCalled();
  });
});
