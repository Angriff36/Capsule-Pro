/**
 * @module RecipeStepsAPI
 * @intent Fetch recipe steps for mobile viewer with step-by-step instructions
 * @responsibility Provide paginated recipe steps for mobile recipe viewer
 * @domain Kitchen
 * @tags recipes, steps, api, mobile
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
  temperatureValue: number | null;
  temperatureUnit: string | null;
  equipmentNeeded: string[] | null;
  tips: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
}

export interface RecipeStepsResponse {
  recipeId: string;
  recipeName: string;
  recipeVersionId: string;
  description: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  restTimeMinutes: number | null;
  yieldQuantity: number | null;
  yieldUnit: string | null;
  steps: RecipeStep[];
  totalDuration: number; // Total time in minutes for all timed steps
}

/**
 * GET /api/kitchen/recipes/[recipeId]/steps
 * Fetch recipe steps for the latest version of a recipe
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

    // Fetch recipe
    const recipe = await database.recipe.findFirst({
      where: { tenantId, id: recipeId, deletedAt: null },
      select: { id: true, name: true, description: true },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Fetch latest recipe version (replaces LATERAL JOIN)
    const latestVersion = await database.recipeVersion.findFirst({
      where: { tenantId, recipeId, deletedAt: null },
      orderBy: { versionNumber: "desc" },
      select: {
        id: true,
        prepTimeMinutes: true,
        cookTimeMinutes: true,
        restTimeMinutes: true,
        yieldQuantity: true,
        yieldUnitId: true,
      },
    });

    if (!latestVersion) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    // Fetch yield unit code from core.units
    const unit = latestVersion.yieldUnitId
      ? await database.units.findUnique({
          where: { id: latestVersion.yieldUnitId },
          select: { code: true },
        })
      : null;

    // Fetch recipe steps for the latest version
    const steps = await database.recipe_steps.findMany({
      where: {
        tenant_id: tenantId,
        recipe_version_id: latestVersion.id,
        deleted_at: null,
      },
      orderBy: { step_number: "asc" },
      select: {
        step_number: true,
        instruction: true,
        duration_minutes: true,
        temperature_value: true,
        temperature_unit: true,
        equipment_needed: true,
        tips: true,
        video_url: true,
        image_url: true,
      },
    });

    // Calculate total duration for all timed steps
    const totalDuration = steps.reduce(
      (sum, step) => sum + (step.duration_minutes || 0),
      0
    );

    const response: RecipeStepsResponse = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeVersionId: latestVersion.id,
      description: recipe.description,
      prepTimeMinutes: latestVersion.prepTimeMinutes,
      cookTimeMinutes: latestVersion.cookTimeMinutes,
      restTimeMinutes: latestVersion.restTimeMinutes,
      yieldQuantity: latestVersion.yieldQuantity
        ? Number(latestVersion.yieldQuantity)
        : null,
      yieldUnit: unit?.code ?? null,
      steps: steps.map((step) => ({
        stepNumber: step.step_number,
        instruction: step.instruction,
        durationMinutes: step.duration_minutes,
        temperatureValue: step.temperature_value
          ? Number(step.temperature_value)
          : null,
        temperatureUnit: step.temperature_unit,
        equipmentNeeded: step.equipment_needed,
        tips: step.tips,
        videoUrl: step.video_url,
        imageUrl: step.image_url,
      })),
      totalDuration,
    };

    return NextResponse.json(response);
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to fetch recipe steps" },
      { status: 500 }
    );
  }
}
