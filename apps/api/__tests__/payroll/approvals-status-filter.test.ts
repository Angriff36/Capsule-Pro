/**
 * GET /api/payroll/approvals — status filter must include "processing".
 *
 * Why this matters: the governed payroll write path (ManifestPayrollDataSource:
 * PayrollRun.create -> PayrollRun.process) leaves a freshly generated run in the
 * IR state "processing". The approvals queue used to filter for
 * (pending | completed | approved), so governed runs awaiting approval were
 * INVISIBLE to the queue — a manager could never approve them.
 *
 * "completed" is a legacy, non-IR status; it is kept in the filter for backward
 * compatibility with any pre-existing rows, but "processing" MUST be present so
 * governed-path runs surface. These tests pin that the composed SQL filters on
 * "processing" in both the count and the listing queries.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDatabase, mockAuth, mockRequireApiManager, mockGetTenantIdForOrg } =
  vi.hoisted(() => ({
    mockDatabase: { $queryRaw: vi.fn() },
    mockAuth: vi.fn(),
    mockRequireApiManager: vi.fn(),
    mockGetTenantIdForOrg: vi.fn(),
  }));

// Prisma.sql here joins the STATIC template fragments (interpolated values are
// parameterised away), so the literal status fragments we care about appear
// verbatim in the captured string — exactly what we want to assert on.
vi.mock("@repo/database", () => ({
  database: mockDatabase,
  Prisma: {
    sql: (s: TemplateStringsArray, ..._args: unknown[]) => s.join(""),
    empty: "",
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: mockAuth }));
vi.mock("@/app/lib/auth-roles", () => ({
  requireApiManager: mockRequireApiManager,
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mockGetTenantIdForOrg,
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const TENANT = "00000000-0000-0000-0000-000000000002";

function makeRequest(): Request {
  return new Request("http://localhost/api/payroll/approvals?page=1&limit=20");
}

describe("GET /api/payroll/approvals — status filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ orgId: "org-1" });
    mockRequireApiManager.mockResolvedValue({ ok: true });
    mockGetTenantIdForOrg.mockResolvedValue(TENANT);
  });

  it("includes 'processing' (governed runs) and retains 'completed' (legacy) in both queries", async () => {
    // 1st $queryRaw = count, 2nd = the runs listing.
    mockDatabase.$queryRaw
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/payroll/approvals/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(mockDatabase.$queryRaw).toHaveBeenCalledTimes(2);

    const countSql = String(mockDatabase.$queryRaw.mock.calls[0][0]);
    const runsSql = String(mockDatabase.$queryRaw.mock.calls[1][0]);

    // The bug fix: governed "processing" runs must be in the filter.
    expect(countSql).toContain("status = 'processing'");
    expect(runsSql).toContain("pr.status = 'processing'");

    // Backward-compatible: legacy "completed" rows still surface.
    expect(countSql).toContain("status = 'completed'");
    expect(runsSql).toContain("pr.status = 'completed'");
  });
});
