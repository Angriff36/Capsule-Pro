/**
 * Menu API Route Tests
 *
 * Tests all menu command routes via the manifest dispatcher:
 * - POST Menu.create, Menu.update, Menu.activate, Menu.deactivate
 *
 * Covers: auth (401), policy denial (403), guard failure (422),
 * success (200), command wiring, and error handling (500).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data, status = 200) => new Response(JSON.stringify(data), { status })
  ),
  manifestErrorResponse: vi.fn(
    (data, status = 400) => new Response(JSON.stringify(data), { status })
  ),
}));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    name = "InvariantError" as const;
    constructor(m: string) {
      super(m);
      this.name = "InvariantError";
    }
  }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { InvariantError } from "@/app/lib/invariant";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

const dispatch = (command: string) => (req: NextRequest) =>
  manifestDispatch(req, {
    params: Promise.resolve({ entity: "Menu", command }),
  });

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user-001";
const MOCK_USER = {
  id: TEST_USER_ID,
  tenantId: TEST_TENANT_ID,
  role: "admin",
  email: "test@test.com",
  firstName: "Test",
  lastName: "User",
};

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/menu/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockAuthenticated() {
  vi.mocked(requireCurrentUser).mockResolvedValue(MOCK_USER as never);
}

function throwInvariant(message: string) {
  vi.mocked(requireCurrentUser).mockImplementation(() => {
    throw new InvariantError(message);
  });
}

function mockRunSuccess(result: Record<string, unknown> = { id: "menu-001" }) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        result,
        events: [{ type: "MenuCreated", entityId: result.id }],
      }),
      { status: 200 }
    )
  );
}

function mockRunError(status: number, message: string) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: false, message }), { status })
  );
}

describe("Menu API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticated();
  });

  // ---- POST Menu.create ----

  describe("POST Menu.create", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("create")(
        makeRequest({ name: "Brunch Menu" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful create", async () => {
      mockRunSuccess({ id: "menu-001", name: "Brunch Menu" });
      const res = await dispatch("create")(
        makeRequest({ name: "Brunch Menu" })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.id).toBe("menu-001");
      expect(data.events).toHaveLength(1);
    });

    it("returns 403 on policy denial", async () => {
      mockRunError(403, "Access denied: adminOnly (role=admin)");
      const res = await dispatch("create")(
        makeRequest({ name: "Brunch Menu" })
      );
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toContain("adminOnly");
    });

    it("returns 422 on guard failure", async () => {
      mockRunError(422, "Guard 0 failed: name is required");
      const res = await dispatch("create")(makeRequest({}));
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.message).toContain("Guard 0 failed");
      expect(data.message).toContain("name is required");
    });

    it("returns 400 on generic command failure", async () => {
      mockRunError(400, "Something went wrong");
      const res = await dispatch("create")(
        makeRequest({ name: "Brunch Menu" })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Something went wrong");
    });

    it("returns 500 when runtime throws an exception", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("DB connection lost") as never
      );
      const res = await dispatch("create")(
        makeRequest({ name: "Brunch Menu" })
      );
      expect(res.status).toBe(500);
    });
  });

  // ---- POST Menu.update ----

  describe("POST Menu.update", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("update")(
        makeRequest({ id: "menu-001", name: "Updated" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful update", async () => {
      mockRunSuccess({ id: "menu-001", name: "Dinner Menu" });
      const res = await dispatch("update")(
        makeRequest({ id: "menu-001", name: "Dinner Menu" })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Dinner Menu");
    });

    it("passes correct entityName to runManifestCommand", async () => {
      mockRunSuccess({ id: "menu-001" });
      await dispatch("update")(
        makeRequest({ id: "menu-001", name: "Updated" })
      );
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Menu", command: "update" })
      );
    });

    it("returns 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Unexpected") as never
      );
      const res = await dispatch("update")(makeRequest({ id: "menu-001" }));
      expect(res.status).toBe(500);
    });
  });

  // ---- POST Menu.activate ----

  describe("POST Menu.activate", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("activate")(makeRequest({ id: "menu-001" }));
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful activate", async () => {
      mockRunSuccess({ id: "menu-001", isActive: true });
      const res = await dispatch("activate")(makeRequest({ id: "menu-001" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(true);
    });

    it("passes correct entity and command to runManifestCommand", async () => {
      mockRunSuccess({ id: "menu-001", isActive: true });
      await dispatch("activate")(makeRequest({ id: "menu-001" }));
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Menu", command: "activate" })
      );
    });
  });

  // ---- POST Menu.deactivate ----

  describe("POST Menu.deactivate", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("deactivate")(makeRequest({ id: "menu-001" }));
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful deactivate", async () => {
      mockRunSuccess({ id: "menu-001", isActive: false });
      const res = await dispatch("deactivate")(makeRequest({ id: "menu-001" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("returns 403 on policy denial", async () => {
      mockRunError(403, "Access denied: managerOnly (role=admin)");
      const res = await dispatch("deactivate")(makeRequest({ id: "menu-001" }));
      expect(res.status).toBe(403);
      expect((await res.json()).message).toContain("managerOnly");
    });
  });
});
