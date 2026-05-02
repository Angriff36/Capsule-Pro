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

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test_menu";
const TEST_ORG_ID = "org_test_menu";

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
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: "menu-001" }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "MenuCreated", entityId: result.id }],
    }),
  } as never);
}

function mockRuntimeFailure(error: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error,
    }),
  } as never);
}

function mockRuntimePolicyDenial(policyName: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      policyDenial: { policyName },
    }),
  } as never);
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index, formatted },
    }),
  } as never);
}

describe("Menu API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- POST /api/menu/create ----

  describe("POST /api/menu/create", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const { POST } = await import("@/app/api/menu/create/route");
      const res = await POST(makeRequest({ name: "Brunch Menu" }));
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

      const { POST } = await import("@/app/api/menu/create/route");
      const res = await POST(makeRequest({ name: "Brunch Menu" }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Tenant not found");
    });

    it("returns 200 on successful create", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "menu-001", name: "Brunch Menu" });

      const { POST } = await import("@/app/api/menu/create/route");
      const res = await POST(makeRequest({ name: "Brunch Menu" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.id).toBe("menu-001");
      expect(data.events).toHaveLength(1);
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("adminOnly");

      const { POST } = await import("@/app/api/menu/create/route");
      const res = await POST(makeRequest({ name: "Brunch Menu" }));
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Access denied");
      expect(data.message).toContain("adminOnly");
    });

    it("returns 422 on guard failure", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(0, "name is required");

      const { POST } = await import("@/app/api/menu/create/route");
      const res = await POST(makeRequest({}));
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.message).toContain("Guard 0 failed");
      expect(data.message).toContain("name is required");
    });

    it("returns 400 on generic command failure", async () => {
      mockAuthenticated();
      mockRuntimeFailure("Something went wrong");

      const { POST } = await import("@/app/api/menu/create/route");
      const res = await POST(makeRequest({ name: "Brunch Menu" }));
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

      const { POST } = await import("@/app/api/menu/create/route");
      const res = await POST(makeRequest({ name: "Brunch Menu" }));
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

      const { POST } = await import("@/app/api/menu/update/route");
      const res = await POST(makeRequest({ id: "menu-001", name: "Updated" }));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("returns 200 on successful update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "menu-001", name: "Dinner Menu" });

      const { POST } = await import("@/app/api/menu/update/route");
      const res = await POST(
        makeRequest({ id: "menu-001", name: "Dinner Menu" })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Dinner Menu");
    });

    it("passes correct entityName to runtime", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "menu-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const { POST } = await import("@/app/api/menu/update/route");
      await POST(makeRequest({ id: "menu-001", name: "Updated" }));

      expect(runCommand).toHaveBeenCalledWith(
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

      const { POST } = await import("@/app/api/menu/update/route");
      const res = await POST(makeRequest({ id: "menu-001" }));

      expect(res.status).toBe(500);
    });
  });

  // ---- POST /api/menu/activate ----

  describe("POST /api/menu/activate", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const { POST } = await import("@/app/api/menu/activate/route");
      const res = await POST(makeRequest({ id: "menu-001" }));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful activate", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "menu-001", isActive: true });

      const { POST } = await import("@/app/api/menu/activate/route");
      const res = await POST(makeRequest({ id: "menu-001" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(true);
    });

    it("passes 'activate' command with Menu entityName", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "menu-001", isActive: true },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const { POST } = await import("@/app/api/menu/activate/route");
      await POST(makeRequest({ id: "menu-001" }));

      expect(runCommand).toHaveBeenCalledWith(
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

      const { POST } = await import("@/app/api/menu/deactivate/route");
      const res = await POST(makeRequest({ id: "menu-001" }));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful deactivate", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "menu-001", isActive: false });

      const { POST } = await import("@/app/api/menu/deactivate/route");
      const res = await POST(makeRequest({ id: "menu-001" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("managerOnly");

      const { POST } = await import("@/app/api/menu/deactivate/route");
      const res = await POST(makeRequest({ id: "menu-001" }));
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.message).toContain("managerOnly");
    });
  });
});
