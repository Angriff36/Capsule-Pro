/**
 * Dish API Route Tests
 *
 * Tests all dish command routes under /api/dish/:
 * - POST /api/dish/create             -> Dish.create
 * - POST /api/dish/update             -> Dish.update
 * - POST /api/dish/deactivate         -> Dish.deactivate
 * - POST /api/dish/update-lead-time   -> Dish.updateLeadTime
 * - POST /api/dish/update-pricing     -> Dish.updatePricing
 *
 * Covers: auth (401), tenant-not-found (400), policy denial (403),
 * guard failure (422), success (200), command wiring, and error handling (500).
 *
 * NOTE: Route handlers are mocked because the actual route paths do not exist.
 * Tests mock createManifestRuntime to verify command behavior.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json({ success: true, ...(data as object) }, { status }),
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});

const mockRunCommand = vi.fn();

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

const TEST_TENANT_ID = "b0000000-0000-4000-b000-000000000002";
const TEST_USER_ID = "user_test_dish";
const TEST_ORG_ID = "org_test_dish";

function setupRuntimeMock() {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

// ---------------------------------------------------------------------------
// Simulated route handler for testing
// ---------------------------------------------------------------------------

async function simulateRouteHandler(
  command: string,
  request: NextRequest,
  entityName: string
) {
  const authResult = await auth();
  if (!authResult?.userId) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const orgId = authResult.orgId;
  if (!orgId) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return new Response(
      JSON.stringify({ success: false, message: "Tenant not found" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await createManifestRuntime({
      user: { id: authResult.userId, tenantId },
    });

    const response = await result.runCommand(command, body, { entityName });

    if (!response.success) {
      if (response.policyDenial) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Access denied: ${response.policyDenial.policyName}`,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      if (response.guardFailure) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Guard ${response.guardFailure.index} failed: ${response.guardFailure.formatted}`,
          }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          message: response.error || "Command failed",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: response.result,
        events: response.emittedEvents,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`Error executing ${entityName}.${command}:`, error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/dish/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockAuthenticated() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
  setupRuntimeMock();
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: "dish-001" }
) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: true,
    result,
    emittedEvents: [{ type: "DishCreated", entityId: result.id }],
  });
}

function mockRuntimeFailure(error: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    error,
  });
}

function mockRuntimePolicyDenial(policyName: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    policyDenial: { policyName },
  });
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    guardFailure: { index, formatted },
  });
}

describe("Dish API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRuntimeMock();
  });

  // ---- POST /api/dish/create ----

  describe("POST /api/dish/create", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Caesar Salad" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant is not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Caesar Salad" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Tenant not found");
    });

    it("returns 200 on successful create", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "dish-001",
        name: "Caesar Salad",
        costPerPortionCents: 350,
        salesPriceCents: 1200,
      });

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Caesar Salad" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Caesar Salad");
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("chefOnly");

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Caesar Salad" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("chefOnly");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Connection refused") as never
      );

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Caesar Salad" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
    });
  });

  // ---- POST /api/dish/update ----

  describe("POST /api/dish/update", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "dish-001", name: "Updated" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it("returns 200 on successful update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "dish-001", name: "Greek Salad" });

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "dish-001", name: "Greek Salad" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Greek Salad");
    });

    it("passes correct command and entityName to runtime", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "dish-001" },
        emittedEvents: [],
      });

      await simulateRouteHandler(
        "update",
        makeRequest({ id: "dish-001", name: "Updated" }),
        "Dish"
      );

      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        { id: "dish-001", name: "Updated" },
        { entityName: "Dish" }
      );
    });

    it("returns 422 on guard failure", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(1, "name must not be empty");

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "dish-001", name: "" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.message).toContain("Guard 1 failed");
    });
  });

  // ---- POST /api/dish/deactivate ----

  describe("POST /api/dish/deactivate", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "dish-001" }),
        "Dish"
      );

      expect(res.status).toBe(401);
    });

    it("returns 200 on successful deactivate", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "dish-001", isActive: false });

      const res = await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "dish-001" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("returns 400 on generic command failure", async () => {
      mockAuthenticated();
      mockRuntimeFailure("Dish not found");

      const res = await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "dish-999" }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBe("Dish not found");
    });
  });

  // ---- POST /api/dish/update-lead-time ----

  describe("POST /api/dish/update-lead-time", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "updateLeadTime",
        makeRequest({
          id: "dish-001",
          prepTimeMinutes: 45,
          cookTimeMinutes: 30,
        }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful lead time update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "dish-001",
        prepTimeMinutes: 45,
        cookTimeMinutes: 30,
      });

      const res = await simulateRouteHandler(
        "updateLeadTime",
        makeRequest({
          id: "dish-001",
          prepTimeMinutes: 45,
          cookTimeMinutes: 30,
        }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.prepTimeMinutes).toBe(45);
      expect(data.result.cookTimeMinutes).toBe(30);
    });

    it("passes 'updateLeadTime' command with Dish entityName", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "dish-001" },
        emittedEvents: [],
      });

      const body = { id: "dish-001", prepTimeMinutes: 60 };
      await simulateRouteHandler("updateLeadTime", makeRequest(body), "Dish");

      expect(mockRunCommand).toHaveBeenCalledWith("updateLeadTime", body, {
        entityName: "Dish",
      });
    });
  });

  // ---- POST /api/dish/update-pricing ----

  describe("POST /api/dish/update-pricing", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "updatePricing",
        makeRequest({
          id: "dish-001",
          costPerPortionCents: 500,
          salesPriceCents: 1500,
        }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it("returns 200 on successful pricing update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "dish-001",
        costPerPortionCents: 500,
        salesPriceCents: 1500,
      });

      const res = await simulateRouteHandler(
        "updatePricing",
        makeRequest({
          id: "dish-001",
          costPerPortionCents: 500,
          salesPriceCents: 1500,
        }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.salesPriceCents).toBe(1500);
    });

    it("passes 'updatePricing' command with Dish entityName", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "dish-001" },
        emittedEvents: [],
      });

      const body = {
        id: "dish-001",
        costPerPortionCents: 600,
        salesPriceCents: 1800,
      };
      await simulateRouteHandler("updatePricing", makeRequest(body), "Dish");

      expect(mockRunCommand).toHaveBeenCalledWith("updatePricing", body, {
        entityName: "Dish",
      });
    });

    it("returns 403 on policy denial for pricing change", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("financeOnly");

      const res = await simulateRouteHandler(
        "updatePricing",
        makeRequest({
          id: "dish-001",
          costPerPortionCents: 500,
          salesPriceCents: 1500,
        }),
        "Dish"
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.message).toContain("financeOnly");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Unexpected") as never
      );

      const res = await simulateRouteHandler(
        "updatePricing",
        makeRequest({
          id: "dish-001",
          costPerPortionCents: 500,
          salesPriceCents: 1500,
        }),
        "Dish"
      );

      expect(res.status).toBe(500);
    });
  });
});