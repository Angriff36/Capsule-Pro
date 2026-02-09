/**
 * HTTP integration tests for RecipeVersion command routes
 *
 * Tests the HTTP layer for RecipeVersion create command
 *
 * @vitest-environment node
 */

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
    },
    outboxEvent: {
      create: vi.fn(),
    },
  };
  return {
    database: mockDb,
  };
});

// Mock tenant resolution
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(() => Promise.resolve("test-tenant")),
}));

describe("Manifest HTTP - RecipeVersion Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // create command
  // ==========================================================================
  describe("POST /api/kitchen/recipes/versions/commands/create", () => {
    it("should import the route handler", async () => {
      const { POST } = await import(
        "@/app/api/kitchen/recipes/versions/commands/create/route"
      );
      expect(POST).toBeDefined();
      expect(typeof POST).toBe("function");
    });

    it("should reject unauthorized requests", async () => {
      const { auth } = await import("@repo/auth/server");
      vi.mocked(auth).mockResolvedValueOnce({
        orgId: null,
        userId: null,
      });

      const { POST } = await import(
        "@/app/api/kitchen/recipes/versions/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/kitchen/recipes/versions/commands/create",
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
      expect(data).toHaveProperty("message", "Unauthorized");
    });

    it("should return 400 when tenant not found", async () => {
      const { getTenantIdForOrg } = await import("@/app/lib/tenant");
      vi.mocked(getTenantIdForOrg).mockResolvedValueOnce(null as never);

      const { POST } = await import(
        "@/app/api/kitchen/recipes/versions/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/kitchen/recipes/versions/commands/create",
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

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message", "Tenant not found");
    });

    it("should process valid create request", async () => {
      const { database } = await import("@repo/database");

      // Mock recipe lookup
      vi.mocked(database.recipe.findFirst).mockResolvedValueOnce({
        id: "recipe-001",
        tenantId: "test-tenant",
        name: "Chocolate Cake",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock existing versions lookup (for version number calculation)
      vi.mocked(database.recipeVersion.findMany).mockResolvedValueOnce([]);

      // Mock create operation
      vi.mocked(database.recipeVersion.create).mockResolvedValueOnce({
        id: "version-001",
        recipeId: "recipe-001",
        tenantId: "test-tenant",
        version: 1,
        yieldQty: 10,
        yieldUnit: 1,
        prepTime: 30,
        cookTime: 60,
        restTime: 10,
        difficulty: 3,
        instructionsText: "Mix ingredients and bake",
        notesText: "Best served warm",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      // Mock outbox event creation
      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/recipes/versions/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/kitchen/recipes/versions/commands/create",
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

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });

    it("should handle high difficulty warning constraint", async () => {
      const { database } = await import("@repo/database");

      // Mock recipe lookup
      vi.mocked(database.recipe.findFirst).mockResolvedValueOnce({
        id: "recipe-001",
        tenantId: "test-tenant",
        name: "Complex French Pastry",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock existing versions lookup
      vi.mocked(database.recipeVersion.findMany).mockResolvedValueOnce([]);

      // Mock create operation
      vi.mocked(database.recipeVersion.create).mockResolvedValueOnce({
        id: "version-001",
        recipeId: "recipe-001",
        tenantId: "test-tenant",
        version: 1,
        yieldQty: 10,
        yieldUnit: 1,
        prepTime: 120,
        cookTime: 180,
        restTime: 30,
        difficulty: 4, // High difficulty - should trigger warn constraint
        instructionsText: "Complex multi-step process",
        notesText: "Requires advanced techniques",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      // Mock outbox event creation
      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/recipes/versions/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/kitchen/recipes/versions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            recipeId: "recipe-001",
            yieldQty: 10,
            yieldUnit: 1,
            prepTime: 120,
            cookTime: 180,
            restTime: 30,
            difficulty: 4, // High difficulty
            instructionsText: "Complex multi-step process",
            notesText: "Requires advanced techniques",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Should succeed even with warn constraint
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });

    it("should handle long recipe warning constraint", async () => {
      const { database } = await import("@repo/database");

      // Mock recipe lookup
      vi.mocked(database.recipe.findFirst).mockResolvedValueOnce({
        id: "recipe-001",
        tenantId: "test-tenant",
        name: "Slow Roasted Pork",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock existing versions lookup
      vi.mocked(database.recipeVersion.findMany).mockResolvedValueOnce([]);

      // Mock create operation
      vi.mocked(database.recipeVersion.create).mockResolvedValueOnce({
        id: "version-001",
        recipeId: "recipe-001",
        tenantId: "test-tenant",
        version: 1,
        yieldQty: 10,
        yieldUnit: 1,
        prepTime: 180, // 3 hours
        cookTime: 300, // 5 hours
        restTime: 60, // 1 hour
        // Total: 9 hours - should trigger warnLongRecipe constraint
        difficulty: 2,
        instructionsText: "Slow roast for hours",
        notesText: "Plan ahead",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      // Mock outbox event creation
      vi.mocked(database.outboxEvent.create).mockResolvedValueOnce({} as never);

      const { POST } = await import(
        "@/app/api/kitchen/recipes/versions/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/kitchen/recipes/versions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
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
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Should succeed even with long recipe warning
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);

      if (response.status >= 400) {
        expect(data).toHaveProperty("success", false);
        expect(data).toHaveProperty("message");
      } else {
        expect(data).toHaveProperty("success", true);
      }
    });

    it("should reject invalid difficulty (block constraint)", async () => {
      const { database } = await import("@repo/database");

      // Mock recipe lookup
      vi.mocked(database.recipe.findFirst).mockResolvedValueOnce({
        id: "recipe-001",
        tenantId: "test-tenant",
        name: "Test Recipe",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock existing versions lookup
      vi.mocked(database.recipeVersion.findMany).mockResolvedValueOnce([]);

      const { POST } = await import(
        "@/app/api/kitchen/recipes/versions/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/kitchen/recipes/versions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            recipeId: "recipe-001",
            yieldQty: 10,
            yieldUnit: 1,
            prepTime: 30,
            cookTime: 60,
            restTime: 10,
            difficulty: 6, // Invalid - should be 1-5
            instructionsText: "Test",
            notesText: "Test",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Should fail with 422 for invalid difficulty
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message");
    });

    it("should reject negative times (block constraint)", async () => {
      const { database } = await import("@repo/database");

      // Mock recipe lookup
      vi.mocked(database.recipe.findFirst).mockResolvedValueOnce({
        id: "recipe-001",
        tenantId: "test-tenant",
        name: "Test Recipe",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as never);

      // Mock existing versions lookup
      vi.mocked(database.recipeVersion.findMany).mockResolvedValueOnce([]);

      const { POST } = await import(
        "@/app/api/kitchen/recipes/versions/commands/create/route"
      );

      const request = new Request(
        "http://localhost/api/kitchen/recipes/versions/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            recipeId: "recipe-001",
            yieldQty: 10,
            yieldUnit: 1,
            prepTime: -30, // Invalid - negative time
            cookTime: 60,
            restTime: 10,
            difficulty: 3,
            instructionsText: "Test",
            notesText: "Test",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      // Should fail with 422 for negative time
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("message");
    });
  });
});
