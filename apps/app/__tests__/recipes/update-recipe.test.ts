/**
 * Unit tests for updateRecipe server action
 *
 * Tests the recipe update functionality including:
 * - Versioning behavior (new version created on update)
 * - Ingredient updates
 * - Validation errors
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateRecipe } from "../../app/(authenticated)/kitchen/recipes/actions";

// Import after mocking
import { database } from "@repo/database";

// Mock the tenant module
vi.mock(
  "../../app/(authenticated)/kitchen/recipes/../../../lib/tenant",
  async () => {
    return {
      requireTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
    };
  }
);

// Mock next/cache for revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/navigation for redirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("updateRecipe", () => {
  const mockTenantId = "test-tenant-id";
  const mockRecipeId = "test-recipe-id";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("versioning behavior", () => {
    it("should create a new version when updating a recipe", async () => {
      // Mock database responses
      const mockExistingRecipe = [
        {
          id: mockRecipeId,
          tenant_id: mockTenantId,
        },
      ];

      const mockMaxVersion = [{ max: 1 }]; // Current version is 1
      const mockCurrentVersion = [{ id: "version-1" }]; // Current version ID
      const mockUnits = [{ id: 1, code: "servings" }];

      // Setup mock chain for $queryRaw
      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingRecipe as never); // Verify recipe exists
      queryRawSpy.mockResolvedValueOnce(mockMaxVersion as never); // Get max version
      queryRawSpy.mockResolvedValueOnce(mockCurrentVersion as never); // Get current version
      queryRawSpy.mockResolvedValueOnce(mockUnits as never); // Get units
      queryRawSpy.mockResolvedValueOnce(mockUnits as never); // Get fallback unit
      queryRawSpy.mockResolvedValueOnce([] as never); // Ingredient check

      // Execute update
      const formData = new FormData();
      formData.append("name", "Updated Recipe");
      formData.append("category", "Main Course");
      formData.append("description", "Updated description");
      formData.append("yieldQuantity", "4");
      formData.append("yieldUnit", "servings");
      formData.append("prepTimeMinutes", "30");
      formData.append("cookTimeMinutes", "60");
      formData.append("difficultyLevel", "3");
      formData.append("ingredients", "2 cups flour\n1 cup sugar");
      formData.append("steps", "Mix ingredients\nBake for 30 minutes");

      await updateRecipe(mockRecipeId, formData);

      // Verify new version was created with incremented version number (2)
      const executeRawCalls = vi.mocked(database.$executeRaw).mock.calls;
      const versionInsertCall = executeRawCalls.find((call) => {
        const sql = call[0];
        return sql && sql.text && sql.text.includes("recipe_versions");
      });

      expect(versionInsertCall).toBeDefined();
      expect(versionInsertCall?.[0].values).toContain(2); // Next version number should be 2
    });

    it("should soft-delete old version's ingredients and steps", async () => {
      const mockExistingRecipe = [
        {
          id: mockRecipeId,
          tenant_id: mockTenantId,
        },
      ];

      const mockMaxVersion = [{ max: 1 }];
      const mockCurrentVersion = [{ id: "version-1" }];
      const mockUnits = [{ id: 1, code: "servings" }];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingRecipe as never);
      queryRawSpy.mockResolvedValueOnce(mockMaxVersion as never);
      queryRawSpy.mockResolvedValueOnce(mockCurrentVersion as never);
      queryRawSpy.mockResolvedValueOnce(mockUnits as never);
      queryRawSpy.mockResolvedValueOnce(mockUnits as never);
      queryRawSpy.mockResolvedValueOnce([] as never);

      const formData = new FormData();
      formData.append("name", "Updated Recipe");
      formData.append("yieldQuantity", "4");
      formData.append("yieldUnit", "servings");
      formData.append("ingredients", "2 cups flour");
      formData.append("steps", "Mix and bake");

      await updateRecipe(mockRecipeId, formData);

      // Verify soft deletes were called
      const executeRawCalls = vi.mocked(database.$executeRaw).mock.calls;
      const softDeleteCalls = executeRawCalls.filter((call) => {
        const sql = call[0];
        return (
          sql &&
          sql.text &&
          (sql.text.includes("UPDATE tenant_kitchen.recipe_ingredients") ||
            sql.text.includes("UPDATE tenant_kitchen.recipe_steps"))
        );
      });

      expect(softDeleteCalls.length).toBe(2); // One for ingredients, one for steps
      softDeleteCalls.forEach((call) => {
        expect(call[0].text).toContain("SET deleted_at = NOW()");
      });
    });

    it("should enqueue outbox event for recipe update", async () => {
      const mockExistingRecipe = [
        {
          id: mockRecipeId,
          tenant_id: mockTenantId,
        },
      ];

      const mockMaxVersion = [{ max: 1 }];
      const mockCurrentVersion = [{ id: "version-1" }];
      const mockUnits = [{ id: 1, code: "servings" }];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingRecipe as never);
      queryRawSpy.mockResolvedValueOnce(mockMaxVersion as never);
      queryRawSpy.mockResolvedValueOnce(mockCurrentVersion as never);
      queryRawSpy.mockResolvedValueOnce(mockUnits as never);
      queryRawSpy.mockResolvedValueOnce(mockUnits as never);
      queryRawSpy.mockResolvedValueOnce([] as never);

      const formData = new FormData();
      formData.append("name", "Updated Recipe");
      formData.append("yieldQuantity", "4");
      formData.append("yieldUnit", "servings");
      formData.append("ingredients", "2 cups flour");
      formData.append("steps", "Bake");

      await updateRecipe(mockRecipeId, formData);

      // Verify outbox event was created
      expect(database.outboxEvent.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          aggregateType: "recipe",
          aggregateId: mockRecipeId,
          eventType: "recipe.updated",
          payload: {
            recipeId: mockRecipeId,
            versionNumber: 2,
          },
        },
      });
    });
  });

  describe("ingredient updates", () => {
    it("should parse ingredient lines correctly", async () => {
      const mockExistingRecipe = [
        { id: mockRecipeId, tenant_id: mockTenantId },
      ];

      const mockMaxVersion = [{ max: 1 }];
      const mockCurrentVersion = [{ id: "version-1" }];
      const mockUnits = [
        { id: 1, code: "servings" },
        { id: 2, code: "cup" },
        { id: 3, code: "tbsp" },
        { id: 4, code: "tsp" },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingRecipe as never);
      queryRawSpy.mockResolvedValueOnce(mockMaxVersion as never);
      queryRawSpy.mockResolvedValueOnce(mockCurrentVersion as never);
      queryRawSpy.mockResolvedValueOnce(mockUnits as never);
      queryRawSpy.mockResolvedValueOnce(mockUnits as never);
      queryRawSpy.mockResolvedValueOnce([] as never);

      const formData = new FormData();
      formData.append("name", "Recipe");
      formData.append("yieldQuantity", "4");
      formData.append("yieldUnit", "servings");
      formData.append("ingredients", "1.5 cups flour\n2 tbsp sugar\n1 tsp salt");
      formData.append("steps", "Mix");

      await updateRecipe(mockRecipeId, formData);

      // Verify all ingredients were parsed and inserted
      const executeRawCalls = vi.mocked(database.$executeRaw).mock.calls;
      const ingredientInserts = executeRawCalls.filter((call) => {
        const sql = call[0];
        return sql && sql.text && sql.text.includes("recipe_ingredients");
      });

      expect(ingredientInserts.length).toBe(3); // 3 ingredients
    });
  });

  describe("validation errors", () => {
    it("should throw error when recipe ID is missing", async () => {
      const formData = new FormData();
      formData.append("name", "Recipe");

      await expect(updateRecipe("", formData)).rejects.toThrow(
        "Recipe ID is required."
      );
    });

    it("should throw error when recipe is not found", async () => {
      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce([] as never);

      const formData = new FormData();
      formData.append("name", "Recipe");

      await expect(updateRecipe(mockRecipeId, formData)).rejects.toThrow(
        "Recipe not found or access denied."
      );
    });

    it("should throw error when recipe belongs to different tenant", async () => {
      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce([
        {
          id: mockRecipeId,
          tenant_id: "different-tenant",
        },
      ] as never);

      const formData = new FormData();
      formData.append("name", "Recipe");

      await expect(updateRecipe(mockRecipeId, formData)).rejects.toThrow(
        "Recipe not found or access denied."
      );
    });

    it("should throw error when recipe name is missing", async () => {
      const mockExistingRecipe = [
        { id: mockRecipeId, tenant_id: mockTenantId },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingRecipe as never);

      const formData = new FormData();
      formData.append("name", ""); // Empty name

      await expect(updateRecipe(mockRecipeId, formData)).rejects.toThrow(
        "Recipe name is required."
      );
    });

    it("should throw error when recipe name is only whitespace", async () => {
      const mockExistingRecipe = [
        { id: mockRecipeId, tenant_id: mockTenantId },
      ];

      const queryRawSpy = vi.spyOn(database, "$queryRaw");
      queryRawSpy.mockResolvedValueOnce(mockExistingRecipe as never);

      const formData = new FormData();
      formData.append("name", "   "); // Whitespace only

      await expect(updateRecipe(mockRecipeId, formData)).rejects.toThrow(
        "Recipe name is required."
      );
    });
  });
});
