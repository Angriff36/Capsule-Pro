import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface VersionMeta {
  id: string;
  versionNumber: number;
  createdAt: string;
}

interface IngredientSnapshot {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
}

interface StepSnapshot {
  stepNumber: number;
  instruction: string;
}

interface RecipeVersionCompare {
  from: VersionMeta;
  to: VersionMeta;
  changes: {
    base: Record<
      string,
      {
        from: string | number | string[] | null;
        to: string | number | string[] | null;
      }
    >;
    ingredients: {
      added: IngredientSnapshot[];
      removed: IngredientSnapshot[];
      changed: {
        ingredientId: string;
        name: string;
        from: IngredientSnapshot;
        to: IngredientSnapshot;
      }[];
    };
    steps: {
      added: StepSnapshot[];
      removed: StepSnapshot[];
      changed: {
        stepNumber: number;
        from: StepSnapshot;
        to: StepSnapshot;
      }[];
    };
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  if (!tenantId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { recipeId } = await params;
  const { searchParams } = new URL(request.url);
  const fromId = searchParams.get("from");
  const toId = searchParams.get("to");

  if (!(fromId && toId)) {
    return NextResponse.json(
      { error: "Both 'from' and 'to' query parameters are required" },
      { status: 400 }
    );
  }

  if (fromId === toId) {
    return NextResponse.json(
      { error: "Cannot compare a version with itself" },
      { status: 400 }
    );
  }

  try {
    // Fetch both versions - SECURITY: must belong to same recipeId AND tenantId
    const versionsResult = await database.$queryRaw<
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
        AND recipe_id = ${recipeId}::uuid
        AND id IN (${fromId}::uuid, ${toId}::uuid)
    `;

    if (versionsResult.length !== 2) {
      return NextResponse.json(
        { error: "One or both versions not found" },
        { status: 404 }
      );
    }

    const fromVersion =
      versionsResult.find((v) => v.id === fromId) ?? versionsResult[0];
    const toVersion =
      versionsResult.find((v) => v.id === toId) ?? versionsResult[1];

    // Fetch unit names
    const unitIds = [fromVersion.yield_unit_id, toVersion.yield_unit_id];
    const unitsResult = await database.$queryRaw<
      { id: number; name: string }[]
    >`
      SELECT id, name FROM core.units WHERE id IN (${unitIds.join(",")}::int2)
    `;
    const unitMap = new Map(unitsResult.map((u) => [u.id, u.name]));

    // Fetch ingredients for both versions
    const ingredientsResult = await database.$queryRaw<
      {
        recipe_version_id: string;
        ingredient_id: string;
        name: string;
        quantity: bigint;
        unit: string | null;
        preparation_notes: string | null;
        is_optional: boolean;
      }[]
    >`
      SELECT
        ri.recipe_version_id,
        ri.ingredient_id,
        i.name,
        ri.quantity,
        u.name as unit,
        ri.preparation_notes,
        ri.is_optional
      FROM tenant_kitchen.recipe_ingredients ri
      LEFT JOIN tenant_kitchen.ingredients i ON ri.ingredient_id = i.id AND ri.tenant_id = i.tenant_id
      LEFT JOIN core.units u ON ri.unit_id = u.id
      WHERE ri.tenant_id = ${tenantId}::uuid
        AND ri.recipe_version_id IN (${fromId}::uuid, ${toId}::uuid)
        AND ri.deleted_at IS NULL
    `;

    const fromIngredients = ingredientsResult
      .filter((i) => i.recipe_version_id === fromId)
      .map((i) => ({
        ingredientId: i.ingredient_id,
        name: i.name,
        quantity: Number(i.quantity),
        unit: i.unit,
        preparationNotes: i.preparation_notes,
        isOptional: i.is_optional,
      }));

    const toIngredients = ingredientsResult
      .filter((i) => i.recipe_version_id === toId)
      .map((i) => ({
        ingredientId: i.ingredient_id,
        name: i.name,
        quantity: Number(i.quantity),
        unit: i.unit,
        preparationNotes: i.preparation_notes,
        isOptional: i.is_optional,
      }));

    // Fetch steps for both versions
    const stepsResult = await database.$queryRaw<
      {
        recipe_version_id: string;
        step_number: number;
        instruction: string;
      }[]
    >`
      SELECT
        recipe_version_id,
        step_number,
        instruction
      FROM tenant_kitchen.recipe_steps
      WHERE tenant_id = ${tenantId}::uuid
        AND recipe_version_id IN (${fromId}::uuid, ${toId}::uuid)
        AND deleted_at IS NULL
      ORDER BY step_number
    `;

    const fromSteps = stepsResult
      .filter((s) => s.recipe_version_id === fromId)
      .map((s) => ({
        stepNumber: s.step_number,
        instruction: s.instruction,
      }));

    const toSteps = stepsResult
      .filter((s) => s.recipe_version_id === toId)
      .map((s) => ({
        stepNumber: s.step_number,
        instruction: s.instruction,
      }));

    // Compute base field changes
    const baseChanges: RecipeVersionCompare["changes"]["base"] = {};

    const compareField = (
      key: string,
      fromVal: string | number | string[] | null,
      toVal: string | number | string[] | null
    ) => {
      const fromNorm = fromVal ?? null;
      const toNorm = toVal ?? null;
      if (JSON.stringify(fromNorm) !== JSON.stringify(toNorm)) {
        baseChanges[key] = { from: fromNorm, to: toNorm };
      }
    };

    compareField("name", fromVersion.name, toVersion.name);
    compareField("category", fromVersion.category, toVersion.category);
    compareField(
      "cuisineType",
      fromVersion.cuisine_type,
      toVersion.cuisine_type
    );
    compareField("description", fromVersion.description, toVersion.description);
    compareField("tags", fromVersion.tags, toVersion.tags);
    compareField(
      "yieldQuantity",
      Number(fromVersion.yield_quantity),
      Number(toVersion.yield_quantity)
    );
    compareField(
      "yieldUnit",
      unitMap.get(fromVersion.yield_unit_id) ?? null,
      unitMap.get(toVersion.yield_unit_id) ?? null
    );
    compareField(
      "yieldDescription",
      fromVersion.yield_description,
      toVersion.yield_description
    );
    compareField(
      "prepMinutes",
      fromVersion.prep_time_minutes,
      toVersion.prep_time_minutes
    );
    compareField(
      "cookMinutes",
      fromVersion.cook_time_minutes,
      toVersion.cook_time_minutes
    );
    compareField(
      "restMinutes",
      fromVersion.rest_time_minutes,
      toVersion.rest_time_minutes
    );
    compareField(
      "difficultyLevel",
      fromVersion.difficulty_level,
      toVersion.difficulty_level
    );
    compareField(
      "instructions",
      fromVersion.instructions,
      toVersion.instructions
    );
    compareField("notes", fromVersion.notes, toVersion.notes);

    // Compute ingredient changes
    const fromIngMap = new Map(fromIngredients.map((i) => [i.ingredientId, i]));
    const toIngMap = new Map(toIngredients.map((i) => [i.ingredientId, i]));

    const addedIngredients: IngredientSnapshot[] = [];
    const removedIngredients: IngredientSnapshot[] = [];
    const changedIngredients: RecipeVersionCompare["changes"]["ingredients"]["changed"] =
      [];

    for (const ing of toIngredients) {
      if (fromIngMap.has(ing.ingredientId)) {
        const fromIng = fromIngMap.get(ing.ingredientId)!;
        if (
          fromIng.quantity !== ing.quantity ||
          fromIng.unit !== ing.unit ||
          fromIng.preparationNotes !== ing.preparationNotes ||
          fromIng.isOptional !== ing.isOptional
        ) {
          changedIngredients.push({
            ingredientId: ing.ingredientId,
            name: ing.name,
            from: fromIng,
            to: ing,
          });
        }
      } else {
        addedIngredients.push(ing);
      }
    }

    for (const ing of fromIngredients) {
      if (!toIngMap.has(ing.ingredientId)) {
        removedIngredients.push(ing);
      }
    }

    // Compute step changes
    const fromStepMap = new Map(fromSteps.map((s) => [s.stepNumber, s]));
    const toStepMap = new Map(toSteps.map((s) => [s.stepNumber, s]));

    const addedSteps: StepSnapshot[] = [];
    const removedSteps: StepSnapshot[] = [];
    const changedSteps: RecipeVersionCompare["changes"]["steps"]["changed"] =
      [];

    for (const step of toSteps) {
      if (fromStepMap.has(step.stepNumber)) {
        const fromStep = fromStepMap.get(step.stepNumber)!;
        if (fromStep.instruction !== step.instruction) {
          changedSteps.push({
            stepNumber: step.stepNumber,
            from: fromStep,
            to: step,
          });
        }
      } else {
        addedSteps.push(step);
      }
    }

    for (const step of fromSteps) {
      if (!toStepMap.has(step.stepNumber)) {
        removedSteps.push(step);
      }
    }

    const response: RecipeVersionCompare = {
      from: {
        id: fromVersion.id,
        versionNumber: fromVersion.version_number,
        createdAt: fromVersion.created_at.toISOString(),
      },
      to: {
        id: toVersion.id,
        versionNumber: toVersion.version_number,
        createdAt: toVersion.created_at.toISOString(),
      },
      changes: {
        base: baseChanges,
        ingredients: {
          added: addedIngredients,
          removed: removedIngredients,
          changed: changedIngredients,
        },
        steps: {
          added: addedSteps,
          removed: removedSteps,
          changed: changedSteps,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/kitchen/recipes/versions/compare] Error:", error);
    captureException(error);
    return NextResponse.json(
      { error: "Failed to compare versions" },
      { status: 500 }
    );
  }
}
