import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface RecipeVersionDetail {
  id: string;
  recipeId: string;
  versionNumber: number;
  createdAt: string;
  name: string;
  category: string | null;
  cuisineType: string | null;
  description: string | null;
  tags: string[];
  yield: {
    quantity: number;
    unitId: number;
    unit: string | null;
    description: string | null;
  };
  times: {
    prepMinutes: number | null;
    cookMinutes: number | null;
    restMinutes: number | null;
  };
  difficultyLevel: number | null;
  instructions: string | null;
  notes: string | null;
  ingredients: {
    id: string;
    ingredientId: string;
    name: string;
    quantity: number;
    unit: string | null;
    preparationNotes: string | null;
    isOptional: boolean;
    sortOrder: number;
  }[];
  steps: {
    id: string;
    stepNumber: number;
    instruction: string;
    durationMinutes: number | null;
    temperatureValue: number | null;
    temperatureUnit: string | null;
    equipmentNeeded: string[] | null;
    tips: string | null;
    videoUrl: string | null;
    imageUrl: string | null;
  }[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recipeId: string; versionId: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { recipeId, versionId } = await params;

  try {
    // Fetch version details
    const versionResult = await database.$queryRaw<
      {
        id: string;
        recipe_id: string;
        version_number: number;
        created_at: Date;
        name: string;
        category: string | null;
        cuisine_type: string | null;
        description: string | null;
        tags: string[];
        yield_quantity: bigint;
        yield_unit_id: number;
        yield_description: string | null;
        prep_time_minutes: number | null;
        cook_time_minutes: number | null;
        rest_time_minutes: number | null;
        difficulty_level: number | null;
        instructions: string | null;
        notes: string | null;
      }[]
    >`
      SELECT
        id,
        recipe_id,
        version_number,
        created_at,
        name,
        category,
        cuisine_type,
        description,
        tags,
        yield_quantity,
        yield_unit_id,
        yield_description,
        prep_time_minutes,
        cook_time_minutes,
        rest_time_minutes,
        difficulty_level,
        instructions,
        notes
      FROM tenant_kitchen.recipe_versions
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${versionId}::uuid
        AND recipe_id = ${recipeId}::uuid
    `;

    if (versionResult.length === 0) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const version = versionResult[0];

    // Fetch unit name for yield
    const unitResult = await database.$queryRaw<{ name: string | null }[]>`
      SELECT name FROM core.units WHERE id = ${version.yield_unit_id}
    `;
    const yieldUnit = unitResult[0]?.name ?? null;

    // Fetch ingredients with names and units
    const ingredientsResult = await database.$queryRaw<
      {
        id: string;
        ingredient_id: string;
        name: string;
        quantity: bigint;
        unit: string | null;
        preparation_notes: string | null;
        is_optional: boolean;
        sort_order: number;
      }[]
    >`
      SELECT
        ri.id,
        ri.ingredient_id,
        i.name,
        ri.quantity,
        u.name as unit,
        ri.preparation_notes,
        ri.is_optional,
        ri.sort_order
      FROM tenant_kitchen.recipe_ingredients ri
      LEFT JOIN tenant_kitchen.ingredients i ON ri.ingredient_id = i.id AND ri.tenant_id = i.tenant_id
      LEFT JOIN core.units u ON ri.unit_id = u.id
      WHERE ri.tenant_id = ${tenantId}::uuid
        AND ri.recipe_version_id = ${versionId}::uuid
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order
    `;

    // Fetch steps
    const stepsResult = await database.$queryRaw<
      {
        id: string;
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
    >`
      SELECT
        id,
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
      WHERE tenant_id = ${tenantId}::uuid
        AND recipe_version_id = ${versionId}::uuid
        AND deleted_at IS NULL
      ORDER BY step_number
    `;

    const response: RecipeVersionDetail = {
      id: version.id,
      recipeId: version.recipe_id,
      versionNumber: version.version_number,
      createdAt: version.created_at.toISOString(),
      name: version.name,
      category: version.category,
      cuisineType: version.cuisine_type,
      description: version.description,
      tags: version.tags,
      yield: {
        quantity: Number(version.yield_quantity),
        unitId: version.yield_unit_id,
        unit: yieldUnit,
        description: version.yield_description,
      },
      times: {
        prepMinutes: version.prep_time_minutes,
        cookMinutes: version.cook_time_minutes,
        restMinutes: version.rest_time_minutes,
      },
      difficultyLevel: version.difficulty_level,
      instructions: version.instructions,
      notes: version.notes,
      ingredients: ingredientsResult.map((ing) => ({
        id: ing.id,
        ingredientId: ing.ingredient_id,
        name: ing.name,
        quantity: Number(ing.quantity),
        unit: ing.unit,
        preparationNotes: ing.preparation_notes,
        isOptional: ing.is_optional,
        sortOrder: ing.sort_order,
      })),
      steps: stepsResult.map((step) => ({
        id: step.id,
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
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/kitchen/recipes/versions/[versionId]] Error:", error);
    captureException(error);
    return NextResponse.json(
      { error: "Failed to fetch version details" },
      { status: 500 }
    );
  }
}
