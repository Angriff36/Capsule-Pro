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
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
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
    category: "ingredient_substitution" | "quantity_adjustment" | "supplier_change" | "waste_reduction";
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
    healthScore: number;
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
    availabilityScore: number;
    qualityScore: number;
    overallScore: number;
    generatedAt: Date;
}
/**
 * Analyze recipe and generate optimization suggestions
 */
export declare function optimizeRecipe(db: PrismaClient | Prisma.TransactionClient, tenantId: string, recipeVersionId: string, targetYieldQuantity?: number): Promise<RecipeOptimization>;
/**
 * Batch optimize multiple recipes
 */
export declare function batchOptimizeRecipes(db: PrismaClient | Prisma.TransactionClient, tenantId: string, recipeVersionIds: string[]): Promise<RecipeOptimization[]>;
//# sourceMappingURL=recipe-optimization-engine.d.ts.map