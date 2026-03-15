/**
 * Recipe Optimization Engine
 *
 * Provides AI-powered recipe optimization capabilities including:
 * - Cost reduction suggestions based on ingredient substitutions
 * - Nutritional analysis and improvement recommendations
 * - Ingredient availability optimization
 * - Quality preservation analysis
 *
 * @module kitchen-ops/recipe-optimization
 */

import type { PrismaClient } from "@repo/database/standalone";
import { Prisma } from "@repo/database/standalone";

/**
 * Nutritional information per serving
 */
export interface NutritionalInfo {
  calories: number;
  protein: number; // grams
  carbohydrates: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // mg
  cholesterol: number; // mg
}

/**
 * Ingredient substitution suggestion
 */
export interface IngredientSubstitution {
  originalIngredientId: string;
  originalIngredientName: string;
  originalQuantity: number;
  originalUnitId: number;
  originalCost: number;
  suggestedIngredientId: string;
  suggestedIngredientName: string;
  suggestedQuantity: number;
  suggestedUnitId: number;
  suggestedCost: number;
  costSavings: number;
  costSavingsPercentage: number;
  reason: string;
  qualityImpact: "positive" | "neutral" | "negative";
  allergenChanges: string[];
}

/**
 * Cost optimization opportunity
 */
export interface CostOptimization {
  category:
    | "ingredient_substitution"
    | "quantity_adjustment"
    | "supplier_change"
    | "waste_reduction";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  potentialSavings: number;
  potentialSavingsPercentage: number;
  substitutions: IngredientSubstitution[];
  implementation: string;
  risks: string[];
}

/**
 * Nutritional analysis result
 */
export interface NutritionalAnalysis {
  perServing: NutritionalInfo;
  perRecipe: NutritionalInfo;
  healthScore: number; // 0-100
  nutrientHighlights: string[];
  concerns: string[];
  improvementSuggestions: NutritionalImprovement[];
}

/**
 * Nutritional improvement suggestion
 */
export interface NutritionalImprovement {
  type: "reduce" | "increase" | "substitute";
  nutrient: string;
  currentValue: number;
  targetValue: number;
  suggestion: string;
  impact: string;
}

/**
 * Full recipe optimization result
 */
export interface RecipeOptimization {
  recipeVersionId: string;
  recipeName: string;
  currentCost: number;
  currentCostPerYield: number;
  optimizedCost: number;
  optimizedCostPerYield: number;
  totalPotentialSavings: number;
  totalPotentialSavingsPercentage: number;
  costOptimizations: CostOptimization[];
  nutritionalAnalysis: NutritionalAnalysis;
  availabilityScore: number; // 0-100
  qualityScore: number; // 0-100
  overallScore: number; // 0-100
  generatedAt: Date;
}

/**
 * Ingredient with inventory and cost data
 */
interface IngredientData {
  id: string;
  name: string;
  category: string | null;
  allergens: string[];
  unitCost: number;
  availableQuantity: number;
  isInStock: boolean;
  nutritionalInfo?: NutritionalInfo;
}

/**
 * Calculate health score based on nutritional profile
 */
function calculateHealthScore(nutrition: NutritionalInfo): number {
  let score = 100;

  // Deduct points for excessive sodium (>1000mg per serving is high)
  if (nutrition.sodium > 1000)
    score -= Math.min(20, (nutrition.sodium - 1000) / 50);
  else if (nutrition.sodium < 600) score += 5; // Bonus for low sodium

  // Deduct points for excessive saturated fat (using total fat as proxy)
  if (nutrition.fat > 20) score -= Math.min(15, (nutrition.fat - 20) / 2);
  else if (nutrition.fat < 10) score += 5;

  // Deduct points for excessive sugar
  if (nutrition.sugar > 25) score -= Math.min(15, (nutrition.sugar - 25) / 2);
  else if (nutrition.sugar < 5) score += 5;

  // Bonus for high protein
  if (nutrition.protein > 20) score += 10;
  else if (nutrition.protein > 10) score += 5;

  // Bonus for high fiber
  if (nutrition.fiber > 5) score += 10;
  else if (nutrition.fiber > 3) score += 5;

  // Deduct points for excessive calories (>800 per serving is high)
  if (nutrition.calories > 800)
    score -= Math.min(10, (nutrition.calories - 800) / 50);

  return Math.max(0, Math.min(100, score));
}

/**
 * Find potential ingredient substitutions based on category and cost
 */
async function findSubstitutions(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  ingredientId: string,
  currentCost: number,
  category: string | null
): Promise<IngredientSubstitution[]> {
  const substitutions: IngredientSubstitution[] = [];

  // Get original ingredient details
  const original = await db.$queryRaw<
    Array<{
      id: string;
      name: string;
      category: string | null;
      allergens: string[];
    }>
  >(
    Prisma.sql`
      SELECT id, name, category, allergens
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND id = ${ingredientId}
        AND deleted_at IS NULL
    `
  );

  if (!original[0]) {
    return substitutions;
  }

  // Find cheaper alternatives in the same category
  const alternatives = await db.$queryRaw<
    Array<{
      id: string;
      name: string;
      category: string | null;
      allergens: string[];
      unit_cost: number;
      in_stock: boolean;
    }>
  >(
    Prisma.sql`
      SELECT
        i.id,
        i.name,
        i.category,
        i.allergens,
        COALESCE(ii.unit_cost, 0) as unit_cost,
        COALESCE(ii.quantity_on_hand, 0) > 0 as in_stock
      FROM tenant_kitchen.ingredients i
      LEFT JOIN tenant_inventory.inventory_items ii
        ON ii.ingredient_id = i.id
        AND ii.deleted_at IS NULL
      WHERE i.tenant_id = ${tenantId}
        AND i.id != ${ingredientId}
        AND i.deleted_at IS NULL
        AND i.category = ${category || original[0].category}
      ORDER BY unit_cost ASC
      LIMIT 5
    `
  );

  // Only suggest alternatives that are at least 10% cheaper
  const cheaperAlternatives = alternatives.filter(
    (alt) => Number(alt.unit_cost) < currentCost * 0.9
  );

  for (const alt of cheaperAlternatives) {
    const altCost = Number(alt.unit_cost);
    const costSavings = currentCost - altCost;
    const costSavingsPercentage = (costSavings / currentCost) * 100;

    // Check for allergen conflicts
    const allergenChanges = alt.allergens.filter(
      (a) => !original[0].allergens.includes(a)
    );

    // Determine quality impact based on cost difference
    let qualityImpact: "positive" | "neutral" | "negative" = "neutral";
    if (costSavingsPercentage > 30) {
      qualityImpact = "negative"; // Large cost savings may indicate quality difference
    } else if (alt.in_stock && costSavingsPercentage < 20) {
      qualityImpact = "neutral"; // Similar cost and available
    }

    substitutions.push({
      originalIngredientId: original[0].id,
      originalIngredientName: original[0].name,
      originalQuantity: 1,
      originalUnitId: 1,
      originalCost: currentCost,
      suggestedIngredientId: alt.id,
      suggestedIngredientName: alt.name,
      suggestedQuantity: 1,
      suggestedUnitId: 1,
      suggestedCost: altCost,
      costSavings,
      costSavingsPercentage,
      reason: `${alt.name} is ${costSavingsPercentage.toFixed(1)}% cheaper${alt.in_stock ? " and currently in stock" : ""}`,
      qualityImpact,
      allergenChanges,
    });
  }

  return substitutions;
}

/**
 * Analyze recipe and generate optimization suggestions
 */
export async function optimizeRecipe(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  recipeVersionId: string,
  targetYieldQuantity?: number
): Promise<RecipeOptimization> {
  // Get recipe version details
  const recipeVersion = await db.$queryRaw<
    Array<{
      id: string;
      name: string;
      yield_quantity: number;
      yield_unit_id: number;
      total_cost: number;
      cost_per_yield: number;
    }>
  >(
    Prisma.sql`
      SELECT id, name, yield_quantity, yield_unit_id, total_cost, cost_per_yield
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
  const currentCost = Number(recipe.total_cost);
  const currentCostPerYield = Number(recipe.cost_per_yield);

  // Get all ingredients with their details
  const ingredients = await db.$queryRaw<
    Array<{
      id: string;
      ingredient_id: string;
      ingredient_name: string;
      category: string | null;
      quantity: number;
      unit_id: number;
      waste_factor: number;
      ingredient_cost: number;
      allergens: string[];
    }>
  >(
    Prisma.sql`
      SELECT
        ri.id,
        ri.ingredient_id,
        i.name as ingredient_name,
        i.category,
        ri.quantity,
        ri.unit_id,
        COALESCE(ri.waste_factor, 1.0) as waste_factor,
        COALESCE(ri.ingredient_cost, 0) as ingredient_cost,
        COALESCE(i.allergens, '{}') as allergens
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = ${recipeVersionId}
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order
    `
  );

  // Calculate availability score
  const inStockCount = ingredients.filter(
    (ing) => ing.ingredient_cost > 0
  ).length;
  const availabilityScore =
    ingredients.length > 0 ? (inStockCount / ingredients.length) * 100 : 100;

  // Generate cost optimizations
  const costOptimizations: CostOptimization[] = [];
  let totalPotentialSavings = 0;

  for (const ing of ingredients) {
    const ingCost = Number(ing.ingredient_cost);
    if (ingCost <= 0) continue; // Skip ingredients without cost data

    const substitutions = await findSubstitutions(
      db,
      tenantId,
      ing.ingredient_id,
      ingCost,
      ing.category
    );

    if (substitutions.length > 0) {
      const bestSubstitution = substitutions[0];
      const savings = bestSubstitution.costSavings * Number(ing.quantity);
      totalPotentialSavings += savings;

      costOptimizations.push({
        category: "ingredient_substitution",
        priority:
          savings > currentCost * 0.05
            ? "high"
            : savings > currentCost * 0.02
              ? "medium"
              : "low",
        title: `Substitute ${ing.ingredient_name}`,
        description: `Replace ${ing.ingredient_name} with ${bestSubstitution.suggestedIngredientName}`,
        potentialSavings: savings,
        potentialSavingsPercentage: (savings / currentCost) * 100,
        substitutions: [bestSubstitution],
        implementation: `Replace ${ing.ingredient_name} with ${bestSubstitution.suggestedIngredientName} in the recipe`,
        risks:
          bestSubstitution.qualityImpact === "negative"
            ? [
                "May affect taste or texture profile",
                "Test in small batch first",
              ]
            : [],
      });
    }
  }

  // Waste reduction optimization
  const highWasteIngredients = ingredients.filter(
    (ing) => Number(ing.waste_factor) > 1.15
  );
  if (highWasteIngredients.length > 0) {
    const wasteSavings = highWasteIngredients.reduce((sum, ing) => {
      const excessWaste =
        (Number(ing.waste_factor) - 1.1) * Number(ing.ingredient_cost);
      return sum + excessWaste;
    }, 0);

    if (wasteSavings > 0) {
      totalPotentialSavings += wasteSavings;
      costOptimizations.push({
        category: "waste_reduction",
        priority: "medium",
        title: "Reduce ingredient waste",
        description: `${highWasteIngredients.length} ingredients have high waste factors`,
        potentialSavings: wasteSavings,
        potentialSavingsPercentage: (wasteSavings / currentCost) * 100,
        substitutions: [],
        implementation:
          "Review prep methods and purchasing specifications to reduce waste",
        risks: ["May require staff training", "May need vendor coordination"],
      });
    }
  }

  // Calculate nutritional analysis using actual ingredient data where available
  const nutritionalAnalysis = await calculateNutritionalAnalysis(
    db,
    tenantId,
    recipeVersionId,
    Number(recipe.yield_quantity)
  );

  // Calculate quality score (inverse of cost optimizations needed)
  const qualityScore = Math.max(50, 100 - costOptimizations.length * 5);

  // Calculate overall score
  const overallScore =
    availabilityScore * 0.3 +
    qualityScore * 0.4 +
    nutritionalAnalysis.healthScore * 0.3;

  const optimizedCost = Math.max(0, currentCost - totalPotentialSavings);
  const optimizedCostPerYield =
    currentCostPerYield > 0 ? optimizedCost / Number(recipe.yield_quantity) : 0;

  return {
    recipeVersionId: recipe.id,
    recipeName: recipe.name,
    currentCost,
    currentCostPerYield,
    optimizedCost,
    optimizedCostPerYield,
    totalPotentialSavings,
    totalPotentialSavingsPercentage:
      currentCost > 0 ? (totalPotentialSavings / currentCost) * 100 : 0,
    costOptimizations,
    nutritionalAnalysis,
    availabilityScore,
    qualityScore,
    overallScore,
    generatedAt: new Date(),
  };
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
 * Category-based nutritional fallback data
 * Used when ingredient doesn't have specific nutritional data
 */
const categoryNutrition: Record<string, NutritionalInfo> = {
  protein: {
    calories: 150,
    protein: 25,
    carbohydrates: 0,
    fat: 5,
    fiber: 0,
    sugar: 0,
    sodium: 300,
    cholesterol: 60,
  },
  vegetable: {
    calories: 30,
    protein: 2,
    carbohydrates: 6,
    fat: 0,
    fiber: 2,
    sugar: 3,
    sodium: 50,
    cholesterol: 0,
  },
  fruit: {
    calories: 60,
    protein: 1,
    carbohydrates: 15,
    fat: 0,
    fiber: 3,
    sugar: 12,
    sodium: 5,
    cholesterol: 0,
  },
  grain: {
    calories: 150,
    protein: 4,
    carbohydrates: 30,
    fat: 2,
    fiber: 3,
    sugar: 2,
    sodium: 200,
    cholesterol: 0,
  },
  dairy: {
    calories: 100,
    protein: 8,
    carbohydrates: 12,
    fat: 4,
    fiber: 0,
    sugar: 10,
    sodium: 120,
    cholesterol: 20,
  },
  herb: {
    calories: 5,
    protein: 0,
    carbohydrates: 1,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 5,
    cholesterol: 0,
  },
  spice: {
    calories: 10,
    protein: 0,
    carbohydrates: 2,
    fat: 0,
    fiber: 1,
    sugar: 0,
    sodium: 10,
    cholesterol: 0,
  },
  oil: {
    calories: 120,
    protein: 0,
    carbohydrates: 0,
    fat: 14,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    cholesterol: 0,
  },
  seafood: {
    calories: 120,
    protein: 20,
    carbohydrates: 0,
    fat: 3,
    fiber: 0,
    sugar: 0,
    sodium: 300,
    cholesterol: 60,
  },
  poultry: {
    calories: 140,
    protein: 23,
    carbohydrates: 0,
    fat: 4,
    fiber: 0,
    sugar: 0,
    sodium: 200,
    cholesterol: 60,
  },
  meat: {
    calories: 200,
    protein: 20,
    carbohydrates: 0,
    fat: 14,
    fiber: 0,
    sugar: 0,
    sodium: 250,
    cholesterol: 70,
  },
};

/**
 * Calculate nutritional analysis for recipe ingredients
 * Uses actual nutritional data from ingredients when available,
 * falls back to category-based estimates for missing data
 */
async function calculateNutritionalAnalysis(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  recipeVersionId: string,
  yieldQuantity: number
): Promise<NutritionalAnalysis> {
  // Fetch ingredients with their nutritional data
  const ingredients = await db.$queryRaw<
    Array<{
      quantity: number;
      unit_id: number;
      category: string | null;
      calories_per_100g: number | null;
      protein_per_100g: number | null;
      carbohydrates_per_100g: number | null;
      fat_per_100g: number | null;
      fiber_per_100g: number | null;
      sugar_per_100g: number | null;
      sodium_per_100mg: number | null;
      cholesterol_per_100mg: number | null;
    }>
  >(
    Prisma.sql`
      SELECT
        ri.quantity,
        ri.unit_id,
        i.category,
        i.calories_per_100g,
        i.protein_per_100g,
        i.carbohydrates_per_100g,
        i.fat_per_100g,
        i.fiber_per_100g,
        i.sugar_per_100g,
        i.sodium_per_100mg,
        i.cholesterol_per_100mg
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = ${recipeVersionId}
        AND ri.deleted_at IS NULL
        AND ri.is_optional = false
      ORDER BY ri.sort_order
    `
  );

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSugar = 0;
  let totalSodium = 0;
  let totalCholesterol = 0;

  for (const ing of ingredients) {
    const factor = getUnitToGramsFactor(ing.unit_id);
    const grams = ing.quantity * factor;
    const multiplier = grams / 100;

    let nutrition: NutritionalInfo;

    // Use actual nutritional data if available, otherwise fall back to category-based estimates
    if (
      ing.calories_per_100g !== null ||
      ing.protein_per_100g !== null ||
      ing.carbohydrates_per_100g !== null
    ) {
      // Use actual data from database, with fallbacks to zero for missing values
      nutrition = {
        calories: ing.calories_per_100g ?? 50,
        protein: ing.protein_per_100g ? Number(ing.protein_per_100g) : 1,
        carbohydrates: ing.carbohydrates_per_100g
          ? Number(ing.carbohydrates_per_100g)
          : 5,
        fat: ing.fat_per_100g ? Number(ing.fat_per_100g) : 2,
        fiber: ing.fiber_per_100g ? Number(ing.fiber_per_100g) : 0,
        sugar: ing.sugar_per_100g ? Number(ing.sugar_per_100g) : 1,
        sodium: ing.sodium_per_100mg ? Number(ing.sodium_per_100mg) : 100,
        cholesterol: ing.cholesterol_per_100mg
          ? Number(ing.cholesterol_per_100mg)
          : 0,
      };
    } else {
      // Fall back to category-based estimates
      const category = (ing.category?.toLowerCase() ||
        "other") as keyof typeof categoryNutrition;
      nutrition = categoryNutrition[category] || {
        calories: 50,
        protein: 1,
        carbohydrates: 5,
        fat: 2,
        fiber: 0,
        sugar: 1,
        sodium: 100,
        cholesterol: 0,
      };
    }

    totalCalories += nutrition.calories * multiplier;
    totalProtein += nutrition.protein * multiplier;
    totalCarbs += nutrition.carbohydrates * multiplier;
    totalFat += nutrition.fat * multiplier;
    totalFiber += nutrition.fiber * multiplier;
    totalSugar += nutrition.sugar * multiplier;
    totalSodium += nutrition.sodium * multiplier;
    totalCholesterol += nutrition.cholesterol * multiplier;
  }

  const perRecipe: NutritionalInfo = {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein),
    carbohydrates: Math.round(totalCarbs),
    fat: Math.round(totalFat),
    fiber: Math.round(totalFiber),
    sugar: Math.round(totalSugar),
    sodium: Math.round(totalSodium),
    cholesterol: Math.round(totalCholesterol),
  };

  const servings = Math.max(1, yieldQuantity);
  const perServing: NutritionalInfo = {
    calories: Math.round(totalCalories / servings),
    protein: Math.round(totalProtein / servings),
    carbohydrates: Math.round(totalCarbs / servings),
    fat: Math.round(totalFat / servings),
    fiber: Math.round(totalFiber / servings),
    sugar: Math.round(totalSugar / servings),
    sodium: Math.round(totalSodium / servings),
    cholesterol: Math.round(totalCholesterol / servings),
  };

  const healthScore = calculateHealthScore(perServing);

  // Generate highlights and concerns
  const nutrientHighlights: string[] = [];
  const concerns: string[] = [];
  const improvementSuggestions: NutritionalImprovement[] = [];

  if (perServing.protein > 20)
    nutrientHighlights.push(`High protein (${perServing.protein}g)`);
  if (perServing.fiber > 5)
    nutrientHighlights.push(`High fiber (${perServing.fiber}g)`);
  if (perServing.sodium < 600) nutrientHighlights.push("Low sodium");
  if (perServing.calories < 400) nutrientHighlights.push("Low calorie");

  if (perServing.sodium > 1000) {
    concerns.push(`High sodium (${perServing.sodium}mg per serving)`);
    improvementSuggestions.push({
      type: "reduce",
      nutrient: "Sodium",
      currentValue: perServing.sodium,
      targetValue: 600,
      suggestion: "Reduce salt or use low-sodium alternatives",
      impact: "May improve heart health and reduce blood pressure risk",
    });
  }
  if (perServing.sugar > 20) {
    concerns.push(`High sugar (${perServing.sugar}g per serving)`);
    improvementSuggestions.push({
      type: "reduce",
      nutrient: "Sugar",
      currentValue: perServing.sugar,
      targetValue: 10,
      suggestion: "Consider natural sweeteners or reduce added sugars",
      impact: "May help stabilize blood sugar levels",
    });
  }
  if (perServing.fat > 20) {
    concerns.push(`High fat (${perServing.fat}g per serving)`);
    improvementSuggestions.push({
      type: "reduce",
      nutrient: "Fat",
      currentValue: perServing.fat,
      targetValue: 10,
      suggestion: "Consider leaner protein options or reduced-fat ingredients",
      impact: "May reduce calorie density and improve heart health",
    });
  }
  if (perServing.fiber < 3) {
    improvementSuggestions.push({
      type: "increase",
      nutrient: "Fiber",
      currentValue: perServing.fiber,
      targetValue: 5,
      suggestion: "Add whole grains, vegetables, or legumes",
      impact: "May improve digestion and promote satiety",
    });
  }
  if (perServing.protein < 10) {
    improvementSuggestions.push({
      type: "increase",
      nutrient: "Protein",
      currentValue: perServing.protein,
      targetValue: 15,
      suggestion: "Add lean protein sources or increase portion of proteins",
      impact: "May improve satiety and muscle maintenance",
    });
  }

  return {
    perServing,
    perRecipe,
    healthScore: Math.round(healthScore),
    nutrientHighlights,
    concerns,
    improvementSuggestions,
  };
}

/**
 * Batch optimize multiple recipes
 */
export async function batchOptimizeRecipes(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  recipeVersionIds: string[]
): Promise<RecipeOptimization[]> {
  const results: RecipeOptimization[] = [];

  for (const recipeVersionId of recipeVersionIds) {
    try {
      const optimization = await optimizeRecipe(db, tenantId, recipeVersionId);
      results.push(optimization);
    } catch (error) {
      console.error(`Failed to optimize recipe ${recipeVersionId}:`, error);
    }
  }

  return results;
}
