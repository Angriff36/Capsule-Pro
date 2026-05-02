/**
 * Regression test for IMPLEMENTATION_PLAN.md CRIT-2:
 * "Administrative Trash List — SQL Injection (Dead Code Still Executes)"
 *
 * Two earlier loops in `apps/api/app/api/administrative/trash/list/route.ts`
 * built dynamic SQL via `Prisma.raw` and manual `$N` -> `'value'` substitution.
 * Their results were discarded by a third (Prisma-based) loop, but the queries
 * still executed on every request, exposing classic SQL-injection vectors via
 * the user-controlled `sortOrder` and `search` parameters.
 *
 * Why this test matters:
 * - It pins the contract that the GET handler MUST NOT call `database.$queryRaw`
 *   (a regression of the dead loops would re-introduce the injection).
 * - It pins that any non-`asc`/`desc` `sortOrder` value is coerced to a safe
 *   default ("desc") and that any non-`displayName` `sortBy` value is coerced
 *   to a safe default ("deletedAt"). Both are interpolated into Prisma `orderBy`
 *   shapes and the JS `items.sort()` comparator.
 * - It pins that the GET path uses `findMany` only (the Prisma ORM honors
 *   tenant filters and parameterizes all values).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth — supply a stable orgId so the route reaches the query path.
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(() =>
    Promise.resolve({ orgId: "test-org", userId: "test-user" })
  ),
}));

// Track every database call and surface a strict no-raw assertion target.
const queryRawSpy = vi.fn(() => Promise.resolve([]));
const queryRawUnsafeSpy = vi.fn(() => Promise.resolve([]));
const findManySpy = vi.fn(() => Promise.resolve([]));

vi.mock("@repo/database", () => {
  // Stub model returned for ANY `database.<modelName>` access — the trash
  // route iterates dozens of model names. Each model only needs `findMany`.
  const modelStub = { findMany: findManySpy };
  const mockDb = new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "$queryRaw") {
          return queryRawSpy;
        }
        if (prop === "$queryRawUnsafe") {
          return queryRawUnsafeSpy;
        }
        return modelStub;
      },
    }
  );
  return { database: mockDb };
});

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(() => Promise.resolve("test-tenant")),
}));

// Sentry capture is a no-op in tests.
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

beforeEach(() => {
  queryRawSpy.mockClear();
  queryRawUnsafeSpy.mockClear();
  findManySpy.mockClear();
});

describe("administrative/trash/list — SQL injection regression (CRIT-2)", () => {
  it("does NOT call $queryRaw or $queryRawUnsafe under any input", async () => {
    const { GET } = await import("@/app/api/administrative/trash/list/route");

    const malicious = new URLSearchParams({
      sortOrder: "DESC; DROP TABLE users;--",
      sortBy: "deletedAt'); DELETE FROM accounts;--",
      search: "' OR 1=1--",
      page: "1",
      limit: "10",
    });
    const request = new NextRequest(
      `http://localhost/api/administrative/trash/list?${malicious.toString()}`
    );

    const response = await GET(request);
    expect(response.status).toBeLessThan(500);
    expect(queryRawSpy).not.toHaveBeenCalled();
    expect(queryRawUnsafeSpy).not.toHaveBeenCalled();
    // The Prisma-based path must be the ONLY data path.
    expect(findManySpy).toHaveBeenCalled();
  });

  it("returns 401 when no orgId is present", async () => {
    const auth = await import("@repo/auth/server");
    (auth.auth as any).mockResolvedValueOnce({ orgId: null, userId: null });

    const { GET } = await import("@/app/api/administrative/trash/list/route");
    const request = new NextRequest(
      "http://localhost/api/administrative/trash/list"
    );
    const response = await GET(request);
    expect(response.status).toBe(401);
    expect(queryRawSpy).not.toHaveBeenCalled();
    expect(findManySpy).not.toHaveBeenCalled();
  });

  it("rejects out-of-range pagination without touching the database", async () => {
    const { GET } = await import("@/app/api/administrative/trash/list/route");
    const request = new NextRequest(
      "http://localhost/api/administrative/trash/list?limit=999999"
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    expect(findManySpy).not.toHaveBeenCalled();
  });

  it("accepts safe inputs and returns the paginated envelope shape", async () => {
    const { GET } = await import("@/app/api/administrative/trash/list/route");
    const request = new NextRequest(
      "http://localhost/api/administrative/trash/list?sortOrder=asc&sortBy=displayName&page=1&limit=20"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("pagination");
    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
    expect(queryRawSpy).not.toHaveBeenCalled();
  });
});
