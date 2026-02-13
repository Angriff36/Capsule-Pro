/**
 * @module RecipeStepsAPI
 * @intent Fetch recipe steps for mobile viewer with step-by-step instructions
 * @responsibility Provide paginated recipe steps for mobile recipe viewer
 * @domain Kitchen
 * @tags recipes, steps, api, mobile
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
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

    // First, get the latest version of the recipe
    const recipes = await database.$queryRaw<
      {
        id: string;
        name: string;
        version_id: string;
        description: string | null;
        prep_time_minutes: number | null;
        cook_time_minutes: number | null;
        rest_time_minutes: number | null;
        yield_quantity: number | null;
        yield_unit_code: string | null;
      }[]
    >(
      Prisma.sql`
        SELECT
          r.id,
          r.name,
          rv.id AS version_id,
          r.description,
          rv.prep_time_minutes,
          rv.cook_time_minutes,
          rv.rest_time_minutes,
          rv.yield_quantity,
          u.code AS yield_unit_code
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
        WHERE r.tenant_id = ${tenantId}
          AND r.id = ${recipeId}
          AND r.deleted_at IS NULL
      `
    );

    if (recipes.length === 0) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipe = recipes[0];

    // Fetch recipe steps for the latest version
    const steps = await database.$queryRaw<
      {
        step_number: number;
        instruction: string;
        duration_minutes: number | null;
        temperature_value: number | null;
        temperature_unit: string | null;
        equipment_needed: string[] | null;
        tips: string | null;
        video_url: string | null;
        image_url: string | null;
      }[]
    >(
      Prisma.sql`
        SELECT
          step_number,
          instruction,
          duration_minutes,
          temperature_value,
          temperature_unit,
          equipment_needed,
          tips,
          video_url,
          image_url
        FROM tenant_kitchen.recipe_steps
        WHERE tenant_id = ${tenantId}
          AND recipe_version_id = ${recipe.version_id}
          AND deleted_at IS NULL
        ORDER BY step_number ASC
      `
    );

    // Calculate total duration for all timed steps
    const totalDuration = steps.reduce(
      (sum, step) => sum + (step.duration_minutes || 0),
      0
    );

    const response: RecipeStepsResponse = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipeVersionId: recipe.version_id,
      description: recipe.description,
      prepTimeMinutes: recipe.prep_time_minutes,
      cookTimeMinutes: recipe.cook_time_minutes,
      restTimeMinutes: recipe.rest_time_minutes,
      yieldQuantity: recipe.yield_quantity,
      yieldUnit: recipe.yield_unit_code,
      steps: steps.map((step) => ({
        stepNumber: step.step_number,
        instruction: step.instruction,
        durationMinutes: step.duration_minutes,
        temperatureValue: step.temperature_value,
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
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to fetch recipe steps" },
      { status: 500 }
    );
  }
}
