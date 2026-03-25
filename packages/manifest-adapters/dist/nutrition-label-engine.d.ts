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
 * Vitamin and mineral data (optional/when available)
 */
export interface VitaminsMinerals {
    vitaminA?: number;
    vitaminC?: number;
    calcium?: number;
    iron?: number;
    vitaminD?: number;
    vitaminE?: number;
    vitaminK?: number;
    thiamin?: number;
    riboflavin?: number;
    niacin?: number;
    vitaminB6?: number;
    vitaminB12?: number;
    folate?: number;
    phosphorus?: number;
    iodine?: number;
    magnesium?: number;
    zinc?: number;
    selenium?: number;
    copper?: number;
    manganese?: number;
}
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
    vitamins: VitaminsMinerals;
}
/**
 * Percent daily values
 */
export interface PercentDailyValues {
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
    vitaminD: number;
    calcium: number;
    iron: number;
    vitaminA: number;
    vitaminC: number;
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
 * Generate nutrition label for a recipe
 */
export declare function generateNutritionLabel(db: PrismaClient | Prisma.TransactionClient, tenantId: string, recipeVersionId: string, options?: {
    servingSize?: string;
    servingsPerContainer?: number;
    servingWeightGrams?: number;
}): Promise<NutritionLabel>;
/**
 * Batch generate nutrition labels for multiple recipes
 */
export declare function batchGenerateNutritionLabels(db: PrismaClient | Prisma.TransactionClient, tenantId: string, recipeVersionIds: string[], options?: {
    servingSize?: string;
    servingsPerContainer?: number;
}): Promise<NutritionLabel[]>;
/**
 * Get allergen summary for a recipe
 */
export declare function getAllergenSummary(db: PrismaClient | Prisma.TransactionClient, tenantId: string, recipeVersionId: string): Promise<AllergenInfo>;
//# sourceMappingURL=nutrition-label-engine.d.ts.map