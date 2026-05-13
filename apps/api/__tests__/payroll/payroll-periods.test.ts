/**
 * Payroll Periods API Integration Tests
 *
 * Tests verify the payroll periods list, detail, and create endpoints
 * with authentication, authorization, and error handling.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getPeriod } from "@/app/api/payroll/periods/[id]/route";
import { POST as createPeriod } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { GET as listPeriods } from "@/app/api/payroll/periods/list/route";

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "user_payroll_test";
const TEST_ORG_ID = "org_payroll_test";

function createMockPeriod(overrides: Record<string, unknown> = {}) {
  return {
    id: "period-001",
    tenant_id: TEST_TENANT_ID,
    name: "Bi-Weekly Period 1",
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-01-14"),
    pay_date: new Date("2026-01-20"),
    status: "open",
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    deleted_at: null,
    ...overrides,
  };
}

describe("Payroll Periods API", () => {
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
  describe("GET /api/payroll/periods/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/list"
      );
      const response = await listPeriods(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/list"
      );
      const response = await listPeriods(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return payroll periods for authenticated user", async () => {
      const mockPeriods = [
        createMockPeriod({ id: "period-1", name: "Period Jan 1-14" }),
        createMockPeriod({
          id: "period-2",
          name: "Period Jan 15-31",
          start_date: new Date("2026-01-15"),
          end_date: new Date("2026-01-31"),
        }),
      ];

      vi.mocked(database.payroll_periods.findMany).mockResolvedValue(
        mockPeriods as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/list"
      );
      const response = await listPeriods(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.payrollPeriods).toHaveLength(2);
    });

    it("should filter by tenant_id and exclude soft-deleted", async () => {
      vi.mocked(database.payroll_periods.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/list"
      );
      await listPeriods(request);

      expect(database.payroll_periods.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        })
      );
    });

    it("should order results by created_at descending", async () => {
      vi.mocked(database.payroll_periods.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/list"
      );
      await listPeriods(request);

      expect(database.payroll_periods.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.payroll_periods.findMany).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/list"
      );
      const response = await listPeriods(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ------------------------------------------------------------------ DETAIL
  describe("GET /api/payroll/periods/[id]", () => {
    it("should return a single payroll period by ID", async () => {
      const mockPeriod = createMockPeriod({ id: "period-001" });

      vi.mocked(database.payroll_periods.findFirst).mockResolvedValue(
        mockPeriod as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/period-001"
      );
      const response = await getPeriod(request, {
        params: Promise.resolve({ id: "period-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.payrollPeriod.id).toBe("period-001");
    });

    it("should return 404 when period not found", async () => {
      vi.mocked(database.payroll_periods.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/nonexistent"
      );
      const response = await getPeriod(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("PayrollPeriod not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      vi.mocked(database.payroll_periods.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/period-001"
      );
      await getPeriod(request, {
        params: Promise.resolve({ id: "period-001" }),
      });

      expect(database.payroll_periods.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "period-001",
            tenant_id: TEST_TENANT_ID,
            deleted_at: null,
          },
        })
      );
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/payroll/periods/period-001"
      );
      const response = await getPeriod(request, {
        params: Promise.resolve({ id: "period-001" }),
      });

      expect(response.status).toBe(401);
    });
  });

  // ------------------------------------------------------------------ CREATE
  describe("POST /api/payroll/periods/commands/create", () => {
    const mockRunCommand = vi.fn();

    beforeEach(() => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as never);

      // Mock user lookup for create route
      vi.mocked(database.user.findFirst).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        authUserId: "clerk-123",
      } as never);
    });

    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Test Period",
            start_date: "2026-02-01",
            end_date: "2026-02-14",
          }),
        }
      );
      const response = await createPeriod(request, { params: Promise.resolve({ entity: "PayrollPeriod", command: "create" }) });

      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Test Period",
            start_date: "2026-02-01",
            end_date: "2026-02-14",
          }),
        }
      );
      const response = await createPeriod(request, { params: Promise.resolve({ entity: "PayrollPeriod", command: "create" }) });

      expect(response.status).toBe(400);
    });

    it("should create a period through manifest runtime", async () => {
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "period-new" },
        emittedEvents: [],
      });

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Bi-Weekly Period",
            start_date: "2026-02-01",
            end_date: "2026-02-14",
            pay_date: "2026-02-20",
          }),
        }
      );
      const response = await createPeriod(request, { params: Promise.resolve({ entity: "PayrollPeriod", command: "create" }) });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result).toEqual({ id: "period-new" });

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({ name: "Bi-Weekly Period" }),
        { entityName: "PayrollPeriod" }
      );
    });

    it("should return 403 on policy denial", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: { policyName: "AdminOnlyPolicy" },
      });

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Unauthorized Period" }),
        }
      );
      const response = await createPeriod(request, { params: Promise.resolve({ entity: "PayrollPeriod", command: "create" }) });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("AdminOnlyPolicy");
    });

    it("should return 422 on guard failure", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "end_date must be after start_date",
        },
      });

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Bad Period",
            start_date: "2026-02-14",
            end_date: "2026-02-01",
          }),
        }
      );
      const response = await createPeriod(request, { params: Promise.resolve({ entity: "PayrollPeriod", command: "create" }) });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.message).toContain("Guard 0 failed");
    });

    it("should return 400 when command fails without policy/guard", async () => {
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Invalid period data",
      });

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const response = await createPeriod(request, { params: Promise.resolve({ entity: "PayrollPeriod", command: "create" }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Invalid period data");
    });

    it("should return 500 on unexpected error", async () => {
      mockRunCommand.mockRejectedValue(new Error("Runtime crash"));

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Crash Period" }),
        }
      );
      const response = await createPeriod(request, { params: Promise.resolve({ entity: "PayrollPeriod", command: "create" }) });

      expect(response.status).toBe(500);
    });

    it("should return 400 when user not found in database", async () => {
      vi.mocked(database.user.findFirst).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Orphan User Period" }),
        }
      );
      const response = await createPeriod(request, { params: Promise.resolve({ entity: "PayrollPeriod", command: "create" }) });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("User not found in database");
    });
  });
});
