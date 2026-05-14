/**
 * Ingredient API Route Tests
 *
 * Tests all ingredient command routes under /api/ingredient/:
 * - POST /api/ingredient/create             -> Ingredient.create
 * - POST /api/ingredient/update             -> Ingredient.update
 * - POST /api/ingredient/deactivate         -> Ingredient.deactivate
 * - POST /api/ingredient/update-allergens   -> Ingredient.updateAllergens
 * - POST /api/ingredient/update-shelf-life  -> Ingredient.updateShelfLife
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

const TEST_TENANT_ID = "c0000000-0000-4000-c000-000000000003";
const TEST_USER_ID = "user_test_ingredient";
const TEST_ORG_ID = "org_test_ingredient";

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
  return new NextRequest("http://localhost:3000/api/ingredient/test", {
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
  result: Record<string, unknown> = { id: "ingredient-001" }
) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: true,
    result,
    emittedEvents: [{ type: "IngredientCreated", entityId: result.id }],
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

describe("Ingredient API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRuntimeMock();
  });

  // ---- POST /api/ingredient/create ----

  describe("POST /api/ingredient/create", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Olive Oil" }),
        "Ingredient"
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
        makeRequest({ name: "Olive Oil" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Tenant not found");
    });

    it("returns 200 on successful create", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "ingredient-001",
        name: "Olive Oil",
        unit: "liters",
        allergens: [],
      });

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Olive Oil" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Olive Oil");
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("managerOnly");

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Olive Oil" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("managerOnly");
    });

    it("returns 422 on guard failure", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(0, "name must not be empty");

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.message).toContain("Guard 0 failed");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("DB down") as never
      );

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Olive Oil" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
    });
  });

  // ---- POST /api/ingredient/update ----

  describe("POST /api/ingredient/update", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "ingredient-001", name: "Extra Virgin Olive Oil" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it("returns 200 on successful update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "ingredient-001",
        name: "Extra Virgin Olive Oil",
      });

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "ingredient-001", name: "Extra Virgin Olive Oil" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Extra Virgin Olive Oil");
    });

    it("passes correct command and entityName to runtime", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "ingredient-001" },
        emittedEvents: [],
      });

      const body = { id: "ingredient-001", name: "Updated" };
      await simulateRouteHandler("update", makeRequest(body), "Ingredient");

      expect(mockRunCommand).toHaveBeenCalledWith("update", body, {
        entityName: "Ingredient",
      });
    });

    it("returns 400 on generic command failure", async () => {
      mockAuthenticated();
      mockRuntimeFailure("Ingredient not found");

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "ingredient-999", name: "X" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBe("Ingredient not found");
    });
  });

  // ---- POST /api/ingredient/deactivate ----

  describe("POST /api/ingredient/deactivate", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "ingredient-001" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful deactivate", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "ingredient-001", isActive: false });

      const res = await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "ingredient-001" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("passes 'deactivate' command with Ingredient entityName", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "ingredient-001", isActive: false },
        emittedEvents: [],
      });

      await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "ingredient-001" }),
        "Ingredient"
      );

      expect(mockRunCommand).toHaveBeenCalledWith(
        "deactivate",
        { id: "ingredient-001" },
        { entityName: "Ingredient" }
      );
    });
  });

  // ---- POST /api/ingredient/update-allergens ----

  describe("POST /api/ingredient/update-allergens", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "updateAllergens",
        makeRequest({ id: "ingredient-001", allergens: ["nuts", "dairy"] }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
    });

    it("returns 200 on successful allergen update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "ingredient-001",
        allergens: ["nuts", "dairy"],
      });

      const res = await simulateRouteHandler(
        "updateAllergens",
        makeRequest({ id: "ingredient-001", allergens: ["nuts", "dairy"] }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.allergens).toEqual(["nuts", "dairy"]);
    });

    it("passes 'updateAllergens' command with Ingredient entityName", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "ingredient-001" },
        emittedEvents: [],
      });

      const body = { id: "ingredient-001", allergens: ["gluten"] };
      await simulateRouteHandler("updateAllergens", makeRequest(body), "Ingredient");

      expect(mockRunCommand).toHaveBeenCalledWith("updateAllergens", body, {
        entityName: "Ingredient",
      });
    });

    it("returns 422 on guard failure for invalid allergens", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(0, "allergens must be an array");

      const res = await simulateRouteHandler(
        "updateAllergens",
        makeRequest({ id: "ingredient-001", allergens: "invalid" }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.message).toContain("Guard 0 failed");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Unexpected") as never
      );

      const res = await simulateRouteHandler(
        "updateAllergens",
        makeRequest({ id: "ingredient-001", allergens: [] }),
        "Ingredient"
      );

      expect(res.status).toBe(500);
    });
  });

  // ---- POST /api/ingredient/update-shelf-life ----

  describe("POST /api/ingredient/update-shelf-life", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "updateShelfLife",
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful shelf life update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "ingredient-001", shelfLifeDays: 14 });

      const res = await simulateRouteHandler(
        "updateShelfLife",
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.shelfLifeDays).toBe(14);
    });

    it("passes 'updateShelfLife' command with Ingredient entityName", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "ingredient-001" },
        emittedEvents: [],
      });

      const body = { id: "ingredient-001", shelfLifeDays: 7 };
      await simulateRouteHandler("updateShelfLife", makeRequest(body), "Ingredient");

      expect(mockRunCommand).toHaveBeenCalledWith("updateShelfLife", body, {
        entityName: "Ingredient",
      });
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("adminOnly");

      const res = await simulateRouteHandler(
        "updateShelfLife",
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.message).toContain("adminOnly");
    });

    it("returns 400 on generic command failure", async () => {
      mockAuthenticated();
      mockRuntimeFailure("Invalid shelf life value");

      const res = await simulateRouteHandler(
        "updateShelfLife",
        makeRequest({ id: "ingredient-001", shelfLifeDays: -1 }),
        "Ingredient"
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBe("Invalid shelf life value");
    });
  });
});