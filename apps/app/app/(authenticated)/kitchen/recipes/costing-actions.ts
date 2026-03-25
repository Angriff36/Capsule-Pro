"use server";

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { getTenantIdForOrg } from "../../../lib/tenant";

export interface VendorRecipeCostSummary {
  recipeId: string;
  recipeName: string;
  recipeVersionId: string;
  yieldQuantity: number;
  yieldUnit: string | null;
  totalCost: number;
  costPerYield: number;
  foodCostPercent: number | null;
  menuPrice: number | null;
  margin: number | null;
  ingredientCount: number;
  lastCalculated: Date | null;
}

export interface IngredientCostDetail {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  adjustedQuantity: number;
  lowestVendorCost: number;
  vendorName: string | null;
  vendorItemCount: number;
  totalCost: number;
  costPercentOfTotal: number;
}

export interface VendorRecipeCostBreakdown {
  recipe: {
    id: string;
    name: string;
    description: string | null;
    yieldQuantity: number;
    yieldUnit: string | null;
  };
  costs: {
    totalCost: number;
    costPerYield: number;
    costPerPortion: number | null;
    foodCostPercent: number | null;
  };
  ingredients: IngredientCostDetail[];
  vendors: Array<{
    name: string | null;
    itemCost: number;
  }>;
}

export interface CostingSummaryStats {
  avgFoodCostPercent: number;
  totalRecipeValue: number;
  highestMarginDish: {
    name: string;
    margin: number;
  } | null;
  lowestMarginDish: {
    name: string;
    margin: number;
  } | null;
  recipesWithCostData: number;
  totalRecipes: number;
  highFoodCostAlerts: number;
}

/**
 * Get vendor-based recipe cost summary for all recipes
 */
export async function getVendorRecipeCostSummary(): Promise<{
  success: boolean;
  data?: VendorRecipeCostSummary[];
  error?: string;
}> {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return { success: false, error: "Unauthorized" };
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const recipes = await database.$queryRaw<VendorRecipeCostSummary[]>`
      WITH recipe_costs AS (
        SELECT
          r.id AS recipe_id,
          r.name AS recipe_name,
          rv.id AS recipe_version_id,
          rv.yield_quantity,
          u.code AS yield_unit,
          COALESCE(rv.cost_per_yield, 0) AS cost_per_yield,
          COALESCE(rv.total_cost, 0) AS total_cost,
          rv.cost_calculated_at,
          COUNT(DISTINCT ri.id) AS ingredient_count
        FROM tenant_kitchen.recipes r
        LEFT JOIN LATERAL (
          SELECT rv.*
          FROM tenant_kitchen.recipe_versions rv
          WHERE rv.tenant_id = r.tenant_id
            AND rv.recipe_id = r.id
            AND rv.deleted_at IS NULL
          ORDER BY rv.version_number DESC
          LIMIT 1
        ) rv ON true
        LEFT JOIN core.units u ON u.id = rv.yield_unit_id
        LEFT JOIN tenant_kitchen.recipe_ingredients ri
          ON ri.tenant_id = rv.tenant_id
          AND ri.recipe_version_id = rv.id
          AND ri.deleted_at IS NULL
        WHERE r.tenant_id = ${tenantId}
          AND r.deleted_at IS NULL
        GROUP BY r.id, r.name, rv.id, rv.yield_quantity, u.code, rv.cost_per_yield, rv.total_cost, rv.cost_calculated_at
      ),
      dish_pricing AS (
        SELECT
          dr.recipe_id,
          AVG(d.price_per_person) AS avg_menu_price
        FROM tenant_kitchen.dishes d
        INNER JOIN tenant_kitchen.recipes dr
          ON dr.tenant_id = d.tenant_id
          AND dr.id = d.recipe_id
        WHERE d.tenant_id = ${tenantId}
          AND d.deleted_at IS NULL
          AND d.price_per_person IS NOT NULL
        GROUP BY dr.recipe_id
      )
      SELECT
        rc.recipe_id AS id,
        rc.recipe_name AS name,
        rc.recipe_version_id,
        rc.yield_quantity,
        rc.yield_unit,
        rc.total_cost,
        rc.cost_per_yield,
        CASE
          WHEN dp.avg_menu_price > 0 THEN ROUND((rc.total_cost / NULLIF(rc.yield_quantity, 0)) / dp.avg_menu_price * 100, 2)
          ELSE NULL
        END AS food_cost_percent,
        dp.avg_menu_price AS menu_price,
        CASE
          WHEN dp.avg_menu_price > 0 THEN ROUND(((dp.avg_menu_price - (rc.total_cost / NULLIF(rc.yield_quantity, 0))) / dp.avg_menu_price) * 100, 2)
          ELSE NULL
        END AS margin,
        rc.ingredient_count,
        rc.cost_calculated_at AS last_calculated
      FROM recipe_costs rc
      LEFT JOIN dish_pricing dp ON dp.recipe_id = rc.recipe_id
      ORDER BY rc.recipe_name ASC
    `;

    return { success: true, data: recipes };
  } catch (error) {
    console.error("[costing-actions] getVendorRecipeCostSummary error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch recipe costs",
    };
  }
}

/**
 * Get vendor-based cost breakdown for a specific recipe
 */
export async function getVendorRecipeCostBreakdown(
  recipeId: string
): Promise<{
  success: boolean;
  data?: VendorRecipeCostBreakdown;
  error?: string;
}> {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return { success: false, error: "Unauthorized" };
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Get recipe details with latest version
    const [recipeData] = await database.$queryRaw<
      {
        id: string;
        name: string;
        description: string | null;
        yield_quantity: number;
        yield_unit: string | null;
        recipe_version_id: string;
        total_cost: number;
        cost_per_yield: number;
        portion_size: number | null;
        portion_unit: string | null;
      }[]
    >`
      SELECT
        r.id,
        r.name,
        r.description,
        rv.yield_quantity,
        u.code AS yield_unit,
        rv.id AS recipe_version_id,
        COALESCE(rv.total_cost, 0) AS total_cost,
        COALESCE(rv.cost_per_yield, 0) AS cost_per_yield,
        rv.portion_size,
        pu.code AS portion_unit
      FROM tenant_kitchen.recipes r
      LEFT JOIN LATERAL (
        SELECT rv.*
        FROM tenant_kitchen.recipe_versions rv
        WHERE rv.tenant_id = r.tenant_id
          AND rv.recipe_id = r.id
          AND rv.deleted_at IS NULL
        ORDER BY rv.version_number DESC
        LIMIT 1
      ) rv ON true
      LEFT JOIN core.units u ON u.id = rv.yield_unit_id
      LEFT JOIN core.units pu ON pu.id = rv.portion_unit_id
      WHERE r.tenant_id = ${tenantId}
        AND r.id = ${recipeId}
        AND r.deleted_at IS NULL
    `;

    if (!recipeData) {
      return { success: false, error: "Recipe not found" };
    }

    // Get ingredient costs with vendor catalog pricing
    const ingredients = await database.$queryRaw<
      IngredientCostDetail[]
    >`
      WITH ingredient_costs AS (
        SELECT
          i.id AS ingredient_id,
          i.name AS ingredient_name,
          ri.quantity,
          u.code AS unit,
          ri.waste_factor,
          (ri.quantity * ri.waste_factor) AS adjusted_quantity,
          COALESCE(
            (
              SELECT MIN(vc.base_unit_cost)
              FROM tenant_inventory.vendor_catalog vc
              WHERE vc.tenant_id = ${tenantId}
                AND vc.deleted_at IS NULL
                AND vc.is_active = true
                AND (
                  vc.effective_from IS NULL OR vc.effective_from <= NOW()
                )
                AND (
                  vc.effective_to IS NULL OR vc.effective_to >= NOW()
                )
                AND vc.item_name = i.name
            ),
            0
          ) AS lowest_vendor_cost
        FROM tenant_kitchen.recipe_ingredients ri
        INNER JOIN tenant_kitchen.ingredients i
          ON i.tenant_id = ri.tenant_id
          AND i.id = ri.ingredient_id
          AND i.deleted_at IS NULL
        LEFT JOIN core.units u ON u.id = ri.unit_id
        WHERE ri.tenant_id = ${tenantId}
          AND ri.recipe_version_id = ${recipeData.recipe_version_id}
          AND ri.deleted_at IS NULL
        ORDER BY ri.sort_order ASC
      )
      SELECT
        ingredient_id,
        ingredient_name,
        quantity,
        unit,
        waste_factor,
        adjusted_quantity,
        lowest_vendor_cost,
        (adjusted_quantity * lowest_vendor_cost) AS total_cost,
        CASE
          WHEN (SELECT SUM(total_cost) FROM ingredient_costs) > 0
          THEN ROUND(((adjusted_quantity * lowest_vendor_cost) / (SELECT SUM(total_cost) FROM ingredient_costs)) * 100, 2)
          ELSE 0
        END AS cost_percent_of_total,
        (
          SELECT COUNT(DISTINCT vc.supplier_id)
          FROM tenant_inventory.vendor_catalog vc
          WHERE vc.tenant_id = ${tenantId}
            AND vc.deleted_at IS NULL
            AND vc.is_active = true
            AND vc.item_name = ingredient_costs.ingredient_name
        ) AS vendor_item_count,
        (
          SELECT s.name
          FROM tenant_inventory.vendor_catalog vc
          INNER JOIN tenant_inventory.suppliers s
            ON s.tenant_id = vc.tenant_id
            AND s.id = vc.supplier_id
          WHERE vc.tenant_id = ${tenantId}
            AND vc.deleted_at IS NULL
            AND vc.is_active = true
            AND vc.item_name = ingredient_costs.ingredient_name
            AND vc.base_unit_cost = ingredient_costs.lowest_vendor_cost
          LIMIT 1
        ) AS vendor_name
      FROM ingredient_costs
    `;

    // Calculate totals
    const totalCost = ingredients.reduce(
      (sum, ing) => sum + Number(ing.total_cost),
      0
    );
    const costPerYield =
      Number(recipeData.yield_quantity) > 0
        ? totalCost / Number(recipeData.yield_quantity)
        : 0;
    const costPerPortion =
      recipeData.portion_size && recipeData.portion_size > 0
        ? costPerYield * Number(recipeData.portion_size)
        : null;

    // Get vendor summary
    const vendors = await database.$queryRaw<
      { name: string | null; item_cost: number }[]
    >`
      SELECT DISTINCT
        s.name,
        vc.base_unit_cost AS item_cost
      FROM tenant_inventory.vendor_catalog vc
      INNER JOIN tenant_inventory.suppliers s
        ON s.tenant_id = vc.tenant_id
        AND s.id = vc.supplier_id
      INNER JOIN tenant_kitchen.recipe_ingredients ri
        ON ri.tenant_id = vc.tenant_id
      INNER JOIN tenant_kitchen.ingredients i
        ON i.tenant_id = ri.tenant_id
        AND i.id = ri.ingredient_id
      WHERE vc.tenant_id = ${tenantId}
        AND vc.deleted_at IS NULL
        AND vc.is_active = true
        AND vc.item_name = i.name
        AND ri.recipe_version_id = ${recipeData.recipe_version_id}
      ORDER BY s.name, vc.base_unit_cost
    `;

    // Get dish pricing for food cost % calculation
    const [dishPricing] = await database.$queryRaw<
      { avg_price: number | null }[]
    >`
      SELECT AVG(d.price_per_person) AS avg_price
      FROM tenant_kitchen.dishes d
      WHERE d.tenant_id = ${tenantId}
        AND d.recipe_id = ${recipeId}
        AND d.deleted_at IS NULL
        AND d.price_per_person IS NOT NULL
    `;

    const foodCostPercent =
      dishPricing?.avg_price && dishPricing.avg_price > 0
        ? (costPerYield / dishPricing.avg_price) * 100
        : null;

    return {
      success: true,
      data: {
        recipe: {
          id: recipeData.id,
          name: recipeData.name,
          description: recipeData.description,
          yieldQuantity: Number(recipeData.yield_quantity),
          yieldUnit: recipeData.yield_unit,
        },
        costs: {
          totalCost,
          costPerYield,
          costPerPortion,
          foodCostPercent,
        },
        ingredients: ingredients.map((ing) => ({
          ingredientId: ing.ingredient_id,
          ingredientName: ing.ingredient_name,
          quantity: Number(ing.quantity),
          unit: ing.unit,
          wasteFactor: Number(ing.waste_factor),
          adjustedQuantity: Number(ing.adjusted_quantity),
          lowestVendorCost: Number(ing.lowest_vendor_cost),
          vendorName: ing.vendor_name,
          vendorItemCount: Number(ing.vendor_item_count),
          totalCost: Number(ing.total_cost),
          costPercentOfTotal: Number(ing.cost_percent_of_total),
        })),
        vendors: vendors.map((v) => ({
          name: v.name,
          itemCost: Number(v.item_cost),
        })),
      },
    };
  } catch (error) {
    console.error("[costing-actions] getVendorRecipeCostBreakdown error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch recipe breakdown",
    };
  }
}

/**
 * Get costing summary statistics
 */
export async function getCostingSummaryStats(): Promise<{
  success: boolean;
  data?: CostingSummaryStats;
  error?: string;
}> {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return { success: false, error: "Unauthorized" };
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const [stats] = await database.$queryRaw<
      {
        avg_food_cost_percent: number;
        total_recipe_value: number;
        highest_margin_name: string | null;
        highest_margin: number | null;
        lowest_margin_name: string | null;
        lowest_margin: number | null;
        recipes_with_cost_data: number;
        total_recipes: number;
        high_food_cost_alerts: number;
      }[]
    >`
      WITH recipe_costs AS (
        SELECT
          r.id AS recipe_id,
          r.name AS recipe_name,
          rv.total_cost,
          rv.yield_quantity,
          rv.cost_per_yield
        FROM tenant_kitchen.recipes r
        LEFT JOIN LATERAL (
          SELECT rv.*
          FROM tenant_kitchen.recipe_versions rv
          WHERE rv.tenant_id = r.tenant_id
            AND rv.recipe_id = r.id
            AND rv.deleted_at IS NULL
          ORDER BY rv.version_number DESC
          LIMIT 1
        ) rv ON true
        WHERE r.tenant_id = ${tenantId}
          AND r.deleted_at IS NULL
      ),
      dish_pricing AS (
        SELECT
          dr.recipe_id,
          AVG(d.price_per_person) AS avg_menu_price
        FROM tenant_kitchen.dishes d
        INNER JOIN tenant_kitchen.recipes dr
          ON dr.tenant_id = d.tenant_id
          AND dr.id = d.recipe_id
        WHERE d.tenant_id = ${tenantId}
          AND d.deleted_at IS NULL
          AND d.price_per_person IS NOT NULL
        GROUP BY dr.recipe_id
      ),
      calculated_costs AS (
        SELECT
          rc.recipe_id,
          rc.recipe_name,
          rc.total_cost,
          rc.yield_quantity,
          rc.cost_per_yield,
          dp.avg_menu_price,
          CASE
            WHEN dp.avg_menu_price > 0
            THEN ((rc.total_cost / NULLIF(rc.yield_quantity, 0)) / dp.avg_menu_price) * 100
            ELSE NULL
          END AS food_cost_percent,
          CASE
            WHEN dp.avg_menu_price > 0
            THEN ((dp.avg_menu_price - (rc.total_cost / NULLIF(rc.yield_quantity, 0))) / dp.avg_menu_price) * 100
            ELSE NULL
          END AS margin
        FROM recipe_costs rc
        LEFT JOIN dish_pricing dp ON dp.recipe_id = rc.recipe_id
        WHERE rc.total_cost > 0
      )
      SELECT
        COALESCE(AVG(cc.food_cost_percent), 0) AS avg_food_cost_percent,
        COALESCE(SUM(cc.total_cost), 0) AS total_recipe_value,
        (
          SELECT cc.recipe_name
          FROM calculated_costs cc
          WHERE cc.margin IS NOT NULL
          ORDER BY cc.margin DESC
          LIMIT 1
        ) AS highest_margin_name,
        (
          SELECT MAX(cc.margin)
          FROM calculated_costs cc
          WHERE cc.margin IS NOT NULL
        ) AS highest_margin,
        (
          SELECT cc.recipe_name
          FROM calculated_costs cc
          WHERE cc.margin IS NOT NULL
          ORDER BY cc.margin ASC
          LIMIT 1
        ) AS lowest_margin_name,
        (
          SELECT MIN(cc.margin)
          FROM calculated_costs cc
          WHERE cc.margin IS NOT NULL
        ) AS lowest_margin,
        COUNT(DISTINCT cc.recipe_id) AS recipes_with_cost_data,
        (SELECT COUNT(*) FROM tenant_kitchen.recipes WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS total_recipes,
        COUNT(*) FILTER (WHERE cc.food_cost_percent > 35) AS high_food_cost_alerts
      FROM calculated_costs cc
    `;

    return {
      success: true,
      data: {
        avgFoodCostPercent: Number(stats.avg_food_cost_percent),
        totalRecipeValue: Number(stats.total_recipe_value),
        highestMarginDish: stats.highest_margin_name
          ? {
              name: stats.highest_margin_name,
              margin: Number(stats.highest_margin),
            }
          : null,
        lowestMarginDish: stats.lowest_margin_name
          ? {
              name: stats.lowest_margin_name,
              margin: Number(stats.lowest_margin),
            }
          : null,
        recipesWithCostData: Number(stats.recipes_with_cost_data),
        totalRecipes: Number(stats.total_recipes),
        highFoodCostAlerts: Number(stats.high_food_cost_alerts),
      },
    };
  } catch (error) {
    console.error("[costing-actions] getCostingSummaryStats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch summary stats",
    };
  }
}
