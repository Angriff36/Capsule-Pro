/**
 * EventBudget Command Route Tests
 *
 * Tests the four auto-generated manifest command handlers:
 *   POST /api/eventbudget/create
 *   POST /api/eventbudget/update
 *   POST /api/eventbudget/approve
 *   POST /api/eventbudget/finalize
 *
 * Covers:
 *   - Auth: 401 for unauthenticated, 400 for missing tenant
 *   - Successful command execution via manifest runtime
 *   - Policy denial (403), guard failure (422), generic command failure (400)
 *   - Internal server error when runtime throws
 *   - Tenant isolation: runtime receives correct tenantId
 *   - Response shape: { success: true/false, ... }
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

// Mock tenant
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));

// Mock manifest runtime
const mockRunCommand = vi.fn();
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(() =>
    Promise.resolve({ runCommand: mockRunCommand })
  ),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Import mocked modules
import { auth } from "@repo/auth/server";
import { POST as approvePOST } from "@/app/api/eventbudget/approve/route";
// Import route handlers
import { POST as createPOST } from "@/app/api/eventbudget/create/route";
import { POST as finalizePOST } from "@/app/api/eventbudget/finalize/route";
import { POST as updatePOST } from "@/app/api/eventbudget/update/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Test constants
const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test_budget";
const TEST_ORG_ID = "org_test_budget";
const TEST_EVENT_ID = "b0000000-0000-4000-b000-000000000010";
const TEST_BUDGET_ID = "c0000000-0000-4000-c000-000000000001";

// Helper to create a NextRequest with JSON body
function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

// Shared auth setup helper
function setupAuth() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

describe("EventBudget Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // ------------------------------------------------------------------ //
  // CREATE                                                              //
  // ------------------------------------------------------------------ //
  describe("POST /api/eventbudget/create", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("should return 400 when tenant is not found for org", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Tenant not found");
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("should create budget and return 200 with result on success", async () => {
      setupAuth();

      const budgetResult = {
        id: TEST_BUDGET_ID,
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        version: 1,
        status: "draft",
        totalBudgetAmount: 5000,
      };

      mockRunCommand.mockResolvedValue({
        success: true,
        result: budgetResult,
        emittedEvents: [{ type: "EventBudgetCreated", data: budgetResult }],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({
            eventId: TEST_EVENT_ID,
            totalBudgetAmount: 5000,
            status: "draft",
            notes: "Q4 event budget",
            lineItems: [
              {
                category: "food",
                name: "Catering",
                budgetedAmount: 2000,
              },
            ],
          }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.id).toBe(TEST_BUDGET_ID);
      expect(data.result.status).toBe("draft");
      expect(data.events).toHaveLength(1);

      // Verify runtime was called with correct entity and user context
      expect(vi.mocked(createManifestRuntime)).toHaveBeenCalledWith({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.objectContaining({
          eventId: TEST_EVENT_ID,
          totalBudgetAmount: 5000,
        }),
        { entityName: "EventBudget" }
      );
    });

    it("should return 403 on policy denial", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: {
          policyName: "BudgetManagerOnly",
          formatted: "User is not a budget manager",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("BudgetManagerOnly");
    });

    it("should return 422 on guard failure", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Event must be in draft status to create a budget",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 0 failed");
      expect(data.message).toContain("draft status");
    });

    it("should return 400 on generic command failure", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Budget already exists for this event",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Budget already exists for this event");
    });

    it("should return 500 when runtime throws an exception", async () => {
      setupAuth();

      mockRunCommand.mockRejectedValue(new Error("Database connection lost"));

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Error executing EventBudget.create:",
        expect.any(Error)
      );
    });
  });

  // ------------------------------------------------------------------ //
  // UPDATE                                                              //
  // ------------------------------------------------------------------ //
  describe("POST /api/eventbudget/update", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID, totalBudgetAmount: 7000 }),
        }
      );

      const response = await updatePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("should update budget and return 200 on success", async () => {
      setupAuth();

      const updatedResult = {
        id: TEST_BUDGET_ID,
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        version: 2,
        status: "draft",
        totalBudgetAmount: 7000,
        notes: "Revised budget",
      };

      mockRunCommand.mockResolvedValue({
        success: true,
        result: updatedResult,
        emittedEvents: [{ type: "EventBudgetUpdated", data: updatedResult }],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({
            id: TEST_BUDGET_ID,
            totalBudgetAmount: 7000,
            notes: "Revised budget",
          }),
        }
      );

      const response = await updatePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.totalBudgetAmount).toBe(7000);
      expect(data.result.version).toBe(2);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        expect.objectContaining({
          id: TEST_BUDGET_ID,
          totalBudgetAmount: 7000,
        }),
        { entityName: "EventBudget" }
      );
    });

    it("should pass tenant context to the runtime for tenant isolation", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_BUDGET_ID },
        emittedEvents: [],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID, notes: "Updated" }),
        }
      );

      await updatePOST(request);

      expect(vi.mocked(createManifestRuntime)).toHaveBeenCalledWith({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
    });

    it("should return 422 when guard prevents update of finalized budget", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 1,
          formatted: "Cannot update a finalized budget",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID, totalBudgetAmount: 9999 }),
        }
      );

      const response = await updatePOST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 1 failed");
      expect(data.message).toContain("finalized");
    });

    it("should return 500 when runtime throws during update", async () => {
      setupAuth();

      mockRunCommand.mockRejectedValue(new Error("Unexpected DB error"));

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await updatePOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Error executing EventBudget.update:",
        expect.any(Error)
      );
    });
  });

  // ------------------------------------------------------------------ //
  // APPROVE                                                             //
  // ------------------------------------------------------------------ //
  describe("POST /api/eventbudget/approve", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await approvePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("should approve budget and return 200 on success", async () => {
      setupAuth();

      const approvedResult = {
        id: TEST_BUDGET_ID,
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        status: "approved",
        approvedBy: TEST_USER_ID,
        approvedAt: new Date().toISOString(),
      };

      mockRunCommand.mockResolvedValue({
        success: true,
        result: approvedResult,
        emittedEvents: [{ type: "EventBudgetApproved", data: approvedResult }],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await approvePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe("approved");
      expect(data.result.approvedBy).toBe(TEST_USER_ID);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "approve",
        expect.objectContaining({ id: TEST_BUDGET_ID }),
        { entityName: "EventBudget" }
      );
    });

    it("should return 403 when user lacks approval permission", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: {
          policyName: "BudgetApproverRole",
          formatted: "User does not have budget approver role",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await approvePOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("BudgetApproverRole");
    });

    it("should return 422 when guard prevents approval of draft budget without line items", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Budget must have at least one line item before approval",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await approvePOST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 0 failed");
      expect(data.message).toContain("line item");
    });

    it("should return 400 when budget not found for approval", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Budget not found",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "nonexistent-id" }),
        }
      );

      const response = await approvePOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Budget not found");
    });

    it("should return 500 when runtime throws during approval", async () => {
      setupAuth();

      mockRunCommand.mockRejectedValue(new Error("Connection timeout"));

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await approvePOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Error executing EventBudget.approve:",
        expect.any(Error)
      );
    });
  });

  // ------------------------------------------------------------------ //
  // FINALIZE                                                            //
  // ------------------------------------------------------------------ //
  describe("POST /api/eventbudget/finalize", () => {
    it("should return 401 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await finalizePOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
      expect(mockRunCommand).not.toHaveBeenCalled();
    });

    it("should finalize budget and return 200 on success", async () => {
      setupAuth();

      const finalizedResult = {
        id: TEST_BUDGET_ID,
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        status: "finalized",
        finalizedBy: TEST_USER_ID,
        finalizedAt: new Date().toISOString(),
        totalActualAmount: 4800,
        varianceAmount: 200,
      };

      mockRunCommand.mockResolvedValue({
        success: true,
        result: finalizedResult,
        emittedEvents: [
          { type: "EventBudgetFinalized", data: finalizedResult },
        ],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await finalizePOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.status).toBe("finalized");
      expect(data.result.finalizedBy).toBe(TEST_USER_ID);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "finalize",
        expect.objectContaining({ id: TEST_BUDGET_ID }),
        { entityName: "EventBudget" }
      );
    });

    it("should pass tenant context to runtime for tenant isolation", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_BUDGET_ID, status: "finalized" },
        emittedEvents: [],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      await finalizePOST(request);

      expect(vi.mocked(createManifestRuntime)).toHaveBeenCalledWith({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
    });

    it("should return 403 when user lacks finalize permission", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: {
          policyName: "FinanceAdminOnly",
          formatted: "Only finance admins can finalize budgets",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await finalizePOST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("FinanceAdminOnly");
    });

    it("should return 422 when guard prevents finalizing non-approved budget", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Budget must be in approved status to finalize",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await finalizePOST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 0 failed");
      expect(data.message).toContain("approved status");
    });

    it("should return 500 when runtime throws during finalization", async () => {
      setupAuth();

      mockRunCommand.mockRejectedValue(new Error("Transaction deadlock"));

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      const response = await finalizePOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
      expect(console.error).toHaveBeenCalledWith(
        "Error executing EventBudget.finalize:",
        expect.any(Error)
      );
    });
  });

  // ------------------------------------------------------------------ //
  // CROSS-CUTTING: Response shape & error isolation                     //
  // ------------------------------------------------------------------ //
  describe("Response shape and error handling", () => {
    it("error responses should only contain success and message fields", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Some validation error",
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      const keys = Object.keys(data);
      expect(keys).toContain("success");
      expect(keys).toContain("message");
      expect(keys.length).toBe(2);
    });

    it("success responses should contain success, result, and events", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: TEST_BUDGET_ID, status: "draft" },
        emittedEvents: [{ type: "EventBudgetCreated" }],
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.result).toBeDefined();
      expect(data.events).toBeDefined();
    });

    it("should not log console.error for expected 4xx failures", async () => {
      setupAuth();

      // Policy denial should NOT trigger console.error
      mockRunCommand.mockResolvedValue({
        success: false,
        policyDenial: {
          policyName: "TestPolicy",
          formatted: "Denied",
        },
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );

      await approvePOST(request);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should handle malformed JSON body gracefully", async () => {
      setupAuth();

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: "not valid json {{{",
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      // JSON parse error is caught by try/catch, returns 500
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
    });

    it("should handle null error string with fallback message", async () => {
      setupAuth();

      mockRunCommand.mockResolvedValue({
        success: false,
        error: null,
      });

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );

      const response = await createPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Command failed");
    });
  });
});
