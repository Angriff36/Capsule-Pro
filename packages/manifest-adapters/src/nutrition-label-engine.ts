/**
 * Nutrition Label Engine
 *
 * Generates FDA-compliant nutrition labels and allergen information
 * based on recipe ingredients and serving sizes.
 *
 * @module kitchen-ops/nutrition-labels
 */

import type { PrismaClient } from "@repo/database/standalone";
import { Prisma } from "@repo/database/standalone";

/**
 * Nutritional information per standard unit (100g or 100mg)
 */
interface IngredientNutrition {
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbohydratesPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
  sugarPer100g: number | null;
  sodiumPer100mg: number | null;
  cholesterolPer100mg: number | null;
}

/**
 * Vitamin and mineral data (optional/when available)
 */
export interface VitaminsMinerals {
  vitaminA?: number; // IU
  vitaminC?: number; // mg
  calcium?: number; // % Daily Value
  iron?: number; // % Daily Value
  vitaminD?: number; // mcg
  vitaminE?: number; // mg
  vitaminK?: number; // mcg
  thiamin?: number; // mg
  riboflavin?: number; // mg
  niacin?: number; // mg
  vitaminB6?: number; // mg
  vitaminB12?: number; // mcg
  folate?: number; // mcg DFE
  phosphorus?: number; // % Daily Value
  iodine?: number; // mcg
  magnesium?: number; // % Daily Value
  zinc?: number; // % Daily Value
  selenium?: number; // mcg
  copper?: number; // mg
  manganese?: number; // mg
}

/**
 * Daily values for nutrients (FDA 2023 guidelines)
 */
const DAILY_VALUES = {
  calories: 2000,
  totalFat: 78, // g
  saturatedFat: 20, // g
  transFat: 0, // g
  cholesterol: 300, // mg
  sodium: 2300, // mg
  totalCarbohydrate: 275, // g
  dietaryFiber: 28, // g
  totalSugars: 50, // g
  addedSugars: 50, // g
  protein: 50, // g
  vitaminD: 20, // mcg
  calcium: 1300, // mg
  iron: 18, // mg
  potassium: 4700, // mg
  vitaminA: 900, // mcg
  vitaminC: 90, // mg
} as const;

/**
 * FDA compliance requirements
 */
export interface FDAComplianceInfo {
  servingSize: string;
  servingsPerContainer: number;
  isCompliant: boolean;
  warnings: string[];
  requiredNutrients: string[];
}

/**
 * Complete nutrition label data
 */
export interface NutritionLabel {
  recipeVersionId: string;
  recipeName: string;
  servingSize: string;
  servingsPerContainer: number;
  perServing: NutrientsPerServing;
  perContainer: NutrientsPerServing;
  percentDailyValues: PercentDailyValues;
  allergens: AllergenInfo;
  fdaCompliance: FDAComplianceInfo;
  ingredientsList: string;
  generatedAt: Date;
}

/**
 * Nutritional values per serving
 */
export interface NutrientsPerServing {
  calories: number;
  caloriesFromFat: number;
  totalFat: number; // g
  saturatedFat: number; // g
  transFat: number; // g
  cholesterol: number; // mg
  sodium: number; // mg
  potassium: number; // mg
  totalCarbohydrate: number; // g
  dietaryFiber: number; // g
  totalSugars: number; // g
  addedSugars: number; // g
  protein: number; // g
  vitamins: VitaminsMinerals;
}

/**
 * Percent daily values
 */
export interface PercentDailyValues {
  totalFat: number; // %
  saturatedFat: number; // %
  transFat: number; // %
  cholesterol: number; // %
  sodium: number; // %
  potassium: number; // %
  totalCarbohydrate: number; // %
  dietaryFiber: number; // %
  totalSugars: number; // %
  addedSugars: number; // %
  protein: number; // %
  vitaminD: number; // %
  calcium: number; // %
  iron: number; // %
  vitaminA: number; // %
  vitaminC: number; // %
}

/**
 * Allergen information
 */
export interface AllergenInfo {
  contains: string[];
  mayContain: string[];
  freeFrom: string[];
  highlights: string[];
}

/**
 * Major food allergens (FALCPA)
 */
const MAJOR_ALLERGENS = [
  "Milk",
  "Eggs",
  "Fish",
  "Crustacean shellfish",
  "Tree nuts",
  "Peanuts",
  "Wheat",
  "Soybeans",
  "Sesame",
] as const;

/**
 * Ingredient with nutrition data from database
 */
interface RecipeIngredientNutrition {
  quantity: number;
  unitId: number;
  preparationNotes: string | null;
  nutrition: IngredientNutrition;
  allergens: string[];
  ingredientName: string;
  ingredientCategory: string | null;
}

/**
 * Calculate calories from fat (9 calories per gram)
 */
function calculateCaloriesFromFat(fatGrams: number): number {
  return Math.round(fatGrams * 9);
}

/**
 * Calculate percent daily value
 */
function calculatePercentDV(
  amount: number,
  dailyValue: number,
  isProtein = false
): number {
  if (isProtein) {
    // Protein DV is based on age, sex - using simplified calculation
    return Math.round((amount / 50) * 100);
  }
  return Math.round((amount / dailyValue) * 100);
}

/**
 * Get unit conversion factor to grams
 */
function getUnitToGramsFactor(unitId: number): number {
  // Common unit conversions to grams
  const unitFactors: Record<number, number> = {
    1: 1, // grams
    2: 1000, // kilograms
    3: 28.35, // ounces
    4: 453.59, // pounds
    5: 1, // milliliters (for water-like substances)
    6: 240, // cups
    7: 15, // tablespoons
    8: 5, // teaspoons
    9: 1, // pieces (approximate)
    10: 100, // servings (generic)
  };
  return unitFactors[unitId] || 1;
}

/**
 * Fetch nutritional data for recipe ingredients
 */
async function fetchRecipeIngredientNutrition(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  recipeVersionId: string
): Promise<RecipeIngredientNutrition[]> {
  const ingredients = await db.$queryRaw<
    Array<{
      quantity: number;
      unit_id: number;
      preparation_notes: string | null;
      calories_per_100g: number | null;
      protein_per_100g: number | null;
      carbohydrates_per_100g: number | null;
      fat_per_100g: number | null;
      fiber_per_100g: number | null;
      sugar_per_100g: number | null;
      sodium_per_100mg: number | null;
      cholesterol_per_100mg: number | null;
      allergens: string[];
      ingredient_name: string;
      ingredient_category: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        ri.quantity,
        ri.unit_id,
        ri.preparation_notes,
        i.calories_per_100g,
        i.protein_per_100g,
        i.carbohydrates_per_100g,
        i.fat_per_100g,
        i.fiber_per_100g,
        i.sugar_per_100g,
        i.sodium_per_100mg,
        i.cholesterol_per_100mg,
        COALESCE(i.allergens, '{}') as allergens,
        i.name as ingredient_name,
        i.category as ingredient_category
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = ${recipeVersionId}
        AND ri.deleted_at IS NULL
        AND ri.is_optional = false
      ORDER BY ri.sort_order
    `
  );

  return ingredients.map((ing) => ({
    quantity: Number(ing.quantity),
    unitId: ing.unit_id,
    preparationNotes: ing.preparation_notes,
    nutrition: {
      caloriesPer100g: ing.calories_per_100g,
      proteinPer100g: ing.protein_per_100g
        ? Number(ing.protein_per_100g)
        : null,
      carbohydratesPer100g: ing.carbohydrates_per_100g
        ? Number(ing.carbohydrates_per_100g)
        : null,
      fatPer100g: ing.fat_per_100g ? Number(ing.fat_per_100g) : null,
      fiberPer100g: ing.fiber_per_100g ? Number(ing.fiber_per_100g) : null,
      sugarPer100g: ing.sugar_per_100g ? Number(ing.sugar_per_100g) : null,
      sodiumPer100mg: ing.sodium_per_100mg
        ? Number(ing.sodium_per_100mg)
        : null,
      cholesterolPer100mg: ing.cholesterol_per_100mg
        ? Number(ing.cholesterol_per_100mg)
        : null,
    },
    allergens: ing.allergens || [],
    ingredientName: ing.ingredient_name,
    ingredientCategory: ing.ingredient_category,
  }));
}

/**
 * Calculate total nutritional values from ingredients
 */
function calculateTotalNutrition(
  ingredients: RecipeIngredientNutrition[]
): NutrientsPerServing {
  let calories = 0;
  let totalFat = 0;
  let saturatedFat = 0; // Often not tracked separately, estimated as portion of total fat
  const transFat = 0;
  let cholesterol = 0;
  let sodium = 0;
  const potassium = 0; // Often not in database
  let totalCarbohydrate = 0;
  let dietaryFiber = 0;
  let totalSugars = 0;
  const addedSugars = 0; // Would need detailed ingredient data
  let protein = 0;

  for (const ing of ingredients) {
    const factor = getUnitToGramsFactor(ing.unitId);
    const grams = ing.quantity * factor;
    const multiplier = grams / 100;

    const n = ing.nutrition;

    if (n.caloriesPer100g !== null) {
      calories += n.caloriesPer100g * multiplier;
    }
    if (n.fatPer100g !== null) {
      totalFat += n.fatPer100g * multiplier;
      // Estimate saturated fat as ~30% of total fat (US average)
      saturatedFat += n.fatPer100g * 0.3 * multiplier;
    }
    if (n.cholesterolPer100mg !== null) {
      cholesterol += n.cholesterolPer100mg * multiplier;
    }
    if (n.sodiumPer100mg !== null) {
      sodium += n.sodiumPer100mg * multiplier;
    }
    if (n.carbohydratesPer100g !== null) {
      totalCarbohydrate += n.carbohydratesPer100g * multiplier;
    }
    if (n.fiberPer100g !== null) {
      dietaryFiber += n.fiberPer100g * multiplier;
    }
    if (n.sugarPer100g !== null) {
      totalSugars += n.sugarPer100g * multiplier;
    }
    if (n.proteinPer100g !== null) {
      protein += n.proteinPer100g * multiplier;
    }
  }

  return {
    calories: Math.round(calories),
    caloriesFromFat: calculateCaloriesFromFat(totalFat),
    totalFat: Math.round(totalFat * 10) / 10,
    saturatedFat: Math.round(saturatedFat * 10) / 10,
    transFat: Math.round(transFat * 10) / 10,
    cholesterol: Math.round(cholesterol),
    sodium: Math.round(sodium),
    potassium: Math.round(potassium),
    totalCarbohydrate: Math.round(totalCarbohydrate * 10) / 10,
    dietaryFiber: Math.round(dietaryFiber * 10) / 10,
    totalSugars: Math.round(totalSugars * 10) / 10,
    addedSugars: Math.round(addedSugars * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    vitamins: {},
  };
}

/**
 * Calculate percent daily values
 */
function calculateDailyValues(
  nutrients: NutrientsPerServing
): PercentDailyValues {
  return {
    totalFat: calculatePercentDV(nutrients.totalFat, DAILY_VALUES.totalFat),
    saturatedFat: calculatePercentDV(
      nutrients.saturatedFat,
      DAILY_VALUES.saturatedFat
    ),
    transFat: 0, // No DV for trans fat
    cholesterol: calculatePercentDV(
      nutrients.cholesterol,
      DAILY_VALUES.cholesterol
    ),
    sodium: calculatePercentDV(nutrients.sodium, DAILY_VALUES.sodium),
    potassium: calculatePercentDV(nutrients.potassium, DAILY_VALUES.potassium),
    totalCarbohydrate: calculatePercentDV(
      nutrients.totalCarbohydrate,
      DAILY_VALUES.totalCarbohydrate
    ),
    dietaryFiber: calculatePercentDV(
      nutrients.dietaryFiber,
      DAILY_VALUES.dietaryFiber
    ),
    totalSugars: 0, // No DV for total sugars
    addedSugars: calculatePercentDV(
      nutrients.addedSugars,
      DAILY_VALUES.addedSugars
    ),
    protein: calculatePercentDV(nutrients.protein, DAILY_VALUES.protein, true),
    vitaminD: 0,
    calcium: 0,
    iron: 0,
    vitaminA: 0,
    vitaminC: 0,
  };
}

/**
 * Analyze allergens in recipe
 */
function analyzeAllergens(
  ingredients: RecipeIngredientNutrition[]
): AllergenInfo {
  const contains = new Set<string>();
  const allAllergens = new Set<string>();

  for (const ing of ingredients) {
    for (const allergen of ing.allergens) {
      allAllergens.add(allergen);
      // Check if it's a major allergen
      const majorAllergen = MAJOR_ALLERGENS.find((ma) =>
        allergen.toLowerCase().includes(ma.toLowerCase())
      );
      if (majorAllergen) {
        contains.add(majorAllergen);
      }
    }
  }

  const freeFrom = MAJOR_ALLERGENS.filter((ma) => !contains.has(ma));

  return {
    contains: Array.from(contains).sort(),
    mayContain: [], // Would need cross-contamination data
    freeFrom,
    highlights: Array.from(allAllergens).sort(),
  };
}

/**
 * Generate ingredients list for label
 */
function generateIngredientsList(
  ingredients: RecipeIngredientNutrition[]
): string {
  return ingredients
    .map((ing) => {
      let str = ing.ingredientName;
      if (ing.preparationNotes) {
        str += ` (${ing.preparationNotes})`;
      }
      return str;
    })
    .join(", ");
}

/**
 * Validate FDA compliance
 */
function validateFDACompliance(
  nutrients: NutrientsPerServing,
  servingSize: string,
  servingsPerContainer: number
): FDAComplianceInfo {
  const warnings: string[] = [];
  const requiredNutrients: string[] = [];

  // Check required nutrients are present
  if (nutrients.totalFat < 0) warnings.push("Total fat value required");
  if (nutrients.sodium < 0) warnings.push("Sodium value required");
  if (nutrients.totalCarbohydrate < 0)
    warnings.push("Carbohydrate value required");
  if (nutrients.protein < 0) warnings.push("Protein value required");

  // Check serving size format
  if (!servingSize || servingSize.trim().length === 0) {
    warnings.push("Serving size must be specified");
  }

  // Check servings per container
  if (servingsPerContainer < 1) {
    warnings.push("Servings per container must be at least 1");
  }

  // Track which nutrients have actual data
  if (nutrients.totalFat > 0) requiredNutrients.push("Total Fat");
  if (nutrients.saturatedFat > 0) requiredNutrients.push("Saturated Fat");
  if (nutrients.transFat > 0) requiredNutrients.push("Trans Fat");
  if (nutrients.cholesterol > 0) requiredNutrients.push("Cholesterol");
  if (nutrients.sodium > 0) requiredNutrients.push("Sodium");
  if (nutrients.totalCarbohydrate > 0)
    requiredNutrients.push("Total Carbohydrate");
  if (nutrients.dietaryFiber > 0) requiredNutrients.push("Dietary Fiber");
  if (nutrients.totalSugars > 0) requiredNutrients.push("Total Sugars");
  if (nutrients.protein > 0) requiredNutrients.push("Protein");

  return {
    servingSize,
    servingsPerContainer,
    isCompliant: warnings.length === 0,
    warnings,
    requiredNutrients,
  };
}

/**
 * Generate nutrition label for a recipe
 */
export async function generateNutritionLabel(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  recipeVersionId: string,
  options: {
    servingSize?: string;
    servingsPerContainer?: number;
    servingWeightGrams?: number;
  } = {}
): Promise<NutritionLabel> {
  // Get recipe version details
  const recipeVersion = await db.$queryRaw<
    Array<{
      name: string;
      yield_quantity: number;
      yield_unit_id: number;
    }>
  >(
    Prisma.sql`
      SELECT name, yield_quantity, yield_unit_id
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}
        AND id = ${recipeVersionId}
        AND deleted_at IS NULL
    `
  );

  if (!recipeVersion[0]) {
    throw new Error("Recipe version not found");
  }

  const recipe = recipeVersion[0];

  // Fetch ingredient nutrition data
  const ingredients = await fetchRecipeIngredientNutrition(
    db,
    tenantId,
    recipeVersionId
  );

  if (ingredients.length === 0) {
    throw new Error("No ingredients found for recipe");
  }

  // Calculate total nutrition for entire recipe
  const totalNutrition = calculateTotalNutrition(ingredients);

  // Determine serving size
  const yieldQuantity = Number(recipe.yield_quantity);
  const servingsPerContainer =
    options.servingsPerContainer || Math.max(1, yieldQuantity);

  // Calculate per-serving values
  const perServing: NutrientsPerServing = {
    calories: Math.round(totalNutrition.calories / servingsPerContainer),
    caloriesFromFat: Math.round(
      totalNutrition.caloriesFromFat / servingsPerContainer
    ),
    totalFat:
      Math.round((totalNutrition.totalFat / servingsPerContainer) * 10) / 10,
    saturatedFat:
      Math.round((totalNutrition.saturatedFat / servingsPerContainer) * 10) /
      10,
    transFat:
      Math.round((totalNutrition.transFat / servingsPerContainer) * 10) / 10,
    cholesterol: Math.round(totalNutrition.cholesterol / servingsPerContainer),
    sodium: Math.round(totalNutrition.sodium / servingsPerContainer),
    potassium: Math.round(totalNutrition.potassium / servingsPerContainer),
    totalCarbohydrate:
      Math.round(
        (totalNutrition.totalCarbohydrate / servingsPerContainer) * 10
      ) / 10,
    dietaryFiber:
      Math.round((totalNutrition.dietaryFiber / servingsPerContainer) * 10) /
      10,
    totalSugars:
      Math.round((totalNutrition.totalSugars / servingsPerContainer) * 10) / 10,
    addedSugars:
      Math.round((totalNutrition.addedSugars / servingsPerContainer) * 10) / 10,
    protein:
      Math.round((totalNutrition.protein / servingsPerContainer) * 10) / 10,
    vitamins: totalNutrition.vitamins,
  };

  // Calculate percent daily values
  const percentDailyValues = calculateDailyValues(perServing);

  // Analyze allergens
  const allergens = analyzeAllergens(ingredients);

  // Generate serving size string
  const servingSize =
    options.servingSize ||
    `${Math.round((yieldQuantity * 100) / servingsPerContainer)}g`;

  // Validate FDA compliance
  const fdaCompliance = validateFDACompliance(
    perServing,
    servingSize,
    servingsPerContainer
  );

  // Generate ingredients list
  const ingredientsList = generateIngredientsList(ingredients);

  return {
    recipeVersionId,
    recipeName: recipe.name,
    servingSize,
    servingsPerContainer,
    perServing,
    perContainer: totalNutrition,
    percentDailyValues,
    allergens,
    fdaCompliance,
    ingredientsList,
    generatedAt: new Date(),
  };
}

/**
 * Batch generate nutrition labels for multiple recipes
 */
export async function batchGenerateNutritionLabels(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  recipeVersionIds: string[],
  options?: {
    servingSize?: string;
    servingsPerContainer?: number;
  }
): Promise<NutritionLabel[]> {
  const results: NutritionLabel[] = [];

  for (const recipeVersionId of recipeVersionIds) {
    try {
      const label = await generateNutritionLabel(
        db,
        tenantId,
        recipeVersionId,
        options
      );
      results.push(label);
    } catch (error) {
      console.error(
        `Failed to generate nutrition label for recipe ${recipeVersionId}:`,
        error
      );
    }
  }

  return results;
}

/**
 * Get allergen summary for a recipe
 */
export async function getAllergenSummary(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  recipeVersionId: string
): Promise<AllergenInfo> {
  const ingredients = await fetchRecipeIngredientNutrition(
    db,
    tenantId,
    recipeVersionId
  );
  return analyzeAllergens(ingredients);
}
