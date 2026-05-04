/**
 * @module CalculateIngredientCost
 * @intent Ad-hoc cost calculation for inline ingredients (pre-save cost preview)
 * @responsibility Look up inventory item costs and return per-ingredient cost breakdown
 * @domain Kitchen
 * @tags ingredients, api, cost-calculation
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

interface CalculateCostRequest {
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    isSubRecipe?: boolean;
    subRecipeId?: string;
  }>;
  scaleFactor: number;
  yieldQuantity: number;
}

interface CostBreakdownItem {
  cost: number;
  hasInventoryItem: boolean;
  name: string;
}

/**
 * POST - Calculate ad-hoc ingredient costs by looking up inventory item unit costs
 * Used by the recipe editor for real-time cost preview while editing
 */
export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    const body: CalculateCostRequest = await request.json();
    const { ingredients, scaleFactor = 1, yieldQuantity = 1 } = body;

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({
        totalCost: 0,
        costPerYield: 0,
        ingredients: [],
      });
    }

    // Get unique ingredient names to look up in one query
    const ingredientNames = [
      ...new Set(
        ingredients
          .filter((ing) => !ing.isSubRecipe)
          .map((ing) => ing.name.trim().toLowerCase())
      ),
    ];

    // Look up InventoryItem costs for all ingredients in one query
    const inventoryItems =
      ingredientNames.length > 0
        ? await database.$queryRaw<
            Array<{ name: string; unit_cost: number }>
          >`
            SELECT DISTINCT ON (LOWER(name)) name, unit_cost
            FROM tenant_inventory.inventory_items
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND LOWER(name) = ANY(${ingredientNames})
          `
        : [];

    // Build a lookup map: lowercase name -> unit cost
    const costMap = new Map<string, number>();
    if (Array.isArray(inventoryItems)) {
      for (const item of inventoryItems) {
        costMap.set(item.name.toLowerCase(), Number(item.unit_cost) || 0);
      }
    }

    // Calculate costs for each ingredient
    let totalCost = 0;
    const costBreakdown: CostBreakdownItem[] = ingredients.map((ing) => {
      const key = ing.name.trim().toLowerCase();
      const unitCost = costMap.get(key) || 0;
      const quantity = (ing.quantity || 0) * scaleFactor;
      const cost = quantity > 0 ? unitCost * quantity : 0;
      totalCost += cost;

      return {
        cost,
        hasInventoryItem: costMap.has(key) && !ing.isSubRecipe,
        name: ing.name,
      };
    });

    const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;

    return NextResponse.json({
      totalCost: Math.round(totalCost * 100) / 100,
      costPerYield: Math.round(costPerYield * 100) / 100,
      ingredients: costBreakdown,
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to calculate ingredient costs" },
      { status: 500 }
    );
  }
}
