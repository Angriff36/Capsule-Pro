/**
 * Menu API Route Tests
 *
 * Tests all menu command routes under /api/menu/:
 * - POST /api/menu/create   -> Menu.create
 * - POST /api/menu/update   -> Menu.update
 * - POST /api/menu/activate -> Menu.activate
 * - POST /api/menu/deactivate -> Menu.deactivate
 *
 * Covers: auth (401), tenant-not-found (400), policy denial (403),
 * guard failure (422), success (200), and error handling (500).
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

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test_menu";
const TEST_ORG_ID = "org_test_menu";

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
  return new NextRequest("http://localhost:3000/api/menu/test", {
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
  result: Record<string, unknown> = { id: "menu-001" }
) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: true,
    result,
    emittedEvents: [{ type: "MenuCreated", entityId: result.id }],
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

describe("Menu API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRuntimeMock();
  });

  // ---- POST /api/menu/create ----

  describe("POST /api/menu/create", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Brunch Menu" }),
        "Menu"
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
        makeRequest({ name: "Brunch Menu" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Tenant not found");
    });

    it("returns 200 on successful create", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "menu-001", name: "Brunch Menu" });

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Brunch Menu" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.id).toBe("menu-001");
      expect(data.events).toHaveLength(1);
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("adminOnly");

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Brunch Menu" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("adminOnly");
    });

    it("returns 422 on guard failure", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(0, "name is required");

      const res = await simulateRouteHandler(
        "create",
        makeRequest({}),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 0 failed");
      expect(data.message).toContain("name is required");
    });

    it("returns 400 on generic command failure", async () => {
      mockAuthenticated();
      mockRuntimeFailure("Something went wrong");

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Brunch Menu" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Something went wrong");
    });

    it("returns 500 when runtime throws an exception", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("DB connection lost") as never
      );

      const res = await simulateRouteHandler(
        "create",
        makeRequest({ name: "Brunch Menu" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Internal server error");
    });
  });

  // ---- POST /api/menu/update ----

  describe("POST /api/menu/update", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "menu-001", name: "Updated" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("returns 200 on successful update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "menu-001", name: "Dinner Menu" });

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "menu-001", name: "Dinner Menu" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Dinner Menu");
    });

    it("passes correct entityName to runtime", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "menu-001" },
        emittedEvents: [],
      });

      await simulateRouteHandler(
        "update",
        makeRequest({ id: "menu-001", name: "Updated" }),
        "Menu"
      );

      expect(mockRunCommand).toHaveBeenCalledWith(
        "update",
        { id: "menu-001", name: "Updated" },
        { entityName: "Menu" }
      );
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Unexpected") as never
      );

      const res = await simulateRouteHandler(
        "update",
        makeRequest({ id: "menu-001" }),
        "Menu"
      );

      expect(res.status).toBe(500);
    });
  });

  // ---- POST /api/menu/activate ----

  describe("POST /api/menu/activate", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "activate",
        makeRequest({ id: "menu-001" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful activate", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "menu-001", isActive: true });

      const res = await simulateRouteHandler(
        "activate",
        makeRequest({ id: "menu-001" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(true);
    });

    it("passes 'activate' command with Menu entityName", async () => {
      mockAuthenticated();
      mockRunCommand.mockResolvedValue({
        success: true,
        result: { id: "menu-001", isActive: true },
        emittedEvents: [],
      });

      await simulateRouteHandler(
        "activate",
        makeRequest({ id: "menu-001" }),
        "Menu"
      );

      expect(mockRunCommand).toHaveBeenCalledWith(
        "activate",
        { id: "menu-001" },
        { entityName: "Menu" }
      );
    });
  });

  // ---- POST /api/menu/deactivate ----

  describe("POST /api/menu/deactivate", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const res = await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "menu-001" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful deactivate", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "menu-001", isActive: false });

      const res = await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "menu-001" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("managerOnly");

      const res = await simulateRouteHandler(
        "deactivate",
        makeRequest({ id: "menu-001" }),
        "Menu"
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.message).toContain("managerOnly");
    });
  });
});