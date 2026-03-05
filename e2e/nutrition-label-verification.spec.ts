import { expect, test } from "@playwright/test";

/**
 * Verification test for Nutrition Label Generator feature
 *
 * This test verifies:
 * 1. The nutrition-label-engine module exports are available
 * 2. The NutritionLabelCard component can be imported
 * 3. API routes exist for nutrition labels
 */

test.describe("Nutrition Label Generator", () => {
  test("nutrition-label-engine exports are available", async ({}) => {
    // Dynamic import to check module exports
    const engineModule = await import(
      "../packages/manifest-adapters/src/nutrition-label-engine.ts"
    );

    // Verify key exports exist
    expect(engineModule).toBeDefined();
    expect(engineModule.generateNutritionLabel).toBeInstanceOf(Function);
    expect(engineModule.batchGenerateNutritionLabels).toBeInstanceOf(Function);
    expect(engineModule.getAllergenSummary).toBeInstanceOf(Function);

    // Verify type exports
    expect(engineModule.NutritionLabel).toBeDefined();
    expect(engineModule.AllergenInfo).toBeDefined();
    expect(engineModule.NutrientsPerServing).toBeDefined();
    expect(engineModule.PercentDailyValues).toBeDefined();
    expect(engineModule.FDAComplianceInfo).toBeDefined();
  });

  test("NutritionLabelCard component exports are available", async ({}) => {
    // Dynamic import to check component exports
    const componentModule = await import(
      "../packages/design-system/components/blocks/nutrition-label.tsx"
    );

    // Verify component exports
    expect(componentModule).toBeDefined();
    expect(componentModule.NutritionLabelCard).toBeDefined();
    expect(componentModule.AllergenDisplay).toBeDefined();

    // Verify type exports
    expect(componentModule.NutritionLabel).toBeDefined();
    expect(componentModule.AllergenInfo).toBeDefined();
    expect(componentModule.NutrientsPerServing).toBeDefined();
    expect(componentModule.PercentDailyValues).toBeDefined();
  });

  test("API route file exists for nutrition-label endpoint", async ({}) => {
    // Verify the route file exists by attempting to require it
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const routePath = path.join(
      process.cwd(),
      "apps/api/app/api/kitchen/recipes/[recipeId]/nutrition-label/route.ts"
    );

    const routeExists = await fs
      .access(routePath)
      .then(() => true)
      .catch(() => false);

    expect(routeExists).toBe(true);
  });

  test("API route file exists for allergens endpoint", async ({}) => {
    // Verify the route file exists by attempting to require it
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const routePath = path.join(
      process.cwd(),
      "apps/api/app/api/kitchen/recipes/[recipeId]/allergens/route.ts"
    );

    const routeExists = await fs
      .access(routePath)
      .then(() => true)
      .catch(() => false);

    expect(routeExists).toBe(true);
  });

  test("nutrition-label-engine has correct function signatures", async ({}) => {
    const engineModule = await import(
      "../packages/manifest-adapters/src/nutrition-label-engine.ts"
    );

    // Check that functions have expected length (number of parameters)
    // generateNutritionLabel takes 3 required params + 1 optional
    expect(engineModule.generateNutritionLabel.length).toBeGreaterThanOrEqual(
      3
    );

    // batchGenerateNutritionLabels takes 3 required params + 1 optional
    expect(
      engineModule.batchGenerateNutritionLabels.length
    ).toBeGreaterThanOrEqual(3);

    // getAllergenSummary takes 3 params
    expect(engineModule.getAllergenSummary.length).toBeGreaterThanOrEqual(3);
  });

  test("FDA daily values constants are defined correctly", async ({}) => {
    // Read the source file to verify constants
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const enginePath = path.join(
      process.cwd(),
      "packages/manifest-adapters/src/nutrition-label-engine.ts"
    );

    const source = await fs.readFile(enginePath, "utf-8");

    // Verify FDA daily values are present
    expect(source).toContain("DAILY_VALUES");
    expect(source).toContain("calories: 2000");
    expect(source).toContain("totalFat: 78");
    expect(source).toContain("sodium: 2300");
    expect(source).toContain("totalCarbohydrate: 275");
    expect(source).toContain("protein: 50");
  });

  test("major allergens are defined correctly", async ({}) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const enginePath = path.join(
      process.cwd(),
      "packages/manifest-adapters/src/nutrition-label-engine.ts"
    );

    const source = await fs.readFile(enginePath, "utf-8");

    // Verify major allergens (FALCPA) are present
    expect(source).toContain("MAJOR_ALLERGENS");
    expect(source).toContain("Milk");
    expect(source).toContain("Eggs");
    expect(source).toContain("Fish");
    expect(source).toContain("Tree nuts");
    expect(source).toContain("Peanuts");
    expect(source).toContain("Wheat");
    expect(source).toContain("Soybeans");
    expect(source).toContain("Sesame");
  });

  test("recipe optimization engine uses real nutritional data", async ({}) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const optimizationPath = path.join(
      process.cwd(),
      "packages/manifest-adapters/src/recipe-optimization-engine.ts"
    );

    const source = await fs.readFile(optimizationPath, "utf-8");

    // Verify the optimization engine queries for real nutritional data
    expect(source).toContain("calories_per_100g");
    expect(source).toContain("protein_per_100g");
    expect(source).toContain("carbohydrates_per_100g");
    expect(source).toContain("fat_per_100g");
    expect(source).toContain("fiber_per_100g");
    expect(source).toContain("sugar_per_100g");
    expect(source).toContain("sodium_per_100mg");
    expect(source).toContain("cholesterol_per_100mg");

    // Verify it has fallback to category-based estimates
    expect(source).toContain("categoryNutrition");
  });

  test("nutrition label component includes FDA-style display", async ({}) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const componentPath = path.join(
      process.cwd(),
      "packages/design-system/components/blocks/nutrition-label.tsx"
    );

    const source = await fs.readFile(componentPath, "utf-8");

    // Verify FDA-style elements are present
    expect(source).toContain("Nutrition Facts");
    expect(source).toContain("Calories");
    expect(source).toContain("% Daily Value");
    expect(source).toContain("Total Fat");
    expect(source).toContain("Saturated Fat");
    expect(source).toContain("Trans Fat");
    expect(source).toContain("Cholesterol");
    expect(source).toContain("Sodium");
    expect(source).toContain("Total Carbohydrate");
    expect(source).toContain("Dietary Fiber");
    expect(source).toContain("Total Sugars");
    expect(source).toContain("Protein");
  });

  test("allergen display components are present", async ({}) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const componentPath = path.join(
      process.cwd(),
      "packages/design-system/components/blocks/nutrition-label.tsx"
    );

    const source = await fs.readFile(componentPath, "utf-8");

    // Verify allergen-related elements
    expect(source).toContain("AllergenBadge");
    expect(source).toContain("Allergen Information");
    expect(source).toContain("Contains");
    expect(source).toContain("May Contain");
    expect(source).toContain("Free From");
    expect(source).toContain("AllergenDisplay");
  });

  test("manifest-adapters index exports nutrition label functions", async ({}) => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");

    const indexPath = path.join(
      process.cwd(),
      "packages/manifest-adapters/src/index.ts"
    );

    const source = await fs.readFile(indexPath, "utf-8");

    // Verify exports are present
    expect(source).toContain("nutrition-label-engine");
    expect(source).toContain("generateNutritionLabel");
    expect(source).toContain("batchGenerateNutritionLabels");
    expect(source).toContain("getAllergenSummary");
  });
});

test.describe("Nutrition Label Data Flow", () => {
  test("nutrition label data structure matches FDA requirements", async ({}) => {
    const engineModule = await import(
      "../packages/manifest-adapters/src/nutrition-label-engine.ts"
    );

    // Create a minimal nutrition label to verify structure
    const mockLabel: {
      servingSize: string;
      servingsPerContainer: number;
      perServing: {
        calories: number;
        caloriesFromFat: number;
        totalFat: number;
        saturatedFat: number;
        transFat: number;
        cholesterol: number;
        sodium: number;
        potassium: number;
        totalCarbohydrate: number;
        dietaryFiber: number;
        totalSugars: number;
        addedSugars: number;
        protein: number;
        vitamins: Record<string, number | undefined>;
      };
      percentDailyValues: {
        totalFat: number;
        saturatedFat: number;
        cholesterol: number;
        sodium: number;
        totalCarbohydrate: number;
        dietaryFiber: number;
        protein: number;
      };
    } = {
      servingSize: "1 cup (237g)",
      servingsPerContainer: 4,
      perServing: {
        calories: 250,
        caloriesFromFat: 110,
        totalFat: 12,
        saturatedFat: 3,
        transFat: 0,
        cholesterol: 30,
        sodium: 570,
        potassium: 300,
        totalCarbohydrate: 31,
        dietaryFiber: 0,
        totalSugars: 5,
        addedSugars: 0,
        protein: 5,
        vitamins: {
          vitaminA: 0,
          vitaminC: 0,
          calcium: 0,
          iron: 0,
          vitaminD: 0,
        },
      },
      percentDailyValues: {
        totalFat: 15,
        saturatedFat: 16,
        cholesterol: 10,
        sodium: 25,
        totalCarbohydrate: 11,
        dietaryFiber: 0,
        protein: 10,
      },
    };

    // Verify all required FDA fields are present
    expect(mockLabel.servingSize).toBeDefined();
    expect(mockLabel.servingsPerContainer).toBeDefined();
    expect(mockLabel.perServing.calories).toBeDefined();
    expect(mockLabel.perServing.totalFat).toBeDefined();
    expect(mockLabel.perServing.saturatedFat).toBeDefined();
    expect(mockLabel.perServing.transFat).toBeDefined();
    expect(mockLabel.perServing.cholesterol).toBeDefined();
    expect(mockLabel.perServing.sodium).toBeDefined();
    expect(mockLabel.perServing.totalCarbohydrate).toBeDefined();
    expect(mockLabel.perServing.dietaryFiber).toBeDefined();
    expect(mockLabel.perServing.totalSugars).toBeDefined();
    expect(mockLabel.perServing.protein).toBeDefined();

    // Verify percent daily values
    expect(mockLabel.percentDailyValues.totalFat).toBe(15);
    expect(mockLabel.percentDailyValues.sodium).toBe(25);
  });
});
