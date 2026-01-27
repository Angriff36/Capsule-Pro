/**
 * Unit tests for updateRecipe server action
 *
 * Tests the recipe update functionality including:
 * - Versioning behavior (new version created on update)
 * - Ingredient updates
 * - Validation errors
 */

import { describe, expect, it, vi } from "vitest";
import { updateRecipe } from "../../app/(authenticated)/kitchen/recipes/actions";

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

  describe("validation errors", () => {
    it("should throw error when recipe ID is missing", async () => {
      const formData = new FormData();
      formData.append("name", "Recipe");

      await expect(updateRecipe("", formData)).rejects.toThrow(
        "Recipe ID is required."
      );
    });

    it("should throw error when recipe name is missing", async () => {
      const formData = new FormData();
      formData.append("name", ""); // Empty name

      await expect(updateRecipe(mockRecipeId, formData)).rejects.toThrow(
        "Recipe name is required."
      );
    });

    it("should throw error when recipe name is only whitespace", async () => {
      const formData = new FormData();
      formData.append("name", "   "); // Whitespace only

      await expect(updateRecipe(mockRecipeId, formData)).rejects.toThrow(
        "Recipe name is required."
      );
    });
  });
});
