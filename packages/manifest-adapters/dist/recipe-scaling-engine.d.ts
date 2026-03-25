/**
 * Recipe Scaling Engine
 *
 * Provides comprehensive recipe scaling capabilities including:
 * - Scaling recipes by yield (portions, weight, volume)
 * - Unit conversion between measurement systems (metric/imperial)
 * - Volume to weight conversion using density
 * - Cost recalculation for scaled quantities
 * - Prep list generation from scaled recipes
 *
 * @module kitchen-ops/recipe-scaling
 */
import type { PrismaClient } from "@repo/database/standalone";
import { Prisma } from "@repo/database/standalone";
/**
 * Unit conversion record from database
 */
export interface UnitConversion {
    from_unit_id: number;
    to_unit_id: number;
    multiplier: number;
}
/**
 * Unit record from database
 */
export interface Unit {
    id: number;
    code: string;
    name: string;
    name_plural: string;
    unit_system: "metric" | "imperial" | "custom";
    unit_type: "volume" | "weight" | "count" | "length" | "temperature" | "time";
    is_base_unit: boolean;
}
/**
 * Scaled ingredient result
 */
export interface ScaledIngredient {
    ingredientId: string;
    ingredientName: string;
    originalQuantity: number;
    originalUnitId: number;
    originalUnitCode: string;
    scaledQuantity: number;
    scaledUnitId: number;
    scaledUnitCode: string;
    category: string | null;
    isOptional: boolean;
    preparationNotes: string | null;
    allergens: string[];
    wasteFactor: number;
    adjustedQuantity: number;
    unitCost: number;
    scaledCost: number;
}
/**
 * Recipe scaling result
 */
export interface ScaledRecipe {
    recipeVersionId: string;
    recipeName: string;
    originalYieldQuantity: number;
    originalYieldUnitId: number;
    originalYieldUnitCode: string;
    targetYieldQuantity: number;
    targetYieldUnitId: number;
    targetYieldUnitCode: string;
    scaleFactor: number;
    ingredients: ScaledIngredient[];
    originalTotalCost: number;
    originalCostPerYield: number;
    scaledTotalCost: number;
    scaledCostPerYield: number;
}
/**
 * Clear unit and conversion caches (useful for testing or when data changes)
 */
export declare function clearUnitCaches(): void;
/**
 * Convert quantity from one unit to another
 *
 * @param db - Database client
 * @param quantity - Quantity to convert
 * @param fromUnitId - Source unit ID
 * @param toUnitId - Target unit ID
 * @returns Converted quantity
 * @throws Error if conversion is not possible
 */
export declare function convertQuantity(db: PrismaClient | Prisma.TransactionClient, quantity: number, fromUnitId: number, toUnitId: number): Promise<number>;
/**
 * Convert quantity to a specific measurement system
 *
 * @param db - Database client
 * @param quantity - Quantity to convert
 * @param fromUnitId - Source unit ID
 * @param targetSystem - Target measurement system (metric or imperial)
 * @returns Object with converted quantity and unit ID
 */
export declare function convertUnitToSystem(db: PrismaClient | Prisma.TransactionClient, quantity: number, fromUnitId: number, targetSystem: "metric" | "imperial"): Promise<{
    quantity: number;
    unitId: number;
}>;
/**
 * Get best unit for a quantity (automatically selects appropriate unit)
 * For example, 1000g becomes 1kg
 *
 * @param db - Database client
 * @param quantity - Base quantity in base unit
 * @param unitType - Type of unit (volume, weight, etc.)
 * @param preferredSystem - Preferred measurement system
 * @returns Best unit ID and adjusted quantity
 */
export declare function getBestUnit(db: PrismaClient | Prisma.TransactionClient, quantity: number, unitType: "volume" | "weight" | "count" | "length", preferredSystem?: "metric" | "imperial"): Promise<{
    quantity: number;
    unitId: number;
    unit: Unit;
}>;
/**
 * Scale a recipe by target yield
 *
 * @param db - Database client
 * @param tenantId - Tenant ID
 * @param recipeVersionId - Recipe version to scale
 * @param targetYieldQuantity - Desired yield quantity
 * @param targetYieldUnitId - Desired yield unit (optional, uses recipe's unit if not specified)
 * @param convertToSystem - Optionally convert all ingredients to metric or imperial
 * @returns Scaled recipe with converted ingredients and costs
 */
export declare function scaleRecipe(db: PrismaClient | Prisma.TransactionClient, tenantId: string, recipeVersionId: string, targetYieldQuantity: number, targetYieldUnitId?: number, convertToSystem?: "metric" | "imperial"): Promise<ScaledRecipe>;
/**
 * Generate prep list from scaled recipe
 *
 * @param db - Database client
 * @param tenantId - Tenant ID
 * @param scaledRecipe - Scaled recipe result
 * @param stationMapping - Optional mapping of ingredient categories to stations
 * @returns Prep list items grouped by station
 */
export declare function generatePrepListFromScaledRecipe(db: PrismaClient | Prisma.TransactionClient, tenantId: string, scaledRecipe: ScaledRecipe, stationMapping?: Map<string, string>): Promise<Array<{
    stationId: string;
    stationName: string;
    ingredients: ScaledIngredient[];
}>>;
/**
 * Batch scale multiple recipes
 *
 * @param db - Database client
 * @param tenantId - Tenant ID
 * @param recipes - Array of recipes to scale with their target yields
 * @returns Array of scaled recipes
 */
export declare function batchScaleRecipes(db: PrismaClient | Prisma.TransactionClient, tenantId: string, recipes: Array<{
    recipeVersionId: string;
    targetYieldQuantity: number;
    targetYieldUnitId?: number;
    convertToSystem?: "metric" | "imperial";
}>): Promise<ScaledRecipe[]>;
//# sourceMappingURL=recipe-scaling-engine.d.ts.map