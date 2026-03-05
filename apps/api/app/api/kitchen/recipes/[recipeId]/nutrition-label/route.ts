/**
 * @module NutritionLabel
 * @intent Handle API requests for FDA-compliant nutrition label generation
 * @responsibility Generate nutrition labels and allergen information based on recipe ingredients
 * @domain Kitchen
 * @tags recipes, api, nutrition, labels, allergens
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NutritionLabel } from "@repo/manifest-adapters/src/nutrition-label-engine";
import {
  batchGenerateNutritionLabels,
  generateNutritionLabel,
} from "@repo/manifest-adapters/src/nutrition-label-engine";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export const runtime = "nodejs";

/**
 * GET - Generate nutrition label for a recipe
 *
 * Query parameters:
 * - servingSize: Custom serving size (e.g., "1 cup (237g)")
 * - servingsPerContainer: Number of servings per container
 * - format: Response format ("json" or "svg")
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

    // Generate nutrition label
    const label = await generateNutritionLabel(database, tenantId, recipeId);

    return NextResponse.json(label satisfies NutritionLabel);
  } catch (error) {
    console.error("[recipes/nutrition-label] Error:", error);

    return NextResponse.json(
      {
        message: "Failed to generate nutrition label",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Batch generate nutrition labels for multiple recipes
 */
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { recipeIds, servingSize, servingsPerContainer } = body as {
      recipeIds?: string[];
      servingSize?: string;
      servingsPerContainer?: number;
    };

    if (!(recipeIds && Array.isArray(recipeIds)) || recipeIds.length === 0) {
      return NextResponse.json(
        { message: "recipeIds array is required" },
        { status: 400 }
      );
    }

    if (recipeIds.length > 50) {
      return NextResponse.json(
        { message: "Maximum 50 recipes per batch" },
        { status: 400 }
      );
    }

    // Batch generate labels
    const labels = await batchGenerateNutritionLabels(
      database,
      tenantId,
      recipeIds,
      { servingSize, servingsPerContainer }
    );

    return NextResponse.json({
      labels,
      summary: `Generated ${labels.length} nutrition label${labels.length === 1 ? "" : "s"}`,
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error("[recipes/nutrition-label] Error:", error);

    return NextResponse.json(
      {
        message: "Failed to generate nutrition labels",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
