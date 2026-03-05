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
import { Prisma } from "@repo/database/standalone";
/**
 * Unit cache for performance
 */
let unitCache = null;
let conversionCache = null;
/**
 * Load all units from database
 */
async function loadUnits(db) {
    if (unitCache) {
        return unitCache;
    }
    const rows = await db.$queryRaw(Prisma.sql `
      SELECT id, code, name, name_plural, unit_system, unit_type, is_base_unit
      FROM core.units
      ORDER BY id
    `);
    unitCache = new Map(rows.map((row) => [row.id, row]));
    return unitCache;
}
/**
 * Load unit conversions from database
 */
async function loadConversions(db) {
    if (conversionCache) {
        return conversionCache;
    }
    const rows = await db.$queryRaw(Prisma.sql `
      SELECT from_unit_id, to_unit_id, multiplier
      FROM core.unit_conversions
    `);
    conversionCache = new Map(rows.map((row) => [
        `${row.from_unit_id}-${row.to_unit_id}`,
        Number(row.multiplier),
    ]));
    return conversionCache;
}
/**
 * Clear unit and conversion caches (useful for testing or when data changes)
 */
export function clearUnitCaches() {
    unitCache = null;
    conversionCache = null;
}
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
export async function convertQuantity(db, quantity, fromUnitId, toUnitId) {
    if (fromUnitId === toUnitId) {
        return quantity;
    }
    const units = await loadUnits(db);
    const fromUnit = units.get(fromUnitId);
    const toUnit = units.get(toUnitId);
    if (!(fromUnit && toUnit)) {
        throw new Error(`Invalid unit IDs: ${fromUnitId}, ${toUnitId}`);
    }
    // Direct conversion available
    const conversions = await loadConversions(db);
    const key = `${fromUnitId}-${toUnitId}`;
    const multiplier = conversions.get(key);
    if (multiplier !== undefined) {
        return quantity * multiplier;
    }
    // Try conversion through base unit
    const fromKey = `${fromUnitId}-${fromUnitId}`;
    const toKey = `${toUnitId}-${toUnitId}`;
    // For same type units, try finding base unit conversion
    if (fromUnit.unit_type === toUnit.unit_type) {
        // Find base unit for this type
        const baseUnit = Array.from(units.values()).find((u) => u.unit_type === fromUnit.unit_type && u.is_base_unit);
        if (baseUnit) {
            const toBaseKey = `${fromUnitId}-${baseUnit.id}`;
            const fromBaseKey = `${baseUnit.id}-${toUnitId}`;
            const toBaseMultiplier = conversions.get(toBaseKey);
            const fromBaseMultiplier = conversions.get(fromBaseKey);
            if (toBaseMultiplier !== undefined && fromBaseMultiplier !== undefined) {
                return quantity * toBaseMultiplier * fromBaseMultiplier;
            }
        }
    }
    throw new Error(`Cannot convert from ${fromUnit.code} (${fromUnit.unit_type}) to ${toUnit.code} (${toUnit.unit_type})`);
}
/**
 * Convert quantity to a specific measurement system
 *
 * @param db - Database client
 * @param quantity - Quantity to convert
 * @param fromUnitId - Source unit ID
 * @param targetSystem - Target measurement system (metric or imperial)
 * @returns Object with converted quantity and unit ID
 */
export async function convertUnitToSystem(db, quantity, fromUnitId, targetSystem) {
    const units = await loadUnits(db);
    const fromUnit = units.get(fromUnitId);
    if (!fromUnit) {
        throw new Error(`Invalid unit ID: ${fromUnitId}`);
    }
    // If already in target system, return as-is
    if (fromUnit.unit_system === targetSystem) {
        return { quantity, unitId: fromUnitId };
    }
    // Find best matching unit in target system of the same type
    const targetUnit = Array.from(units.values()).find((u) => u.unit_system === targetSystem && u.unit_type === fromUnit.unit_type);
    if (!targetUnit) {
        throw new Error(`No ${targetSystem} unit available for type ${fromUnit.unit_type}`);
    }
    const convertedQuantity = await convertQuantity(db, quantity, fromUnitId, targetUnit.id);
    return { quantity: convertedQuantity, unitId: targetUnit.id };
}
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
export async function getBestUnit(db, quantity, unitType, preferredSystem = "metric") {
    const units = await loadUnits(db);
    const typeUnits = Array.from(units.values()).filter((u) => u.unit_type === unitType && u.unit_system === preferredSystem);
    // Sort by base unit first, then larger units
    const sortedUnits = typeUnits.sort((a, b) => {
        if (a.is_base_unit)
            return -1;
        if (b.is_base_unit)
            return 1;
        return a.id - b.id;
    });
    // Find the largest unit where the quantity is >= 1
    for (const unit of sortedUnits.reverse()) {
        if (unit.is_base_unit)
            continue;
        try {
            const converted = await convertQuantity(db, quantity, sortedUnits[0]?.id || unit.id, unit.id);
            if (converted >= 1) {
                return { quantity: converted, unitId: unit.id, unit };
            }
        }
        catch {
            // Skip if conversion not available
        }
    }
    // Fall back to base unit
    const baseUnit = sortedUnits.find((u) => u.is_base_unit);
    if (!baseUnit) {
        throw new Error(`No base unit found for type ${unitType}`);
    }
    return { quantity, unitId: baseUnit.id, unit: baseUnit };
}
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
export async function scaleRecipe(db, tenantId, recipeVersionId, targetYieldQuantity, targetYieldUnitId, convertToSystem) {
    // Get recipe version details
    const recipeVersion = await db.$queryRaw(Prisma.sql `
      SELECT rv.id, rv.name, rv.yield_quantity, rv.yield_unit_id, rv.total_cost, rv.cost_per_yield
      FROM tenant_kitchen.recipe_versions rv
      WHERE rv.tenant_id = ${tenantId}
        AND rv.id = ${recipeVersionId}
        AND rv.deleted_at IS NULL
    `);
    if (!recipeVersion[0]) {
        throw new Error("Recipe version not found");
    }
    const recipe = recipeVersion[0];
    const units = await loadUnits(db);
    // Calculate scale factor
    let scaleFactor;
    const finalTargetUnitId = targetYieldUnitId || recipe.yield_unit_id;
    if (targetYieldUnitId && targetYieldUnitId !== recipe.yield_unit_id) {
        // Convert recipe yield to target unit first
        const targetYieldInRecipeUnit = await convertQuantity(db, targetYieldQuantity, targetYieldUnitId, recipe.yield_unit_id);
        scaleFactor = targetYieldInRecipeUnit / Number(recipe.yield_quantity);
    }
    else {
        scaleFactor = targetYieldQuantity / Number(recipe.yield_quantity);
    }
    // Get all ingredients with costs
    const ingredients = await db.$queryRaw(Prisma.sql `
      SELECT
        ri.id,
        ri.ingredient_id,
        i.name as ingredient_name,
        ri.quantity,
        ri.unit_id,
        i.category,
        ri.is_optional,
        ri.preparation_notes,
        i.allergens,
        COALESCE(ri.waste_factor, 1.0) as waste_factor,
        ri.ingredient_cost
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i ON i.id = ri.ingredient_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = ${recipeVersionId}
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order
    `);
    // Scale each ingredient
    const scaledIngredients = [];
    for (const ing of ingredients) {
        const originalQuantity = Number(ing.quantity);
        const scaledQuantity = originalQuantity * scaleFactor;
        const adjustedQuantity = scaledQuantity * Number(ing.waste_factor);
        const unitCost = Number(ing.ingredient_cost) || 0;
        const scaledCost = unitCost * scaleFactor;
        let finalScaledQuantity = scaledQuantity;
        let finalUnitId = ing.unit_id;
        let finalUnitCode = units.get(ing.unit_id)?.code || "";
        // Apply unit system conversion if requested
        if (convertToSystem) {
            try {
                const converted = await convertUnitToSystem(db, scaledQuantity, ing.unit_id, convertToSystem);
                finalScaledQuantity = converted.quantity;
                finalUnitId = converted.unitId;
                finalUnitCode = units.get(converted.unitId)?.code || "";
            }
            catch {
                // Keep original if conversion fails
            }
        }
        // Get best unit for large quantities
        if (finalScaledQuantity > 1000) {
            try {
                const originalUnit = units.get(ing.unit_id);
                if (originalUnit) {
                    const preferredSystem = convertToSystem && originalUnit.unit_system !== "custom"
                        ? convertToSystem
                        : originalUnit.unit_system === "custom"
                            ? "metric"
                            : originalUnit.unit_system;
                    const bestUnit = await getBestUnit(db, finalScaledQuantity, originalUnit.unit_type, preferredSystem);
                    finalScaledQuantity = bestUnit.quantity;
                    finalUnitId = bestUnit.unitId;
                    finalUnitCode = bestUnit.unit.code;
                }
            }
            catch {
                // Keep converted unit if best unit fails
            }
        }
        scaledIngredients.push({
            ingredientId: ing.ingredient_id,
            ingredientName: ing.ingredient_name,
            originalQuantity,
            originalUnitId: ing.unit_id,
            originalUnitCode: units.get(ing.unit_id)?.code || "",
            scaledQuantity: Math.round(finalScaledQuantity * 100) / 100,
            scaledUnitId: finalUnitId,
            scaledUnitCode: finalUnitCode,
            category: ing.category,
            isOptional: ing.is_optional,
            preparationNotes: ing.preparation_notes,
            allergens: ing.allergens || [],
            wasteFactor: Number(ing.waste_factor),
            adjustedQuantity: Math.round(adjustedQuantity * 100) / 100,
            unitCost: scaledCost / (adjustedQuantity || 1),
            scaledCost: Math.round(scaledCost * 100) / 100,
        });
    }
    const originalTotalCost = Number(recipe.total_cost);
    const originalCostPerYield = Number(recipe.cost_per_yield);
    const scaledTotalCost = originalTotalCost * scaleFactor;
    const scaledCostPerYield = originalCostPerYield * scaleFactor;
    const yieldUnit = units.get(finalTargetUnitId);
    const originalYieldUnit = units.get(recipe.yield_unit_id);
    return {
        recipeVersionId: recipe.id,
        recipeName: recipe.name,
        originalYieldQuantity: Number(recipe.yield_quantity),
        originalYieldUnitId: recipe.yield_unit_id,
        originalYieldUnitCode: originalYieldUnit?.code || "",
        targetYieldQuantity,
        targetYieldUnitId: finalTargetUnitId,
        targetYieldUnitCode: yieldUnit?.code || "",
        scaleFactor,
        ingredients: scaledIngredients,
        originalTotalCost,
        originalCostPerYield,
        scaledTotalCost: Math.round(scaledTotalCost * 100) / 100,
        scaledCostPerYield: Math.round(scaledCostPerYield * 100) / 100,
    };
}
/**
 * Generate prep list from scaled recipe
 *
 * @param db - Database client
 * @param tenantId - Tenant ID
 * @param scaledRecipe - Scaled recipe result
 * @param stationMapping - Optional mapping of ingredient categories to stations
 * @returns Prep list items grouped by station
 */
export async function generatePrepListFromScaledRecipe(db, tenantId, scaledRecipe, stationMapping) {
    // Default station mapping based on categories
    const defaultStationMapping = new Map([
        ["hot", "hot-line"],
        ["grill", "hot-line"],
        ["sauté", "hot-line"],
        ["cold", "cold-prep"],
        ["salad", "cold-prep"],
        ["dressing", "cold-prep"],
        ["bakery", "bakery"],
        ["bake", "bakery"],
        ["pastry", "bakery"],
        ["dessert", "bakery"],
        ["garnish", "garnish"],
        ["herb", "garnish"],
        ["decoration", "garnish"],
    ]);
    const mapping = stationMapping || defaultStationMapping;
    // Group ingredients by station
    const stationMap = new Map();
    for (const ing of scaledRecipe.ingredients) {
        let stationId = "prep-station";
        const category = ing.category?.toLowerCase() || "";
        for (const [keyword, station] of mapping) {
            if (category.includes(keyword)) {
                stationId = station;
                break;
            }
        }
        if (!stationMap.has(stationId)) {
            stationMap.set(stationId, {
                stationId,
                stationName: formatStationName(stationId),
                ingredients: [],
            });
        }
        stationMap.get(stationId).ingredients.push(ing);
    }
    return Array.from(stationMap.values());
}
function formatStationName(stationId) {
    return stationId
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
/**
 * Batch scale multiple recipes
 *
 * @param db - Database client
 * @param tenantId - Tenant ID
 * @param recipes - Array of recipes to scale with their target yields
 * @returns Array of scaled recipes
 */
export async function batchScaleRecipes(db, tenantId, recipes) {
    const results = [];
    for (const recipe of recipes) {
        try {
            const scaled = await scaleRecipe(db, tenantId, recipe.recipeVersionId, recipe.targetYieldQuantity, recipe.targetYieldUnitId, recipe.convertToSystem);
            results.push(scaled);
        }
        catch (error) {
            console.error(`Failed to scale recipe ${recipe.recipeVersionId}:`, error);
            throw error;
        }
    }
    return results;
}
