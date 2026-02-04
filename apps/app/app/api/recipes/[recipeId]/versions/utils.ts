import { database, Prisma } from "@repo/database";

export interface RecipeVersionSnapshot {
  id: string;
  recipeId: string;
  versionNumber: number;
  createdAt: Date;
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

export const getRecipeVersionSnapshot = async (
  tenantId: string,
  recipeId: string,
  versionId: string
): Promise<RecipeVersionSnapshot | null> => {
  const [version] = await database.$queryRaw<
    {
      id: string;
      recipe_id: string;
      version_number: number;
      created_at: Date;
      name: string;
      category: string | null;
      cuisine_type: string | null;
      description: string | null;
      tags: string[] | null;
      yield_quantity: number;
      yield_unit_id: number;
      yield_unit: string | null;
      yield_description: string | null;
      prep_time_minutes: number | null;
      cook_time_minutes: number | null;
      rest_time_minutes: number | null;
      difficulty_level: number | null;
      instructions: string | null;
      notes: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        rv.id,
        rv.recipe_id,
        rv.version_number,
        rv.created_at,
        rv.name,
        rv.category,
        rv.cuisine_type,
        rv.description,
        rv.tags,
        rv.yield_quantity,
        rv.yield_unit_id,
        u.code AS yield_unit,
        rv.yield_description,
        rv.prep_time_minutes,
        rv.cook_time_minutes,
        rv.rest_time_minutes,
        rv.difficulty_level,
        rv.instructions,
        rv.notes
      FROM tenant_kitchen.recipe_versions rv
      LEFT JOIN core.units u ON u.id = rv.yield_unit_id
      WHERE rv.tenant_id = ${tenantId}
        AND rv.recipe_id = ${recipeId}
        AND rv.id = ${versionId}
        AND rv.deleted_at IS NULL
      LIMIT 1
    `
  );

  if (!version) {
    return null;
  }

  const ingredients = await database.$queryRaw<
    {
      id: string;
      ingredient_id: string;
      ingredient_name: string;
      quantity: number;
      unit_code: string | null;
      preparation_notes: string | null;
      is_optional: boolean;
      sort_order: number;
    }[]
  >(
    Prisma.sql`
      SELECT
        ri.id,
        ri.ingredient_id,
        i.name AS ingredient_name,
        ri.quantity,
        u.code AS unit_code,
        ri.preparation_notes,
        ri.is_optional,
        ri.sort_order
      FROM tenant_kitchen.recipe_ingredients ri
      JOIN tenant_kitchen.ingredients i
        ON i.tenant_id = ri.tenant_id
        AND i.id = ri.ingredient_id
      LEFT JOIN core.units u ON u.id = ri.unit_id
      WHERE ri.tenant_id = ${tenantId}
        AND ri.recipe_version_id = ${versionId}
        AND ri.deleted_at IS NULL
      ORDER BY ri.sort_order ASC
    `
  );

  const steps = await database.$queryRaw<
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
  >(
    Prisma.sql`
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
      WHERE tenant_id = ${tenantId}
        AND recipe_version_id = ${versionId}
        AND deleted_at IS NULL
      ORDER BY step_number ASC
    `
  );

  return {
    id: version.id,
    recipeId: version.recipe_id,
    versionNumber: version.version_number,
    createdAt: version.created_at,
    name: version.name,
    category: version.category,
    cuisineType: version.cuisine_type,
    description: version.description,
    tags: version.tags ?? [],
    yield: {
      quantity: version.yield_quantity,
      unitId: version.yield_unit_id,
      unit: version.yield_unit,
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
    ingredients: ingredients.map((ingredient) => ({
      id: ingredient.id,
      ingredientId: ingredient.ingredient_id,
      name: ingredient.ingredient_name,
      quantity: ingredient.quantity,
      unit: ingredient.unit_code,
      preparationNotes: ingredient.preparation_notes,
      isOptional: ingredient.is_optional,
      sortOrder: ingredient.sort_order,
    })),
    steps: steps.map((step) => ({
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
};
