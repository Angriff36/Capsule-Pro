/**
 * @module RecipeAllergens
 * @intent Handle API requests for allergen information
 * @responsibility Return allergen data for recipes
 * @domain Kitchen
 * @tags recipes, api, allergens, nutrition
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { AllergenInfo } from "@repo/manifest-adapters/src/nutrition-label-engine";
import { getAllergenSummary } from "@repo/manifest-adapters/src/nutrition-label-engine";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

/**
 * GET - Get allergen information for a recipe
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    const { orgId } = await auth();

    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 400 }
      );
    }

    // Get allergen summary
    const allergens = await getAllergenSummary(database, tenantId, recipeId);

    return NextResponse.json(allergens satisfies AllergenInfo);
  } catch (error) {
    console.error("[recipes/allergens] Error:", error);

    return NextResponse.json(
      {
        message: "Failed to get allergen information",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
