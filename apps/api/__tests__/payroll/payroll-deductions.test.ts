/**
 * Payroll Employee Deductions API Integration Tests
 *
 * Tests verify the employee deductions list and detail endpoints
 * with authentication, authorization, tenant isolation, and error handling.
 */

import { database } from "@/lib/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getDeduction } from "@/app/api/payroll/deductions/[id]/route";
import { GET as listDeductions } from "@/app/api/payroll/deductions/list/route";

const { mockDatabase } = vi.hoisted(() => ({
  mockDatabase: {
    employeeDeduction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

// Mock dependencies
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: mockDatabase,
}));
vi.mock("@/lib/database", () => ({
  database: mockDatabase,
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000003";
const TEST_USER_ID = "user_deduction_test";
const TEST_ORG_ID = "org_deduction_test";

function createMockDeduction(overrides: Record<string, unknown> = {}) {
  return {
    id: "deduction-001",
    tenant_id: TEST_TENANT_ID,
    employee_id: "emp-001",
    name: "Federal Tax",
    type: "tax",
    amount: 500.0,
    percentage: null,
    is_recurring: true,
    effective_start: new Date("2026-01-01"),
    effective_end: null,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    deleted_at: null,
    ...overrides,
  };
}

describe("Employee Deductions API", () => {
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
  describe("GET /api/payroll/deductions/list", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/list"
      );
      const response = await listDeductions(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/list"
      );
      const response = await listDeductions(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Tenant not found");
    });

    it("should return deductions for authenticated user", async () => {
      const mockDeductions = [
        createMockDeduction({
          id: "ded-1",
          name: "Federal Tax",
          type: "tax",
        }),
        createMockDeduction({
          id: "ded-2",
          name: "Health Insurance",
          type: "benefit",
        }),
      ];

      vi.mocked(database.employeeDeduction.findMany).mockResolvedValue(
        mockDeductions as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/list"
      );
      const response = await listDeductions(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.employeeDeductions).toHaveLength(2);
    });

    it("should filter by tenant_id and exclude soft-deleted", async () => {
      vi.mocked(database.employeeDeduction.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/list"
      );
      await listDeductions(request);

      expect(database.employeeDeduction.findMany).toHaveBeenCalled();
      const call = vi.mocked(database.employeeDeduction.findMany).mock.calls[0]?.[0];
      expect(call?.where?.tenantId).toBe(TEST_TENANT_ID);
      expect(call?.where?.deletedAt).toBe(null);
    });

    it("should order by created_at descending", async () => {
      vi.mocked(database.employeeDeduction.findMany).mockResolvedValue(
        [] as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/list"
      );
      await listDeductions(request);

      expect(database.employeeDeduction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { created_at: "desc" },
        })
      );
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.employeeDeduction.findMany).mockRejectedValue(
        new Error("Connection pool exhausted")
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/list"
      );
      const response = await listDeductions(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ------------------------------------------------------------------ DETAIL
  describe("GET /api/payroll/deductions/[id]", () => {
    it("should return a single deduction by ID", async () => {
      const mockDeduction = createMockDeduction({
        id: "deduction-001",
        name: "401k Contribution",
        type: "retirement",
        percentage: 5.0,
      });

      vi.mocked(database.employeeDeduction.findFirst).mockResolvedValue(
        mockDeduction as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/deduction-001"
      );
      const response = await getDeduction(request, {
        params: Promise.resolve({ id: "deduction-001" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.employeeDeduction.id).toBe("deduction-001");
      expect(body.employeeDeduction.name).toBe("401k Contribution");
    });

    it("should return 404 when deduction not found", async () => {
      vi.mocked(database.employeeDeduction.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/nonexistent"
      );
      const response = await getDeduction(request, {
        params: Promise.resolve({ id: "nonexistent" }),
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("EmployeeDeduction not found");
    });

    it("should enforce tenant isolation on detail queries", async () => {
      vi.mocked(database.employeeDeduction.findFirst).mockResolvedValue(
        null as never
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/deduction-001"
      );
      await getDeduction(request, {
        params: Promise.resolve({ id: "deduction-001" }),
      });

      expect(database.employeeDeduction.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "deduction-001",
            tenant_id: TEST_TENANT_ID,
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
        "http://localhost/api/payroll/deductions/deduction-001"
      );
      const response = await getDeduction(request, {
        params: Promise.resolve({ id: "deduction-001" }),
      });

      expect(response.status).toBe(401);
    });

    it("should return 500 on database error", async () => {
      vi.mocked(database.employeeDeduction.findFirst).mockRejectedValue(
        new Error("Unexpected error")
      );

      const request = new NextRequest(
        "http://localhost/api/payroll/deductions/deduction-001"
      );
      const response = await getDeduction(request, {
        params: Promise.resolve({ id: "deduction-001" }),
      });

      expect(response.status).toBe(500);
    });
  });
});
