/**
 * @module RecipeCost
 * @intent Handle API requests to calculate and update recipe costs
 * @responsibility Calculate ingredient costs, update RecipeVersion via manifest runtime
 * @domain Kitchen
 * @tags recipes, api, cost-calculation
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";

export const runtime = "nodejs";

export interface UnitConversion {
  fromUnitId: number;
  toUnitId: number;
  multiplier: number;
}

export interface RecipeCostBreakdown {
  totalCost: number;
  costPerYield: number;
  costPerPortion: number | null;
  lastCalculated: Date | null;
  ingredients: IngredientCostBreakdown[];
  recipe: {
    id: string;
    name: string;
    description: string | null;
    yieldQuantity: number | null;
    yieldUnit: string | null;
    portionSize: number | null;
    portionUnit: string | null;
  };
}

export interface IngredientCostBreakdown {
  id: string;
  recipeIngredientId: string;
  name: string;
  quantity: number;
  unit: string;
  wasteFactor: number;
  adjustedQuantity: number;
  unitCost: number;
  cost: number;
  hasInventoryItem: boolean;
  inventoryItemId: string | null;
}

interface RecipeVersionCostRow {
  id: string;
  name: string;
  description: string | null;
  yieldQuantity: Prisma.Decimal | number | string | null;
  yieldUnit: string | null;
  lastCalculated: Date | null;
}

interface RecipeIngredientCostRow {
  id: string;
  name: string;
  quantity: Prisma.Decimal | number | string;
  unit: string | null;
  wasteFactor: Prisma.Decimal | number | string;
  ingredientCost: Prisma.Decimal | number | string | null;
  inventoryItemId: string | null;
}

/**
 * Calculate recipe cost from ingredients.
 * Returns cost breakdown without persisting (used by both GET and POST).
 */
const calculateRecipeCostData = async (
  tenantId: string,
  recipeVersionId: string
): Promise<{
  breakdown: RecipeCostBreakdown;
  totalCost: number;
  costPerYield: number;
} | null> => {
  const recipeVersions = await database.$queryRaw<RecipeVersionCostRow[]>(
    Prisma.sql`
      SELECT
        rv.id,
        COALESCE(NULLIF(rv.name, ''), r.name) AS "name",
        COALESCE(rv.description, r.description) AS "description",
        rv.yield_quantity AS "yieldQuantity",
        u.code AS "yieldUnit",
        rv.cost_calculated_at AS "lastCalculated"
      FROM tenant_kitchen.recipe_versions rv
      LEFT JOIN tenant_kitchen.recipes r
        ON r.tenant_id = rv.tenant_id
        AND r.id = rv.recipe_id
        AND r.deleted_at IS NULL
      LEFT JOIN core.units u ON u.id = rv.yield_unit_id
      WHERE rv.tenant_id = ${tenantId}
        AND rv.id = ${recipeVersionId}
        AND rv.deleted_at IS NULL
      LIMIT 1
    `
  );
  const recipeVersion = recipeVersions[0];

  if (!recipeVersion) {
    return null;
  }

  const recipeIngredients = await database.$queryRaw<RecipeIngredientCostRow[]>(
    Prisma.sql`
      SELECT
        ri.id,
        i.name,
        ri.quantity,
        COALESCE(u.code, ri.unit_id::text) AS "unit",
        COALESCE(ri.waste_factor, 1.0) AS "wasteFactor",
        ri.ingredient_cost AS "ingredientCost",
        ii.id AS "inventoryItemId"
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i
        ON i.tenant_id = ri.tenant_id
        AND i.id = ri.ingredient_id
        AND i.deleted_at IS NULL
      LEFT JOIN core.units u ON u.id = ri.unit_id
      LEFT JOIN LATERAL (
        SELECT id
        FROM tenant_inventory.inventory_items ii
        WHERE ii.tenant_id = ri.tenant_id
          AND ii.name = i.name
          AND ii.deleted_at IS NULL
        ORDER BY ii.updated_at DESC
        LIMIT 1
      ) ii ON true
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = ${recipeVersionId}
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order ASC
    `
  );

  let totalCost = 0;
  const costBreakdowns: IngredientCostBreakdown[] = [];

  for (const ri of recipeIngredients) {
    const cost = Number(ri.ingredientCost) || 0;
    totalCost += cost;

    const quantity = Number(ri.quantity);
    const wasteFactor = Number(ri.wasteFactor);
    const adjustedQuantity = quantity * wasteFactor;

    costBreakdowns.push({
      id: ri.id,
      recipeIngredientId: ri.id,
      name: ri.name,
      quantity,
      unit: ri.unit ?? "units",
      wasteFactor,
      adjustedQuantity,
      unitCost: adjustedQuantity > 0 ? cost / adjustedQuantity : 0,
      cost,
      hasInventoryItem: ri.inventoryItemId !== null,
      inventoryItemId: ri.inventoryItemId,
    });
  }

  const yieldQuantity = Number(recipeVersion.yieldQuantity);
  const costPerYield = yieldQuantity > 0 ? totalCost / yieldQuantity : 0;

  return {
    breakdown: {
      totalCost,
      costPerYield,
      costPerPortion: null,
      lastCalculated: recipeVersion.lastCalculated,
      ingredients: costBreakdowns,
      recipe: {
        id: recipeVersion.id,
        name: recipeVersion.name,
        description: recipeVersion.description,
        yieldQuantity,
        yieldUnit: recipeVersion.yieldUnit,
        portionSize: null,
        portionUnit: null,
      },
    },
    totalCost,
    costPerYield,
  };
};

/**
 * GET - Fetch recipe cost breakdown (read-only, no persistence)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeId } = await params;
    const recipeVersionId = recipeId;
    const { orgId } = await auth();

    if (!orgId) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const costData = await calculateRecipeCostData(tenantId, recipeVersionId);

    if (!costData) {
      return manifestErrorResponse("Recipe version not found", 404);
    }

    return manifestSuccessResponse(costData.breakdown);
  } catch (error) {
    log.error("[recipes/cost] Error:", error);
    captureException(error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch recipe cost";
    return manifestErrorResponse(message, 500);
  }
}

/**
 * POST - Recalculate and persist recipe costs via manifest runtime.
 *
 * Reads (cost calculation from ingredients) bypass Manifest (constitution S10).
 * Only the final RecipeVersion cost update goes through governed runtime.
 * Ancillary ingredient timestamp update is not a governed domain mutation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recipeVersionId } = await params;
    const user = await resolveCurrentUser(request);

    if (!user) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const { tenantId } = user;

    // Calculate costs first (read path, constitution S10)
    const costData = await calculateRecipeCostData(tenantId, recipeVersionId);

    if (!costData) {
      return manifestErrorResponse("Recipe version not found", 404);
    }

    // GOVERNED BYPASS: RecipeIngredient.updateMany — documented in manifest/governance/bypasses.json
    // Batch timestamps costCalculatedAt on all ingredients; not a domain mutation.
    await database.recipeIngredient.updateMany({
      where: {
        tenantId,
        recipeVersionId,
        deletedAt: null,
      },
      data: { costCalculatedAt: new Date() },
    });

    // Update RecipeVersion costs via governed Manifest command
    const commandResponse = await runManifestCommand({
      entity: "RecipeVersion",
      command: "updateCosts",
      body: {
        id: recipeVersionId,
        tenantId,
        newTotalCost: costData.totalCost,
        newCostPerYield: costData.costPerYield,
      },
      user,
    });

    if (!commandResponse.ok) {
      return commandResponse;
    }

    // Client contract (use-recipe-costing.recalculateRecipeCost) expects the
    // full RecipeCostBreakdown — same shape as GET, not the command envelope.
    return manifestSuccessResponse(costData.breakdown);
  } catch (error) {
    log.error("[recipes/cost] Error:", error);
    captureException(error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to recalculate recipe cost";
    return manifestErrorResponse(message, 500);
  }
}
