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
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

function createIngredientHandler(command: string) {
  return async (req: NextRequest) =>
    manifestDispatch(req, {
      params: Promise.resolve({ entity: "Ingredient", command }),
    });
}

const TEST_TENANT_ID = "c0000000-0000-4000-c000-000000000003";
const TEST_USER_ID = "user_test_ingredient";
const TEST_ORG_ID = "org_test_ingredient";

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
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: "ingredient-001" }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "IngredientCreated", entityId: result.id }],
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

describe("Ingredient API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- POST /api/ingredient/create ----

  describe("POST /api/ingredient/create", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const POST = createIngredientHandler("create");
      const res = await POST(makeRequest({ name: "Olive Oil" }));
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

      const POST = createIngredientHandler("create");
      const res = await POST(makeRequest({ name: "Olive Oil" }));
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

      const POST = createIngredientHandler("create");
      const res = await POST(makeRequest({ name: "Olive Oil" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Olive Oil");
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("managerOnly");

      const POST = createIngredientHandler("create");
      const res = await POST(makeRequest({ name: "Olive Oil" }));
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toContain("managerOnly");
    });

    it("returns 422 on guard failure", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(0, "name must not be empty");

      const POST = createIngredientHandler("create");
      const res = await POST(makeRequest({ name: "" }));
      const data = await res.json();

      expect(res.status).toBe(422);
      expect(data.message).toContain("Guard 0 failed");
    });

    it("returns 500 on unexpected error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("DB down") as never
      );

      const POST = createIngredientHandler("create");
      const res = await POST(makeRequest({ name: "Olive Oil" }));
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

      const POST = createIngredientHandler("update");
      const res = await POST(
        makeRequest({ id: "ingredient-001", name: "Extra Virgin Olive Oil" })
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

      const POST = createIngredientHandler("update");
      const res = await POST(
        makeRequest({ id: "ingredient-001", name: "Extra Virgin Olive Oil" })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.name).toBe("Extra Virgin Olive Oil");
    });

    it("passes correct command and entityName to runtime", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "ingredient-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const body = { id: "ingredient-001", name: "Updated" };
      const POST = createIngredientHandler("update");
      await POST(makeRequest(body));

      expect(runCommand).toHaveBeenCalledWith("update", body, {
        entityName: "Ingredient",
      });
    });

    it("returns 400 on generic command failure", async () => {
      mockAuthenticated();
      mockRuntimeFailure("Ingredient not found");

      const POST = createIngredientHandler("update");
      const res = await POST(makeRequest({ id: "ingredient-999", name: "X" }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBe("Ingredient not found");
    });
  });

  // ---- POST /api/ingredient/deactivate ----

  describe("POST /api/ingredient/deactivate", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const POST = createIngredientHandler("deactivate");
      const res = await POST(makeRequest({ id: "ingredient-001" }));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful deactivate", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "ingredient-001", isActive: false });

      const POST = createIngredientHandler("deactivate");
      const res = await POST(makeRequest({ id: "ingredient-001" }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.isActive).toBe(false);
    });

    it("passes 'deactivate' command with Ingredient entityName", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "ingredient-001", isActive: false },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const POST = createIngredientHandler("deactivate");
      await POST(makeRequest({ id: "ingredient-001" }));

      expect(runCommand).toHaveBeenCalledWith(
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

      const POST = createIngredientHandler("updateAllergens");
      const res = await POST(
        makeRequest({ id: "ingredient-001", allergens: ["nuts", "dairy"] })
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

      const POST = createIngredientHandler("updateAllergens");
      const res = await POST(
        makeRequest({ id: "ingredient-001", allergens: ["nuts", "dairy"] })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.allergens).toEqual(["nuts", "dairy"]);
    });

    it("passes 'updateAllergens' command with Ingredient entityName", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "ingredient-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const body = { id: "ingredient-001", allergens: ["gluten"] };
      const POST = createIngredientHandler("updateAllergens");
      await POST(makeRequest(body));

      expect(runCommand).toHaveBeenCalledWith("updateAllergens", body, {
        entityName: "Ingredient",
      });
    });

    it("returns 422 on guard failure for invalid allergens", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(0, "allergens must be an array");

      const POST = createIngredientHandler("updateAllergens");
      const res = await POST(
        makeRequest({ id: "ingredient-001", allergens: "invalid" })
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

      const POST = createIngredientHandler("updateAllergens");
      const res = await POST(
        makeRequest({ id: "ingredient-001", allergens: [] })
      );

      expect(res.status).toBe(500);
    });
  });

  // ---- POST /api/ingredient/update-shelf-life ----

  describe("POST /api/ingredient/update-shelf-life", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const POST = createIngredientHandler("updateShelfLife");
      const res = await POST(
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 })
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 200 on successful shelf life update", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({ id: "ingredient-001", shelfLifeDays: 14 });

      const POST = createIngredientHandler("updateShelfLife");
      const res = await POST(
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.shelfLifeDays).toBe(14);
    });

    it("passes 'updateShelfLife' command with Ingredient entityName", async () => {
      mockAuthenticated();
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: "ingredient-001" },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const body = { id: "ingredient-001", shelfLifeDays: 7 };
      const POST = createIngredientHandler("updateShelfLife");
      await POST(makeRequest(body));

      expect(runCommand).toHaveBeenCalledWith("updateShelfLife", body, {
        entityName: "Ingredient",
      });
    });

    it("returns 403 on policy denial", async () => {
      mockAuthenticated();
      mockRuntimePolicyDenial("adminOnly");

      const POST = createIngredientHandler("updateShelfLife");
      const res = await POST(
        makeRequest({ id: "ingredient-001", shelfLifeDays: 14 })
      );
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.message).toContain("adminOnly");
    });

    it("returns 400 on generic command failure", async () => {
      mockAuthenticated();
      mockRuntimeFailure("Invalid shelf life value");

      const POST = createIngredientHandler("updateShelfLife");
      const res = await POST(
        makeRequest({ id: "ingredient-001", shelfLifeDays: -1 })
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBe("Invalid shelf life value");
    });
  });
});
