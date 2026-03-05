import { expect, test } from "@playwright/test";

/**
 * Recipe Scaling Engine Verification Tests
 *
 * These tests verify the recipe scaling functionality:
 * 1. Scaling by yield with proper ingredient quantity adjustment
 * 2. Unit conversion between measurement systems
 * 3. Cost recalculation for scaled quantities
 * 4. Prep list generation from scaled recipes
 */

test.describe("Recipe Scaling Engine", () => {
  test("should scale recipe by yield with ingredient conversion", async ({
    request,
  }) => {
    // First, get a recipe to scale
    const recipesResponse = await request.get("/api/kitchen/recipes/list");

    expect(recipesResponse.ok()).toBeTruthy();

    const recipesData = await recipesResponse.json();
    const recipes = recipesData.data || [];

    if (recipes.length === 0) {
      test.skip(true, "No recipes available for testing");
      return;
    }

    const recipe = recipes[0];
    const recipeVersionId = recipe.id;

    // Get recipe details to understand original yield
    const recipeDetailResponse = await request.get(
      `/api/kitchen/recipes/${recipeVersionId}/versions`
    );

    expect(recipeDetailResponse.ok()).toBeTruthy();

    const detailData = await recipeDetailResponse.json();
    const versions = detailData.data || [];
    const latestVersion = versions[0];

    if (!latestVersion) {
      test.skip(true, "No recipe version available for testing");
      return;
    }

    const originalYield = latestVersion.yield?.quantity || 1;
    const originalYieldUnitId = latestVersion.yield?.unitId;

    // Scale the recipe to 2x yield
    const targetYield = originalYield * 2;

    const scaleResponse = await request.post(
      `/api/kitchen/recipes/${recipeVersionId}/scale-full`,
      {
        data: {
          targetYieldQuantity: targetYield,
          targetYieldUnitId: originalYieldUnitId,
          generatePrepList: true,
        },
      }
    );

    expect(scaleResponse.ok()).toBeTruthy();

    const scaleData = await scaleResponse.json();
    const scaledRecipe = scaleData.data.scaledRecipe;

    // Verify scale response structure
    expect(scaledRecipe).toBeDefined();
    expect(scaledRecipe.recipeVersionId).toBe(recipeVersionId);
    expect(scaledRecipe.originalYieldQuantity).toBe(originalYield);
    expect(scaledRecipe.targetYieldQuantity).toBe(targetYield);
    expect(scaledRecipe.scaleFactor).toBeCloseTo(2, 1);

    // Verify ingredients are scaled
    expect(scaledRecipe.ingredients).toBeDefined();
    expect(Array.isArray(scaledRecipe.ingredients)).toBeTruthy();

    if (scaledRecipe.ingredients.length > 0) {
      const firstIngredient = scaledRecipe.ingredients[0];

      expect(firstIngredient.scaledQuantity).toBeDefined();
      expect(firstIngredient.originalQuantity).toBeDefined();
      expect(firstIngredient.scaledQuantity).toBeCloseTo(
        firstIngredient.originalQuantity * 2,
        1
      );

      // Verify cost scaling
      expect(firstIngredient.scaledCost).toBeDefined();
      expect(scaledRecipe.scaledTotalCost).toBeDefined();
      expect(scaledRecipe.scaledTotalCost).toBeCloseTo(
        scaledRecipe.originalTotalCost * 2,
        1
      );
    }

    // Verify prep list is generated
    expect(scaleData.data.prepList).toBeDefined();
    expect(Array.isArray(scaleData.data.prepList)).toBeTruthy();
  });

  test("should convert ingredients to metric system", async ({ request }) => {
    const recipesResponse = await request.get("/api/kitchen/recipes/list");

    expect(recipesResponse.ok()).toBeTruthy();

    const recipesData = await recipesResponse.json();
    const recipes = recipesData.data || [];

    if (recipes.length === 0) {
      test.skip(true, "No recipes available for testing");
      return;
    }

    const recipe = recipes[0];
    const recipeVersionId = recipe.id;

    // Scale with metric conversion
    const scaleResponse = await request.post(
      `/api/kitchen/recipes/${recipeVersionId}/scale-full`,
      {
        data: {
          targetYieldQuantity: 10,
          convertToSystem: "metric",
          generatePrepList: false,
        },
      }
    );

    expect(scaleResponse.ok()).toBeTruthy();

    const scaleData = await scaleResponse.json();
    const scaledRecipe = scaleData.data.scaledRecipe;

    expect(scaledRecipe).toBeDefined();

    // Check that ingredients have been processed
    if (scaledRecipe.ingredients.length > 0) {
      // Verify units are present
      scaledRecipe.ingredients.forEach((ingredient: ScaledIngredient) => {
        expect(ingredient.scaledUnitCode).toBeDefined();
        expect(typeof ingredient.scaledUnitCode).toBe("string");
      });
    }
  });

  test("should convert ingredients to imperial system", async ({ request }) => {
    const recipesResponse = await request.get("/api/kitchen/recipes/list");

    expect(recipesResponse.ok()).toBeTruthy();

    const recipesData = await recipesResponse.json();
    const recipes = recipesData.data || [];

    if (recipes.length === 0) {
      test.skip(true, "No recipes available for testing");
      return;
    }

    const recipe = recipes[0];
    const recipeVersionId = recipe.id;

    // Scale with imperial conversion
    const scaleResponse = await request.post(
      `/api/kitchen/recipes/${recipeVersionId}/scale-full`,
      {
        data: {
          targetYieldQuantity: 10,
          convertToSystem: "imperial",
          generatePrepList: false,
        },
      }
    );

    expect(scaleResponse.ok()).toBeTruthy();

    const scaleData = await scaleResponse.json();
    const scaledRecipe = scaleData.data.scaledRecipe;

    expect(scaledRecipe).toBeDefined();

    // Check that ingredients have been processed
    if (scaledRecipe.ingredients.length > 0) {
      scaledRecipe.ingredients.forEach((ingredient: ScaledIngredient) => {
        expect(ingredient.scaledUnitCode).toBeDefined();
        expect(typeof ingredient.scaledUnitCode).toBe("string");
      });
    }
  });

  test("should generate prep list grouped by station", async ({ request }) => {
    const recipesResponse = await request.get("/api/kitchen/recipes/list");

    expect(recipesResponse.ok()).toBeTruthy();

    const recipesData = await recipesResponse.json();
    const recipes = recipesData.data || [];

    if (recipes.length === 0) {
      test.skip(true, "No recipes available for testing");
      return;
    }

    const recipe = recipes[0];
    const recipeVersionId = recipe.id;

    // Scale with prep list generation
    const scaleResponse = await request.post(
      `/api/kitchen/recipes/${recipeVersionId}/scale-full`,
      {
        data: {
          targetYieldQuantity: 10,
          generatePrepList: true,
        },
      }
    );

    expect(scaleResponse.ok()).toBeTruthy();

    const scaleData = await scaleResponse.json();
    const prepList = scaleData.data.prepList;

    expect(prepList).toBeDefined();
    expect(Array.isArray(prepList)).toBeTruthy();

    if (prepList.length > 0) {
      const firstStation = prepList[0];

      expect(firstStation.stationId).toBeDefined();
      expect(firstStation.stationName).toBeDefined();
      expect(firstStation.ingredients).toBeDefined();
      expect(Array.isArray(firstStation.ingredients)).toBeTruthy();

      // Verify station structure
      const knownStations = [
        "hot-line",
        "cold-prep",
        "bakery",
        "garnish",
        "prep-station",
      ];
      expect(knownStations).toContain(firstStation.stationId);
    }
  });

  test("should return error for invalid target yield", async ({ request }) => {
    const recipesResponse = await request.get("/api/kitchen/recipes/list");

    expect(recipesResponse.ok()).toBeTruthy();

    const recipesData = await recipesResponse.json();
    const recipes = recipesData.data || [];

    if (recipes.length === 0) {
      test.skip(true, "No recipes available for testing");
      return;
    }

    const recipe = recipes[0];
    const recipeVersionId = recipe.id;

    // Try to scale with invalid yield
    const scaleResponse = await request.post(
      `/api/kitchen/recipes/${recipeVersionId}/scale-full`,
      {
        data: {
          targetYieldQuantity: -1,
        },
      }
    );

    expect(scaleResponse.status()).toBe(400);

    const errorData = await scaleResponse.json();
    expect(errorData.error).toBeDefined();
  });

  test("should calculate cost per yield correctly", async ({ request }) => {
    const recipesResponse = await request.get("/api/kitchen/recipes/list");

    expect(recipesResponse.ok()).toBeTruthy();

    const recipesData = await recipesResponse.json();
    const recipes = recipesData.data || [];

    if (recipes.length === 0) {
      test.skip(true, "No recipes available for testing");
      return;
    }

    const recipe = recipes[0];
    const recipeVersionId = recipe.id;

    // Scale recipe
    const scaleResponse = await request.post(
      `/api/kitchen/recipes/${recipeVersionId}/scale-full`,
      {
        data: {
          targetYieldQuantity: 5,
        },
      }
    );

    expect(scaleResponse.ok()).toBeTruthy();

    const scaleData = await scaleResponse.json();
    const scaledRecipe = scaleData.data.scaledRecipe;

    // Verify cost calculations
    expect(scaledRecipe.originalTotalCost).toBeDefined();
    expect(scaledRecipe.scaledTotalCost).toBeDefined();
    expect(scaledRecipe.originalCostPerYield).toBeDefined();
    expect(scaledRecipe.scaledCostPerYield).toBeDefined();

    // Cost per yield should be proportional to scale factor
    const expectedCostPerYield =
      scaledRecipe.originalCostPerYield * scaledRecipe.scaleFactor;
    expect(scaledRecipe.scaledCostPerYield).toBeCloseTo(
      expectedCostPerYield,
      1
    );
  });
});

interface ScaledIngredient {
  ingredientId: string;
  ingredientName: string;
  originalQuantity: number;
  originalUnitCode: string;
  scaledQuantity: number;
  scaledUnitCode: string;
  category: string | null;
  scaledCost: number;
}
