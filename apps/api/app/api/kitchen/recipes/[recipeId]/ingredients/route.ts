/**
 * @module RecipeIngredientsAPI
 * @intent Fetch recipe ingredients for mobile viewer
 * @responsibility Provide ingredients list for a recipe
 * @domain Kitchen
 * @tags recipes, ingredients, api, mobile
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  unitCode: string;
  notes: string | null;
  isOptional: boolean;
  orderIndex: number;
};

/**
 * GET /api/kitchen/recipes/[recipeId]/ingredients
 * Fetch ingredients for the latest version of a recipe
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Fetch ingredients for the recipe's latest version
    const ingredients = await database.$queryRaw<
      {
        id: string;
        name: string;
        quantity: number;
        unit_code: string;
        notes: string | null;
        is_optional: boolean;
        order_index: number;
      }[]
    >(
      Prisma.sql`
        SELECT
          i.id,
          i.name,
          ri.quantity,
          u.code AS unit_code,
          ri.notes,
          ri.is_optional,
          ri.sort_order AS order_index
        FROM tenant_kitchen.recipes r
        LEFT JOIN LATERAL (
          SELECT rv.id
          FROM tenant_kitchen.recipe_versions rv
          WHERE rv.tenant_id = r.tenant_id
            AND rv.recipe_id = r.id
            AND rv.deleted_at IS NULL
          ORDER BY rv.version_number DESC
          LIMIT 1
        ) rv ON true
        JOIN tenant_kitchen.recipe_ingredients ri
          ON ri.tenant_id = r.tenant_id
          AND ri.recipe_version_id = rv.id
          AND ri.deleted_at IS NULL
        JOIN tenant_kitchen.ingredients i
          ON i.tenant_id = ri.tenant_id
          AND i.id = ri.ingredient_id
          AND i.deleted_at IS NULL
        LEFT JOIN core.units u ON u.id = ri.unit_id
        WHERE r.tenant_id = ${tenantId}
          AND r.id = ${recipeId}
          AND r.deleted_at IS NULL
        ORDER BY ri.sort_order ASC
      `
    );

    return NextResponse.json({
      ingredients: ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        quantity: Number(ing.quantity),
        unitCode: ing.unit_code,
        notes: ing.notes,
        isOptional: ing.is_optional,
        orderIndex: ing.order_index,
      })),
    });
  } catch (error) {
    console.error("Error fetching recipe ingredients:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe ingredients" },
      { status: 500 }
    );
  }
}
