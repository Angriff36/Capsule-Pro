/**
 * @vitest-environment node
 *
 * Tests for automatic recipe cost updates when inventory prices change.
 * Spec requirement: "Update recipe costs automatically when inventory item prices change"
 * Spec invariant: "Cost updates must never be lost when inventory prices change"
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { recalculateRecipeCostsForInventoryItem } from "../app/lib/recipe-costing";

// Mock the database module
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
  Prisma: {
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    })),
  },
}));

describe("recipe-costing: automatic cost updates on inventory price change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero counts when no recipes use the inventory item", async () => {
    const { database } = await import("@repo/database");

    // Mock no affected ingredients found
    vi.mocked(database.$queryRaw).mockResolvedValueOnce([]);

    const result = await recalculateRecipeCostsForInventoryItem(
      "tenant-1",
      "inventory-item-1",
      "Organic Tomatoes"
    );

    expect(result).toEqual({
      updatedRecipes: 0,
      updatedIngredients: 0,
    });
  });

  it("recalculates costs for a single recipe when inventory item is used", async () => {
    const { database } = await import("@repo/database");

    // Mock affected ingredients
    vi.mocked(database.$queryRaw)
      // First call: find affected ingredients
      .mockResolvedValueOnce([
        { id: "ri-1", recipe_version_id: "rv-1" },
      ] as never)
      // Second call: calculate ingredient cost - ingredient data
      .mockResolvedValueOnce([
        {
          id: "ri-1",
          ingredient_id: "ing-1",
          ingredient_name: "Organic Tomatoes",
          quantity: 2,
          unit_id: 1,
          waste_factor: 1.1,
          inventory_unit_cost: 5.5,
          inventory_unit_id: 1,
        },
      ] as never)
      // Third call: load unit conversions
      .mockResolvedValueOnce([])
      // Fourth call: calculate recipe cost - recipe version data
      .mockResolvedValueOnce([{ id: "rv-1", yield_quantity: 4 }] as never)
      // Fifth call: get recipe ingredients for cost aggregation
      .mockResolvedValueOnce([
        {
          id: "ri-1",
          ingredient_name: "Organic Tomatoes",
          quantity: 2,
          unit_id: 1,
          waste_factor: 1.1,
          ingredient_cost: 12.1, // 2 * 1.1 * 5.5
        },
      ] as never);

    // Mock executeRaw for updates
    vi.mocked(database.$executeRaw).mockResolvedValue(1);

    const result = await recalculateRecipeCostsForInventoryItem(
      "tenant-1",
      "inventory-item-1",
      "Organic Tomatoes"
    );

    expect(result.updatedRecipes).toBe(1);
    expect(result.updatedIngredients).toBe(1);

    // Verify ingredient cost update was called
    expect(database.$executeRaw).toHaveBeenCalled();
  });

  it("recalculates costs for multiple recipes using the same inventory item", async () => {
    const { database } = await import("@repo/database");

    // Mock affected ingredients in different recipes
    vi.mocked(database.$queryRaw)
      // First call: find affected ingredients
      .mockResolvedValueOnce([
        { id: "ri-1", recipe_version_id: "rv-1" },
        { id: "ri-2", recipe_version_id: "rv-2" },
        { id: "ri-3", recipe_version_id: "rv-1" }, // Same recipe as ri-1
      ] as never)
      // Subsequent calls for ingredient cost calculations
      .mockResolvedValue([
        {
          id: "ri-1",
          ingredient_id: "ing-1",
          ingredient_name: "Organic Tomatoes",
          quantity: 2,
          unit_id: 1,
          waste_factor: 1.0,
          inventory_unit_cost: 5.5,
          inventory_unit_id: 1,
        },
      ] as never);

    // Mock executeRaw for updates
    vi.mocked(database.$executeRaw).mockResolvedValue(1);

    const result = await recalculateRecipeCostsForInventoryItem(
      "tenant-1",
      "inventory-item-1",
      "Organic Tomatoes"
    );

    // 3 ingredients, but only 2 unique recipe versions
    expect(result.updatedIngredients).toBe(3);
    expect(result.updatedRecipes).toBe(2);
  });

  it("handles ingredients with no inventory item link", async () => {
    const { database } = await import("@repo/database");

    // Mock affected ingredient without inventory link
    vi.mocked(database.$queryRaw)
      // First call: find affected ingredients
      .mockResolvedValueOnce([
        { id: "ri-1", recipe_version_id: "rv-1" },
      ] as never)
      // Second call: ingredient has no inventory item (cost = null)
      .mockResolvedValueOnce([
        {
          id: "ri-1",
          ingredient_id: "ing-1",
          ingredient_name: "Custom Ingredient",
          quantity: 2,
          unit_id: 1,
          waste_factor: 1.0,
          inventory_unit_cost: null, // No linked inventory item
          inventory_unit_id: null,
        },
      ] as never)
      // Third call: load unit conversions
      .mockResolvedValueOnce([])
      // Fourth call: recipe version data
      .mockResolvedValueOnce([{ id: "rv-1", yield_quantity: 4 }] as never)
      // Fifth call: ingredients with zero cost
      .mockResolvedValueOnce([
        {
          id: "ri-1",
          ingredient_name: "Custom Ingredient",
          quantity: 2,
          unit_id: 1,
          waste_factor: 1.0,
          ingredient_cost: null, // No cost calculated
        },
      ] as never);

    vi.mocked(database.$executeRaw).mockResolvedValue(1);

    const result = await recalculateRecipeCostsForInventoryItem(
      "tenant-1",
      "inventory-item-1",
      "Custom Ingredient"
    );

    // Should still process but with zero cost
    expect(result.updatedIngredients).toBe(1);
    expect(result.updatedRecipes).toBe(1);
  });
});

describe("recalculateRecipeCostsForInventoryItem integration verification", () => {
  it("function is exported and callable", () => {
    // Verify the function exists and can be called
    expect(typeof recalculateRecipeCostsForInventoryItem).toBe("function");
  });
});
