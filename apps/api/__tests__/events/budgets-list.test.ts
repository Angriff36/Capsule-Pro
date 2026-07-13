/**
 * GET /api/events/budgets (list) — parallelization + pagination guard.
 *
 * Pins item #23: the list route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially. The concurrency
 * proof uses a controlled *pending* `findMany` promise: in a `Promise.all` the
 * `count` is invoked in the same synchronous burst as `findMany` (array
 * construction), so it fires WHILE `findMany` is still pending. A serial
 * `await findMany(); await count();` version could not call `count` until
 * `findMany` resolves — so this test fails if reverted to serial.
 *
 * Note: this route preserves its own response contract `{ budgets, total, page,
 * limit, totalPages }` (NOT the `{ data, pagination }` shape used by some other
 * list routes) — the assertions match that contract exactly.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    eventBudget: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/events/budgets/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/events/budgets (list)", () => {
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
    vi.mocked(database.eventBudget.findMany).mockReturnValue(pending as never);
    vi.mocked(database.eventBudget.count).mockResolvedValue(7);

    const p = GET(new Request("http://x/api/events/budgets?page=1&limit=10"));

    // Wait until execution reaches the query layer (findMany invoked).
    await vi.waitFor(() => {
      expect(database.eventBudget.findMany).toHaveBeenCalledTimes(1);
    });

    // CONCURRENCY: count fires while findMany is still pending. A serial
    // `await findMany; await count` could not reach count here.
    expect(database.eventBudget.count).toHaveBeenCalledTimes(1);
    expect(database.eventBudget.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ AND: expect.any(Array) }),
    });

    resolveFindMany([{ id: "bg1" }]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("does NOT include lineItems in the list payload (#19 over-fetch)", async () => {
    // The list view consumes only scalar budget fields; lineItems are fetched
    // by the [id] detail route + server components with their own include.
    // Exact-shape assertion: re-adding `include: { lineItems }` makes the
    // actual arg a 5-key object → this exact-match fails.
    vi.mocked(database.eventBudget.findMany).mockResolvedValue([
      { id: "bg1" },
    ] as never);
    vi.mocked(database.eventBudget.count).mockResolvedValue(1);

    await GET(new Request("http://x/api/events/budgets?page=1&limit=10"));

    expect(database.eventBudget.findMany).toHaveBeenCalledWith({
      where: expect.any(Object),
      orderBy: [{ createdAt: "desc" }],
      take: 10,
      skip: 0,
    });
  });

  it("returns the budget-list shape with correct totalPages math", async () => {
    vi.mocked(database.eventBudget.findMany).mockResolvedValue([
      { id: "bg1" },
      { id: "bg2" },
    ] as never);
    vi.mocked(database.eventBudget.count).mockResolvedValue(25);

    const res = await GET(
      new Request("http://x/api/events/budgets?page=2&limit=10")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.budgets).toHaveLength(2);
    expect(body.total).toBe(25);
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.totalPages).toBe(3);
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request("http://x/api/events/budgets"));
    expect(res.status).toBe(401);
    expect(database.eventBudget.findMany).not.toHaveBeenCalled();
    expect(database.eventBudget.count).not.toHaveBeenCalled();
  });
});
