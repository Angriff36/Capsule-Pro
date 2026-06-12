/**
 * EventBudget Command Route Tests
 *
 * Tests the four manifest command handlers via the dispatcher:
 *   POST dispatch(EventBudget, "create")
 *   POST dispatch(EventBudget, "update")
 *   POST dispatch(EventBudget, "approve")
 *   POST dispatch(EventBudget, "finalize")
 *
 * Covers:
 *   - Auth: 401 for unauthenticated (InvariantError from requireCurrentUser)
 *   - Successful command execution via runManifestCommand
 *   - Policy denial (403), guard failure (422), generic command failure (400)
 *   - Internal server error when runtime throws (500)
 *   - Tenant isolation: tenantId passed in user context
 *   - Response shape: { success: true/false, ... }
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
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
    manifestErrorResponse: (
      message: string | { error: string; diagnostics?: unknown[] },
      status: number
    ) =>
      NextResponse.json(
        typeof message === "string"
          ? { success: false, message }
          : {
              success: false,
              error: message.error,
              diagnostics: message.diagnostics ?? [],
            },
        { status }
      ),
  };
});
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class InvariantError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      const err = new Error(message);
      err.name = "InvariantError";
      throw err;
    }
  },
}));

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const { requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

const approvePOST = dispatch("EventBudget", "approve");
const createPOST = dispatch("EventBudget", "create");
const finalizePOST = dispatch("EventBudget", "finalize");
const updatePOST = dispatch("EventBudget", "update");

// Test constants
const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test_budget";
const TEST_EVENT_ID = "b0000000-0000-4000-b000-000000000010";
const TEST_BUDGET_ID = "c0000000-0000-4000-c000-000000000001";

const TEST_CURRENT_USER = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

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

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function fail(status: number, message: string, diagnostics?: unknown[]) {
  return new Response(
    JSON.stringify({ success: false, message, diagnostics: diagnostics ?? [] }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

describe("EventBudget Command Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(TEST_CURRENT_USER as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      ok({ result: { id: "test-id" }, events: [] })
    );
  });

  // ------------------------------------------------------------------ CREATE
  describe("POST /api/eventbudget/create", () => {
    it("should return 401 when user is not authenticated", async () => {
      const authError = new Error("Unauthenticated");
      authError.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authError);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await createPOST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it("should create budget and return 200 with result on success", async () => {
      const budgetResult = {
        id: TEST_BUDGET_ID,
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        version: 1,
        status: "draft",
        totalBudgetAmount: 5000,
      };
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: budgetResult, events: [{ type: "EventBudgetCreated" }] })
      );

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
              { category: "food", name: "Catering", budgetedAmount: 2000 },
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

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EventBudget",
          command: "create",
          body: expect.objectContaining({
            eventId: TEST_EVENT_ID,
            totalBudgetAmount: 5000,
          }),
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
        })
      );
    });

    it("should return 403 on policy denial", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(403, "Access denied: BudgetManagerOnly")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await createPOST(request);

      expect(response.status).toBe(403);
    });

    it("should return 422 on guard failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(422, "Guard failed: Event must be in draft status")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await createPOST(request);

      expect(response.status).toBe(422);
    });

    it("should return 400 on generic command failure", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(400, "Budget already exists for this event")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await createPOST(request);

      expect(response.status).toBe(400);
    });

    it("should return 500 when runtime throws an exception", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Database connection lost")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: JSON.stringify({ eventId: TEST_EVENT_ID }),
        }
      );
      const response = await createPOST(request);

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------ UPDATE
  describe("POST /api/eventbudget/update", () => {
    it("should return 401 when user is not authenticated", async () => {
      const authError = new Error("Unauthenticated");
      authError.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authError);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID, totalBudgetAmount: 7000 }),
        }
      );
      const response = await updatePOST(request);

      expect(response.status).toBe(401);
    });

    it("should update budget and return 200 on success", async () => {
      const updatedResult = {
        id: TEST_BUDGET_ID,
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        version: 2,
        status: "draft",
        totalBudgetAmount: 7000,
        notes: "Revised budget",
      };
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: updatedResult, events: [{ type: "EventBudgetUpdated" }] })
      );

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

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EventBudget",
          command: "update",
          body: expect.objectContaining({
            id: TEST_BUDGET_ID,
            totalBudgetAmount: 7000,
          }),
        })
      );
    });

    it("should pass tenant context to runManifestCommand for tenant isolation", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_BUDGET_ID }, events: [] })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID, notes: "Updated" }),
        }
      );
      await updatePOST(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
        })
      );
    });

    it("should return 422 when guard prevents update of finalized budget", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(422, "Guard failed: Cannot update a finalized budget")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID, totalBudgetAmount: 9999 }),
        }
      );
      const response = await updatePOST(request);

      expect(response.status).toBe(422);
    });

    it("should return 500 when runtime throws during update", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Unexpected DB error")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/update",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await updatePOST(request);

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------ APPROVE
  describe("POST /api/eventbudget/approve", () => {
    it("should return 401 when user is not authenticated", async () => {
      const authError = new Error("Unauthenticated");
      authError.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authError);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await approvePOST(request);

      expect(response.status).toBe(401);
    });

    it("should approve budget and return 200 on success", async () => {
      const approvedResult = {
        id: TEST_BUDGET_ID,
        tenantId: TEST_TENANT_ID,
        eventId: TEST_EVENT_ID,
        status: "approved",
        approvedBy: TEST_USER_ID,
        approvedAt: new Date().toISOString(),
      };
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({
          result: approvedResult,
          events: [{ type: "EventBudgetApproved" }],
        })
      );

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

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EventBudget",
          command: "approve",
          body: expect.objectContaining({ id: TEST_BUDGET_ID }),
        })
      );
    });

    it("should return 403 when user lacks approval permission", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(403, "Access denied: BudgetApproverRole")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await approvePOST(request);

      expect(response.status).toBe(403);
    });

    it("should return 422 when guard prevents approval without line items", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(422, "Guard failed: Budget must have at least one line item")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await approvePOST(request);

      expect(response.status).toBe(422);
    });

    it("should return 400 when budget not found for approval", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(400, "Budget not found")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: "nonexistent-id" }),
        }
      );
      const response = await approvePOST(request);

      expect(response.status).toBe(400);
    });

    it("should return 500 when runtime throws during approval", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Connection timeout")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/approve",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await approvePOST(request);

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------ FINALIZE
  describe("POST /api/eventbudget/finalize", () => {
    it("should return 401 when user is not authenticated", async () => {
      const authError = new Error("Unauthenticated");
      authError.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authError);

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await finalizePOST(request);

      expect(response.status).toBe(401);
    });

    it("should finalize budget and return 200 on success", async () => {
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
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({
          result: finalizedResult,
          events: [{ type: "EventBudgetFinalized" }],
        })
      );

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

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "EventBudget",
          command: "finalize",
          body: expect.objectContaining({ id: TEST_BUDGET_ID }),
        })
      );
    });

    it("should pass tenant context to runManifestCommand for tenant isolation", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({ result: { id: TEST_BUDGET_ID, status: "finalized" }, events: [] })
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      await finalizePOST(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
        })
      );
    });

    it("should return 403 when user lacks finalize permission", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(403, "Access denied: FinanceAdminOnly")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await finalizePOST(request);

      expect(response.status).toBe(403);
    });

    it("should return 422 when guard prevents finalizing non-approved budget", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        fail(422, "Guard failed: Budget must be in approved status")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await finalizePOST(request);

      expect(response.status).toBe(422);
    });

    it("should return 500 when runtime throws during finalization", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Transaction deadlock")
      );

      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/finalize",
        {
          method: "POST",
          body: JSON.stringify({ id: TEST_BUDGET_ID }),
        }
      );
      const response = await finalizePOST(request);

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------ CROSS-CUTTING
  describe("Response shape and error handling", () => {
    it("success responses should contain success and result", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        ok({
          result: { id: TEST_BUDGET_ID, status: "draft" },
          events: [{ type: "EventBudgetCreated" }],
        })
      );

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
    });

    it("should handle malformed JSON body gracefully (swallowed by dispatcher)", async () => {
      const request = createMockRequest(
        "http://localhost:3000/api/eventbudget/create",
        {
          method: "POST",
          body: "not valid json {{{",
        }
      );
      const response = await createPOST(request);

      // Dispatcher uses request.json().catch(() => ({})) so invalid JSON becomes empty body
      expect(response.status).toBe(200);
    });
  });
});
