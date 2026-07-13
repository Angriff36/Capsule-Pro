/**
 * GET /api/staff/performance/list — regression guard for the #26 `select`
 * projection.
 *
 * Before the fix, `performanceReview.findMany` pulled every PerformanceReview
 * column per row, then the shape map read only a subset. These tests pin the
 * projection (the findMany call MUST carry a `select` of exactly the shipped
 * fields, dropping tenantId/deletedAt/employeeAcknowledgedAt/updatedAt) and the
 * response shape (batched name join + the null placeholder columns the schema
 * no longer models).
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database", () => ({
  database: {
    performanceReview: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@/lib/database");

import { GET } from "@/app/api/staff/performance/list/route";

const PR_TENANT_ID = "00000000-0000-0000-0000-000000000072";
const PR_ORG_ID = "org_staff_performance";

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: PR_ORG_ID,
    userId: "u-reviewer",
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(PR_TENANT_ID);
}

function makeRequest(query = ""): NextRequest {
  return new NextRequest(
    new URL(`/api/staff/performance/list${query}`, "http://localhost:3000")
  );
}

describe("GET /api/staff/performance/list", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthed();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns 401 before any DB read when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(database.performanceReview.findMany).not.toHaveBeenCalled();
  });

  it("projects only the shipped fields, dropping unused columns (#26)", async () => {
    vi.mocked(database.performanceReview.findMany).mockResolvedValue([
      {
        id: "rev-1",
        employeeId: "u-emp",
        reviewerId: "u-rev",
        reviewType: "annual",
        scheduledDate: new Date("2026-03-01"),
        completedDate: null,
        status: "completed",
        rating: 4.5,
        strengths: "Clear communicator",
        createdAt: new Date("2026-02-01"),
      },
    ] as never);
    vi.mocked(database.user.findMany).mockResolvedValue([
      { id: "u-emp", firstName: "Grace", lastName: "Hopper" },
      { id: "u-rev", firstName: "Alan", lastName: "Turing" },
    ] as never);

    const res = await GET(makeRequest("?status=completed"));
    expect(res.status).toBe(200);

    const select = vi.mocked(database.performanceReview.findMany).mock
      .calls.at(-1)?.[0]?.select;
    if (!select) throw new Error("findMany called without a select projection");
    for (const field of [
      "id",
      "employeeId",
      "reviewerId",
      "reviewType",
      "scheduledDate",
      "completedDate",
      "status",
      "rating",
      "strengths",
      "createdAt",
    ]) {
      expect(select).toHaveProperty(field, true);
    }
    for (const dropped of [
      "tenantId",
      "deletedAt",
      "employeeAcknowledgedAt",
      "updatedAt",
    ]) {
      expect(select).not.toHaveProperty(dropped);
    }

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0]).toMatchObject({
      id: "rev-1",
      status: "completed",
      rating: 4.5,
      strengths: "Clear communicator",
      employee_name: "Grace Hopper",
      reviewer_name: "Alan Turing",
      // Columns the truthful schema no longer models — pinned as null.
      areas_for_improvement: null,
      manager_comments: null,
    });
  });

  it("returns an empty reviews list without joining users when none match", async () => {
    vi.mocked(database.performanceReview.findMany).mockResolvedValue([]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(database.user.findMany).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.reviews).toEqual([]);
  });
});
