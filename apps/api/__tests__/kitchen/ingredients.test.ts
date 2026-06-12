/**
 * Ingredient API Route Tests
 *
 * Tests all ingredient command routes via the manifest dispatcher:
 * - POST Ingredient.create, Ingredient.update, Ingredient.deactivate,
 *   Ingredient.updateAllergens, Ingredient.updateShelfLife
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
    params: Promise.resolve({ entity: "Ingredient", command }),
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
  return new NextRequest("http://localhost:3000/api/ingredient/test", {
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

function mockRunSuccess(
  result: Record<string, unknown> = { id: "ingredient-001" }
) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        result,
        events: [{ type: "IngredientCreated", entityId: result.id }],
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

describe("Ingredient API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticated();
  });

  // ---- POST Ingredient.create ----

  describe("POST Ingredient.create", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("create")(makeRequest({ name: "Olive Oil" }));
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful create", async () => {
      mockRunSuccess({
        id: "ingredient-001",
        name: "Olive Oil",
        unit: "liters",
        allergens: [],
      });
      const res = await dispatch("create")(makeRequest({ name: "Olive Oil" }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Olive Oil");
    });

    it("returns 403 on policy denial", async () => {
      mockRunError(403, "Access denied: managerOnly (role=admin)");
      const res = await dispatch("create")(makeRequest({ name: "Olive Oil" }));
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toContain("managerOnly");
    });

    it("returns 422 on guard failure", async () => {
      mockRunError(422, "Guard 0 failed: name must not be empty");
      const res = await dispatch("create")(makeRequest({ name: "" }));
      expect(res.status).toBe(422);
      const data = await res.json();
      expect(data.message).toContain("Guard 0 failed");
    });

    it("returns 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("DB down") as never
      );
      const res = await dispatch("create")(makeRequest({ name: "Olive Oil" }));
      expect(res.status).toBe(500);
    });
  });

  // ---- POST Ingredient.update ----

  describe("POST Ingredient.update", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("update")(
        makeRequest({ id: "ingredient-001", name: "Extra Virgin Olive Oil" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful update", async () => {
      mockRunSuccess({ id: "ingredient-001", name: "Extra Virgin Olive Oil" });
      const res = await dispatch("update")(
        makeRequest({ id: "ingredient-001", name: "Extra Virgin Olive Oil" })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Extra Virgin Olive Oil");
    });

    it("passes correct entity and command to runManifestCommand", async () => {
      mockRunSuccess({ id: "ingredient-001" });
      await dispatch("update")(
        makeRequest({ id: "ingredient-001", name: "Updated" })
      );
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Ingredient", command: "update" })
      );
    });

    it("returns 400 on generic command failure", async () => {
      mockRunError(400, "Ingredient not found");
      const res = await dispatch("update")(
        makeRequest({ id: "ingredient-999", name: "X" })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Ingredient not found");
    });
  });

  // ---- POST Ingredient.deactivate ----

  describe("POST Ingredient.deactivate", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("deactivate")(
        makeRequest({ id: "ingredient-001" })
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful deactivate", async () => {
      mockRunSuccess({ id: "ingredient-001", isActive: false });
      const res = await dispatch("deactivate")(
        makeRequest({ id: "ingredient-001" })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("passes correct entity and command to runManifestCommand", async () => {
      mockRunSuccess({ id: "ingredient-001", isActive: false });
      await dispatch("deactivate")(makeRequest({ id: "ingredient-001" }));
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ entity: "Ingredient", command: "deactivate" })
      );
    });
  });

  // ---- POST Ingredient.updateAllergens ----

  describe("POST Ingredient.updateAllergens", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("updateAllergens")(
        makeRequest({ id: "ingredient-001", allergens: ["nuts", "dairy"] })
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful allergen update", async () => {
      mockRunSuccess({ id: "ingredient-001", allergens: ["nuts", "dairy"] });
      const res = await dispatch("updateAllergens")(
        makeRequest({ id: "ingredient-001", allergens: ["nuts", "dairy"] })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.allergens).toEqual(["nuts", "dairy"]);
    });

    it("passes correct entity and command to runManifestCommand", async () => {
      mockRunSuccess({ id: "ingredient-001" });
      await dispatch("updateAllergens")(
        makeRequest({ id: "ingredient-001", allergens: ["gluten"] })
      );
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Ingredient",
          command: "updateAllergens",
        })
      );
    });

    it("returns 422 on guard failure for invalid allergens", async () => {
      mockRunError(422, "Guard 0 failed: allergens must be an array");
      const res = await dispatch("updateAllergens")(
        makeRequest({ id: "ingredient-001", allergens: "invalid" })
      );
      expect(res.status).toBe(422);
      expect((await res.json()).message).toContain("Guard 0 failed");
    });

    it("returns 500 on unexpected error", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new Error("Unexpected") as never
      );
      const res = await dispatch("updateAllergens")(
        makeRequest({ id: "ingredient-001", allergens: [] })
      );
      expect(res.status).toBe(500);
    });
  });

  // ---- POST Ingredient.updateShelfLife ----

  describe("POST Ingredient.updateShelfLife", () => {
    it("returns 401 when unauthenticated", async () => {
      throwInvariant("Unauthorized");
      const res = await dispatch("updateShelfLife")(
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 })
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 on successful shelf life update", async () => {
      mockRunSuccess({ id: "ingredient-001", shelfLifeDays: 14 });
      const res = await dispatch("updateShelfLife")(
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.result.shelfLifeDays).toBe(14);
    });

    it("passes correct entity and command to runManifestCommand", async () => {
      mockRunSuccess({ id: "ingredient-001" });
      await dispatch("updateShelfLife")(
        makeRequest({ id: "ingredient-001", shelfLifeDays: 7 })
      );
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Ingredient",
          command: "updateShelfLife",
        })
      );
    });

    it("returns 403 on policy denial", async () => {
      mockRunError(403, "Access denied: adminOnly (role=admin)");
      const res = await dispatch("updateShelfLife")(
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 })
      );
      expect(res.status).toBe(403);
      expect((await res.json()).message).toContain("adminOnly");
    });

    it("returns 400 on generic command failure", async () => {
      mockRunError(400, "Invalid shelf life value");
      const res = await dispatch("updateShelfLife")(
        makeRequest({ id: "ingredient-001", shelfLifeDays: -1 })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Invalid shelf life value");
    });
  });
});
