/**
 * Inventory Audit Discrepancies list API tests.
 *
 * Covers GET /api/inventory/audit/discrepancies — the variance-report list with
 * filtering + pagination. Pins the count+page-read parallelization (#23) plus the
 * basic happy/empty/auth paths. This route previously had NO test (the only
 * sibling suite, discrepancy-resolve-stock-adjustment.test.ts, covers POST /resolve).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tenant: vi.fn(),
  varianceCount: vi.fn(),
  varianceFindMany: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
}));
vi.mock("@repo/database", () => ({
  database: {
    varianceReport: {
      count: mocks.varianceCount,
      findMany: mocks.varianceFindMany,
    },
  },
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));
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

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000700";
const TEST_ORG_ID = "org_audit_disc";
const TEST_USER_ID = "user_audit_disc";

function makeGET(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe("GET /api/inventory/audit/discrepancies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: TEST_USER_ID,
    });
    mocks.tenant.mockResolvedValue(TEST_TENANT_ID);
    mocks.varianceCount.mockResolvedValue(0);
    mocks.varianceFindMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValue({ orgId: null, userId: null });
    const { GET } = await import(
      "@/app/api/inventory/audit/discrepancies/route"
    );
    const res = await GET(makeGET("/api/inventory/audit/discrepancies"));
    expect(res.status).toBe(401);
    expect(mocks.varianceCount).not.toHaveBeenCalled();
  });

  it("returns paginated empty result with default pagination", async () => {
    const { GET } = await import(
      "@/app/api/inventory/audit/discrepancies/route"
    );
    const res = await GET(makeGET("/api/inventory/audit/discrepancies"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.discrepancies).toEqual([]);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0,
      hasMore: false,
    });
  });

  it("runs count and findMany concurrently (Promise.all), not serially", async () => {
    // The main count stays pending until released; the page read (findMany) must
    // fire WHILE count is still pending — impossible in the old serial layout,
    // where findMany ran only after count resolved.
    let releaseCount!: () => void;
    mocks.varianceCount.mockReturnValue(
      new Promise<number>((resolve) => {
        releaseCount = () => resolve(0);
      })
    );
    mocks.varianceFindMany.mockResolvedValue([]);

    const { GET } = await import(
      "@/app/api/inventory/audit/discrepancies/route"
    );
    const pending = GET(makeGET("/api/inventory/audit/discrepancies"));
    // Flush auth/tenant awaits so the route reaches the Promise.all batch.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.varianceFindMany).toHaveBeenCalledTimes(1);
    releaseCount();
    await pending;
  });
});
