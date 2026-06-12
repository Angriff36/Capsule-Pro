/**
 * HTTP integration tests for RecipeVersion command routes
 *
 * Tests the HTTP layer for RecipeVersion create command via the
 * universal command dispatcher.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
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
    (data, status = 200) =>
      new Response(
        JSON.stringify({
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        }),
        { status }
      )
  ),
  manifestErrorResponse: vi.fn((message, status = 400) => {
    const body =
      typeof message === "string"
        ? { success: false, message }
        : {
            success: false,
            error: message.error,
            diagnostics: message.diagnostics ?? [],
          };
    return new Response(JSON.stringify(body), { status });
  }),
}));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    name = "InvariantError" as const;
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

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user-001";

import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

function createRecipeVersionHandler(command: string) {
  return async (req: NextRequest) =>
    manifestDispatch(req, {
      params: Promise.resolve({ entity: "RecipeVersion", command }),
    });
}

describe("Manifest HTTP - RecipeVersion Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/manifest/RecipeVersion/commands/create", () => {
    it("should import the route handler", async () => {
      const POST = createRecipeVersionHandler("create");
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        Object.assign(new Error("Unauthorized"), { name: "InvariantError" })
      );

      const POST = createRecipeVersionHandler("create");

      const request = new NextRequest(
        "http://localhost/api/manifest/RecipeVersion/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
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
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("success", false);
    });

    it("should process valid create request via dispatcher", async () => {
      vi.mocked(requireCurrentUser).mockResolvedValueOnce({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
      });

      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "version-001", recipeId: "recipe-001" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const POST = createRecipeVersionHandler("create");

      const request = new NextRequest(
        "http://localhost/api/manifest/RecipeVersion/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
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
        }
      );

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      // Verify the dispatcher was called with correct params
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "RecipeVersion",
          command: "create",
          user: {
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          },
        })
      );
    });

    it("should pass body through to runManifestCommand", async () => {
      const body = {
        recipeId: "recipe-001",
        yieldQty: 10,
        yieldUnit: 1,
        prepTime: 30,
        cookTime: 60,
        restTime: 10,
        difficulty: 3,
        instructionsText: "Mix ingredients and bake",
        notesText: "Best served warm",
      };

      vi.mocked(requireCurrentUser).mockResolvedValueOnce({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
      });

      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "version-001" },
            events: [],
          }),
          { status: 200 }
        )
      );

      const POST = createRecipeVersionHandler("create");

      await POST(
        new NextRequest(
          "http://localhost/api/manifest/RecipeVersion/commands/create",
          { method: "POST", body: JSON.stringify(body) }
        )
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          body,
        })
      );
    });

    it("should handle constraint violations from runtime", async () => {
      vi.mocked(requireCurrentUser).mockResolvedValueOnce({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
      });

      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: "difficulty must be between 1 and 5",
          }),
          { status: 422 }
        )
      );

      const POST = createRecipeVersionHandler("create");

      const request = new NextRequest(
        "http://localhost/api/manifest/RecipeVersion/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
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
        }
      );

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });

    it("should handle negative time constraint violations", async () => {
      vi.mocked(requireCurrentUser).mockResolvedValueOnce({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
      });

      vi.mocked(runManifestCommand).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            message: "times cannot be negative",
          }),
          { status: 422 }
        )
      );

      const POST = createRecipeVersionHandler("create");

      const request = new NextRequest(
        "http://localhost/api/manifest/RecipeVersion/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
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
        }
      );

      const response = await POST(request);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
    });
  });
});
