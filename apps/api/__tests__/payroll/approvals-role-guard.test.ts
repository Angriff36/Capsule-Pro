/**
 * Payroll approval PUT role-guard tests (P1.AM).
 *
 * Why this matters: PUT /api/payroll/approvals/[approvalId] mutates payroll
 * run state (approve / reject) and writes an immutable approval-history row.
 * Before P1.AM, the only gate was `auth().orgId` — any authenticated user in
 * the tenant (incl. a staff-role workflow user) could mark a payroll run
 * approved, releasing money. These tests pin:
 *   - staff role → 403, no DB write
 *   - manager role → handler proceeds past the guard
 *   - missing session → 401, no DB write
 *
 * The "manager role proceeds" case stops at the approval lookup so we do not
 * need to scaffold the full payroll history; the assertion is that the guard
 * does NOT short-circuit a permitted role.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDatabase } = vi.hoisted(() => ({
  mockDatabase: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@repo/database", () => ({
  database: mockDatabase,
  Prisma: { sql: (s: TemplateStringsArray, ..._args: unknown[]) => s.join("") },
}));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { requireCurrentUser } from "@/app/lib/tenant";
import { InvariantError } from "@/app/lib/invariant";

const APPROVAL_ID = "a1111111-1111-4111-a111-111111111111";
const TENANT = "tenant-1";

const baseUser = {
  id: "user-1",
  tenantId: TENANT,
  email: "u@e.com",
  firstName: "U",
  lastName: "E",
};

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/payroll/approvals/${APPROVAL_ID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const routeContext = {
  params: Promise.resolve({ approvalId: APPROVAL_ID }),
};

describe("PUT /api/payroll/approvals/[approvalId] — role guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDatabase.$queryRaw.mockReset();
  });

  it("returns 403 for staff role and never queries the approval table", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({
      ...baseUser,
      role: "staff",
    });

    const { PUT } = await import(
      "@/app/api/payroll/approvals/[approvalId]/route"
    );
    const res = await PUT(makeRequest({ status: "approved" }), routeContext);

    expect(res.status).toBe(403);
    expect(mockDatabase.$queryRaw).not.toHaveBeenCalled();
  });

  it("returns 401 when no session can be resolved", async () => {
    vi.mocked(requireCurrentUser).mockRejectedValue(
      new InvariantError("Unauthorized")
    );

    const { PUT } = await import(
      "@/app/api/payroll/approvals/[approvalId]/route"
    );
    const res = await PUT(makeRequest({ status: "approved" }), routeContext);

    expect(res.status).toBe(401);
    expect(mockDatabase.$queryRaw).not.toHaveBeenCalled();
  });

  it("admits a manager and proceeds to the approval lookup (404 path)", async () => {
    vi.mocked(requireCurrentUser).mockResolvedValue({
      ...baseUser,
      role: "finance_manager",
    });
    // Approval not found — proves the guard let us through to the lookup.
    mockDatabase.$queryRaw.mockResolvedValueOnce([]);

    const { PUT } = await import(
      "@/app/api/payroll/approvals/[approvalId]/route"
    );
    const res = await PUT(makeRequest({ status: "approved" }), routeContext);

    expect(res.status).toBe(404);
    expect(mockDatabase.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
