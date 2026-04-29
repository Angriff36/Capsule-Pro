/**
 * Payroll Runs API Integration Tests
 *
 * Tests verify the payroll runs list and detail endpoints
 * with authentication, authorization, and error handling.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listRuns } from "@/app/api/payroll/runs/list/route";
import { GET as getRun } from "@/app/api/payroll/runs/[id]/route";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000002";
const TEST_USER_ID = "user_payroll_runs";
const TEST_ORG_ID = "org_payroll_runs";

function createMockRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "run-001",
    tenant_id: TEST_TENANT_ID,
    period_id: "period-001",
    status: "pending",
    total_gross: 15000.0,
    total_deductions: 3500.0,
    total_net: 11500.0,
    employee_count: 10,
    processed_at: null,
    created_at: new Date("2026-01-15"),
    updated_at: new Date("2026-01-15"),
    deleted_at: null,
    ...overrides,
  };
}

describe("Payroll Runs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------ LIST
  describe("GET /api/payroll/runs/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest("http://localhost/api/payroll/runs/list");
      const response = await listRuns(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest("http://localhost/api/payroll/runs/list");
      const response = await listRuns(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return payroll runs for authenticated user", async () => {
      const mockRuns = [
        createMockRun({ id: "run-1", status: "completed" }),
        createMockRun({ id: "run-2", status: "pending" }),
      ];

      vi.mocked(database.payroll_runs.findMany).mockResolvedValue(
        mockRuns as never
      );

      const request = new NextRequest("http://localhost/api/payroll/runs/list");
      const response = await listRuns(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.payrollRuns).toHaveLength(2);
    });

    it("should filter by tenant_id and exclude soft-deleted", async () => {
      vi.mocked(database.payroll_runs.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest("http://localhost/api/payroll/runs/list");
      await listRuns(request);

      expect(database.payroll_runs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        })
      );
    });

    it("should order results by created_at descending", async () => {
      vi.mocked(database.payroll_runs.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest("http://localhost/api/payroll/runs/list");
      await listRuns(request);

      expect(database.payroll_runs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.payroll_runs.findMany).mockRejectedValue(
        new Error("Connection timeout")
      );

      const request = new NextRequest("http://localhost/api/payroll/runs/list");
      const response = await listRuns(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("should return empty array when no runs exist", async () => {
      vi.mocked(database.payroll_runs.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest("http://localhost/api/payroll/runs/list");
      const response = await listRuns(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.payrollRuns).toEqual([]);
    });
  });

  // ------------------------------------------------------------------ DETAIL
  describe("GET /api/payroll/runs/[id]", () => {
    it("should return a single payroll run by ID", async () => {
      const mockRun = createMockRun({
        id: "run-001",
        status: "completed",
        total_net: 11500.0,
      });

      vi.mocked(database.payroll_runs.findFirst).mockResolvedValue(
        mockRun as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/runs/run-001"
      );
      const response = await getRun(request, {
        params: Promise.resolve({ id: "run-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.payrollRun.id).toBe("run-001");
      expect(body.payrollRun.status).toBe("completed");
    });

    it("should return 404 when run not found", async () => {
      vi.mocked(database.payroll_runs.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/runs/nonexistent"
      );
      const response = await getRun(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("PayrollRun not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      vi.mocked(database.payroll_runs.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/runs/run-001"
      );
      await getRun(request, {
        params: Promise.resolve({ id: "run-001" }),
      });

      expect(database.payroll_runs.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "run-001",
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        })
      );
    });

    it("should not return soft-deleted runs", async () => {
      vi.mocked(database.payroll_runs.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/runs/deleted-run"
      );
      const response = await getRun(request, {
        params: Promise.resolve({ id: "deleted-run" }),
      });

      // findFirst returns null because deleted_at filter excludes it
      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/payroll/runs/run-001"
      );
      const response = await getRun(request, {
        params: Promise.resolve({ id: "run-001" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.payroll_runs.findFirst).mockRejectedValue(
        new Error("DB error")
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/runs/run-001"
      );
      const response = await getRun(request, {
        params: Promise.resolve({ id: "run-001" }),
      });

      expect(response.status).toBe(500);
    });
  });
});
