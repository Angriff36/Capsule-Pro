/**
 * GET /api/reactions-log/list — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially.
 *
 * CRITICAL: this route uses `analyticsDatabase` (not `database`) imported from
 * `@/lib/database` which re-exports from `@repo/database`.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  analyticsDatabase: {
    reactionLog: { findMany: vi.fn(), count: vi.fn() },
  },
  database: {},
}));
vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      ),
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});

import { auth } from "@repo/auth/server";
import { GET } from "@/app/api/reactions-log/list/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { analyticsDatabase } from "@/lib/database";

describe("GET /api/reactions-log/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: "user_test",
      orgId: "org_test",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("runs findMany + count concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(analyticsDatabase.reactionLog.findMany).mockReturnValue(
      pending as never
    );
    vi.mocked(analyticsDatabase.reactionLog.count).mockResolvedValue(15);

    const p = GET(
      new NextRequest("http://x/api/reactions-log/list?limit=10&offset=0")
    );

    await vi.waitFor(() => {
      expect(analyticsDatabase.reactionLog.findMany).toHaveBeenCalledTimes(1);
    });

    expect(analyticsDatabase.reactionLog.count).toHaveBeenCalledTimes(1);
    expect(analyticsDatabase.reactionLog.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: "tenant_test" }),
    });

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the response shape with hasMore and totalCount", async () => {
    vi.mocked(analyticsDatabase.reactionLog.findMany).mockResolvedValue([
      { id: "log_1", tenantId: "tenant_test" },
    ] as never);
    vi.mocked(analyticsDatabase.reactionLog.count).mockResolvedValue(50);

    const res = await GET(
      new NextRequest("http://x/api/reactions-log/list?limit=10&offset=0")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.logs).toHaveLength(1);
    expect(body.totalCount).toBe(50);
    expect(body.hasMore).toBe(true);
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      orgId: null,
    } as never);
    const res = await GET(new NextRequest("http://x/api/reactions-log/list"));
    expect(res.status).toBe(401);
    expect(analyticsDatabase.reactionLog.findMany).not.toHaveBeenCalled();
    expect(analyticsDatabase.reactionLog.count).not.toHaveBeenCalled();
  });
});
