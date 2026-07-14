/**
 * GET /api/events/[eventId]/guests (list) — parallelization + pagination guard.
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
vi.mock("@repo/database", () => ({
  database: {
    event: { findFirst: vi.fn() },
    eventGuest: { findMany: vi.fn(), count: vi.fn() },
  },
}));
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
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/events/[eventId]/guests/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/events/[eventId]/guests (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.event.findFirst).mockResolvedValue({
      id: "evt_1",
      tenantId: "tenant_test",
    } as never);
  });

  it("runs findMany + count concurrently, not serially", async () => {
    // findMany stays pending (we control its resolution); count resolves at once.
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.eventGuest.findMany).mockReturnValue(pending as never);
    vi.mocked(database.eventGuest.count).mockResolvedValue(7);

    const p = GET(
      new Request("http://x/api/events/evt_1/guests?limit=10&offset=0"),
      { params: Promise.resolve({ eventId: "evt_1" }) }
    );

    // Wait until execution reaches the query layer (findMany invoked).
    await vi.waitFor(() => {
      expect(database.eventGuest.findMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: count fires while findMany is still pending. A serial
    // `await findMany; await count` could not reach count here.
    expect(database.eventGuest.count).toHaveBeenCalledTimes(1);
    expect(database.eventGuest.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { tenantId: "tenant_test" },
          { eventId: "evt_1" },
        ]),
      }),
    });

    resolveFindMany([{ id: "g1" }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.eventGuest.findMany).mockResolvedValue([
      { id: "g1", guestName: "Alice" },
      { id: "g2", guestName: "Bob" },
    ] as never);
    vi.mocked(database.eventGuest.count).mockResolvedValue(25);

    const res = await GET(
      new Request("http://x/api/events/evt_1/guests?limit=10&offset=10"),
      { params: Promise.resolve({ eventId: "evt_1" }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.guests).toHaveLength(2);
    expect(body.pagination).toEqual({
      limit: 10,
      offset: 10,
      total: 25,
    });

    // Existence-read projection guard: findFirst is a pure existence check (only
    // the `!event` 404 guard reads it) → MUST select only `id`.
    expect(database.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true } })
    );
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request("http://x/api/events/evt_1/guests"), {
      params: Promise.resolve({ eventId: "evt_1" }),
    });
    expect(res.status).toBe(401);
    expect(database.eventGuest.findMany).not.toHaveBeenCalled();
    expect(database.eventGuest.count).not.toHaveBeenCalled();
  });
});
