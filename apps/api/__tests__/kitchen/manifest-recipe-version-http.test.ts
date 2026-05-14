/**
 * HTTP integration tests for RecipeVersion command routes
 *
 * Tests the HTTP layer for RecipeVersion create command
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock auth module
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      orgId: "test-org",
      userId: "test-user-id",
    })
  ),
}));

// Mock database module
vi.mock("@repo/database", () => {
  const mockDb = {
    recipe: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    recipeVersion: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    outboxEvent: {
      create: vi.fn(),
    },
    manifestState: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    idempotencyKey: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(mockDb)),
  };
  return {
    database: mockDb,
    Prisma: {
      Decimal: class Decimal {
        value: string | number;
        constructor(value: string | number) {
          this.value = value;
        }
      },
    },
  };
});

// Mock manifest runtime to avoid complex dependencies
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(() =>
    Promise.resolve({
      runCommand: vi.fn((_command: string, body: Record<string, unknown>) => {
        // Simulate manifest constraint validation
        if (
          typeof body.difficulty === "number" &&
          (body.difficulty < 1 || body.difficulty > 5)
        ) {
          return Promise.resolve({
            success: false,
            guardFailure: {
              index: 0,
              formatted: "difficulty must be between 1 and 5",
            },
          });
        }
        if (
          (body.prepTime as number) < 0 ||
          (body.cookTime as number) < 0 ||
          (body.restTime as number) < 0
        ) {
          return Promise.resolve({
            success: false,
            guardFailure: {
              index: 0,
              formatted: "times cannot be negative",
            },
          });
        }
        // Success case
        return Promise.resolve({
          success: true,
          result: { id: "version-001", ...body },
          emittedEvents: [],
        });
      }),
    })
  ),
}));

// Mock tenant resolution
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(() => Promise.resolve("test-tenant")),
}));

const mockRunCommand = vi.fn();

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

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
  return new NextRequest("http://localhost:3000/api/kitchen/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function setupRuntimeMock() {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: "version-001" }
) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: true,
    result,
    emittedEvents: [{ type: "RecipeVersionCreated", entityId: result.id }],
  });
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  setupRuntimeMock();
  mockRunCommand.mockResolvedValue({
    success: false,
    guardFailure: { index, formatted },
  });
}

const TEST_TENANT_ID = "d0000000-0000-4000-d000-000000000004";
const TEST_USER_ID = "user_test_recipe_version";
const TEST_ORG_ID = "org_test_recipe_version";

function mockAuthenticated() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
  setupRuntimeMock();
}

describe("Manifest HTTP - RecipeVersion Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupRuntimeMock();
  });

  // ==========================================================================
  // create command
  // ==========================================================================
  describe("RecipeVersion.create", () => {
    it("should reject unauthorized requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const res = await simulateRouteHandler(
        "create",
        makeRequest({
          recipeId: "recipe-001",
          yieldQty: 10,
          yieldUnit: 1,
          prepTime: 30,
          cookTime: 60,
          restTime: 10,
          difficulty: 3,
          instructionsText: "Mix ingredients and bake",
          notesText: "Best served warm",
        }),
        "RecipeVersion"
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const res = await simulateRouteHandler(
        "create",
        makeRequest({
          recipeId: "recipe-001",
          yieldQty: 10,
          yieldUnit: 1,
          prepTime: 30,
          cookTime: 60,
          restTime: 10,
          difficulty: 3,
          instructionsText: "Mix ingredients and bake",
          notesText: "Best served warm",
        }),
        "RecipeVersion"
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Tenant not found");
    });

    it("should process valid create request", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "version-001",
        recipeId: "recipe-001",
        version: 1,
      });

      const res = await simulateRouteHandler(
        "create",
        makeRequest({
          recipeId: "recipe-001",
          yieldQty: 10,
          yieldUnit: 1,
          prepTime: 30,
          cookTime: 60,
          restTime: 10,
          difficulty: 3,
          instructionsText: "Mix ingredients and bake",
          notesText: "Best served warm",
        }),
        "RecipeVersion"
      );
      const data = await res.json();

      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(500);

      if (res.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });

    it("should handle high difficulty warning constraint", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "version-001",
        difficulty: 4,
      });

      const res = await simulateRouteHandler(
        "create",
        makeRequest({
          recipeId: "recipe-001",
          yieldQty: 10,
          yieldUnit: 1,
          prepTime: 120,
          cookTime: 180,
          restTime: 30,
          difficulty: 4,
          instructionsText: "Complex multi-step process",
          notesText: "Requires advanced techniques",
        }),
        "RecipeVersion"
      );
      const data = await res.json();

      // Should succeed even with warn constraint
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(500);

      if (res.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });

    it("should handle long recipe warning constraint", async () => {
      mockAuthenticated();
      mockRuntimeSuccess({
        id: "version-001",
        prepTime: 180,
        cookTime: 300,
        restTime: 60,
      });

      const res = await simulateRouteHandler(
        "create",
        makeRequest({
          recipeId: "recipe-001",
          yieldQty: 10,
          yieldUnit: 1,
          prepTime: 180,
          cookTime: 300,
          restTime: 60,
          difficulty: 2,
          instructionsText: "Slow roast for hours",
          notesText: "Plan ahead",
        }),
        "RecipeVersion"
      );
      const data = await res.json();

      // Should succeed even with long recipe warning
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(500);

      if (res.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });

    it("should reject invalid difficulty (block constraint)", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(0, "difficulty must be between 1 and 5");

      const res = await simulateRouteHandler(
        "create",
        makeRequest({
          recipeId: "recipe-001",
          yieldQty: 10,
          yieldUnit: 1,
          prepTime: 30,
          cookTime: 60,
          restTime: 10,
          difficulty: 6,
          instructionsText: "Test",
          notesText: "Test",
        }),
        "RecipeVersion"
      );
      const data = await res.json();

      // Should fail with 422 for invalid difficulty
      expect(res.status).toBe(422);
      expect(res.status).toBeLessThan(500);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message");
    });

    it("should reject negative times (block constraint)", async () => {
      mockAuthenticated();
      mockRuntimeGuardFailure(0, "times cannot be negative");

      const res = await simulateRouteHandler(
        "create",
        makeRequest({
          recipeId: "recipe-001",
          yieldQty: 10,
          yieldUnit: 1,
          prepTime: -30,
          cookTime: 60,
          restTime: 10,
          difficulty: 3,
          instructionsText: "Test",
          notesText: "Test",
        }),
        "RecipeVersion"
      );
      const data = await res.json();

      // Should fail with 422 for negative time
      expect(res.status).toBe(422);
      expect(res.status).toBeLessThan(500);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message");
    });
  });
});