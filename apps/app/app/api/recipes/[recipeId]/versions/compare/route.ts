import { auth } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError, invariant } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "../../../../../lib/tenant";
import { getRecipeVersionSnapshot } from "../utils";

type BaseDiff = {
  name?: { from: string; to: string };
  category?: { from: string | null; to: string | null };
  cuisineType?: { from: string | null; to: string | null };
  description?: { from: string | null; to: string | null };
  tags?: { from: string[]; to: string[] };
  yieldQuantity?: { from: number; to: number };
  yieldUnit?: { from: string | null; to: string | null };
  yieldDescription?: { from: string | null; to: string | null };
  prepTimeMinutes?: { from: number | null; to: number | null };
  cookTimeMinutes?: { from: number | null; to: number | null };
  restTimeMinutes?: { from: number | null; to: number | null };
  difficultyLevel?: { from: number | null; to: number | null };
  instructions?: { from: string | null; to: string | null };
  notes?: { from: string | null; to: string | null };
};

type IngredientSnapshot = {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
};

type StepSnapshot = {
  stepNumber: number;
  instruction: string;
  durationMinutes: number | null;
  temperatureValue: number | null;
  temperatureUnit: string | null;
  equipmentNeeded: string[] | null;
  tips: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
};

const normalizeTags = (tags: string[]) => [...tags].sort();

const stringArrayEqual = (left: string[] | null, right: string[] | null) => {
  const leftValues = left ? [...left].sort() : [];
  const rightValues = right ? [...right].sort() : [];
  if (leftValues.length !== rightValues.length) {
    return false;
  }
  return leftValues.every((value, index) => value === rightValues[index]);
};

const ingredientEqual = (left: IngredientSnapshot, right: IngredientSnapshot) =>
  left.quantity === right.quantity &&
  left.unit === right.unit &&
  left.isOptional === right.isOptional &&
  left.preparationNotes === right.preparationNotes;

const stepEqual = (left: StepSnapshot, right: StepSnapshot) =>
  left.instruction === right.instruction &&
  left.durationMinutes === right.durationMinutes &&
  left.temperatureValue === right.temperatureValue &&
  left.temperatureUnit === right.temperatureUnit &&
  stringArrayEqual(left.equipmentNeeded, right.equipmentNeeded) &&
  left.tips === right.tips &&
  left.videoUrl === right.videoUrl &&
  left.imageUrl === right.imageUrl;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  try {
    const { recipeId } = await params;
    invariant(recipeId, "params.recipeId must exist");

    const fromId = request.nextUrl.searchParams.get("from");
    const toId = request.nextUrl.searchParams.get("to");
    invariant(fromId, "query.from must exist");
    invariant(toId, "query.to must exist");

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const [fromVersion, toVersion] = await Promise.all([
      getRecipeVersionSnapshot(tenantId, recipeId, fromId),
      getRecipeVersionSnapshot(tenantId, recipeId, toId),
    ]);

    if (!(fromVersion && toVersion)) {
      return NextResponse.json(
        { error: "Recipe version not found" },
        { status: 404 }
      );
    }

    const baseDiff: BaseDiff = {};
    if (fromVersion.name !== toVersion.name) {
      baseDiff.name = { from: fromVersion.name, to: toVersion.name };
    }
    if (fromVersion.category !== toVersion.category) {
      baseDiff.category = {
        from: fromVersion.category,
        to: toVersion.category,
      };
    }
    if (fromVersion.cuisineType !== toVersion.cuisineType) {
      baseDiff.cuisineType = {
        from: fromVersion.cuisineType,
        to: toVersion.cuisineType,
      };
    }
    if (fromVersion.description !== toVersion.description) {
      baseDiff.description = {
        from: fromVersion.description,
        to: toVersion.description,
      };
    }
    if (!stringArrayEqual(fromVersion.tags, toVersion.tags)) {
      baseDiff.tags = {
        from: normalizeTags(fromVersion.tags),
        to: normalizeTags(toVersion.tags),
      };
    }
    if (fromVersion.yield.quantity !== toVersion.yield.quantity) {
      baseDiff.yieldQuantity = {
        from: fromVersion.yield.quantity,
        to: toVersion.yield.quantity,
      };
    }
    if (fromVersion.yield.unit !== toVersion.yield.unit) {
      baseDiff.yieldUnit = {
        from: fromVersion.yield.unit,
        to: toVersion.yield.unit,
      };
    }
    if (fromVersion.yield.description !== toVersion.yield.description) {
      baseDiff.yieldDescription = {
        from: fromVersion.yield.description,
        to: toVersion.yield.description,
      };
    }
    if (fromVersion.times.prepMinutes !== toVersion.times.prepMinutes) {
      baseDiff.prepTimeMinutes = {
        from: fromVersion.times.prepMinutes,
        to: toVersion.times.prepMinutes,
      };
    }
    if (fromVersion.times.cookMinutes !== toVersion.times.cookMinutes) {
      baseDiff.cookTimeMinutes = {
        from: fromVersion.times.cookMinutes,
        to: toVersion.times.cookMinutes,
      };
    }
    if (fromVersion.times.restMinutes !== toVersion.times.restMinutes) {
      baseDiff.restTimeMinutes = {
        from: fromVersion.times.restMinutes,
        to: toVersion.times.restMinutes,
      };
    }
    if (fromVersion.difficultyLevel !== toVersion.difficultyLevel) {
      baseDiff.difficultyLevel = {
        from: fromVersion.difficultyLevel,
        to: toVersion.difficultyLevel,
      };
    }
    if (fromVersion.instructions !== toVersion.instructions) {
      baseDiff.instructions = {
        from: fromVersion.instructions,
        to: toVersion.instructions,
      };
    }
    if (fromVersion.notes !== toVersion.notes) {
      baseDiff.notes = { from: fromVersion.notes, to: toVersion.notes };
    }

    const fromIngredientMap = new Map(
      fromVersion.ingredients.map((ingredient) => [
        ingredient.ingredientId,
        {
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          preparationNotes: ingredient.preparationNotes,
          isOptional: ingredient.isOptional,
        } satisfies IngredientSnapshot,
      ])
    );
    const toIngredientMap = new Map(
      toVersion.ingredients.map((ingredient) => [
        ingredient.ingredientId,
        {
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          preparationNotes: ingredient.preparationNotes,
          isOptional: ingredient.isOptional,
        } satisfies IngredientSnapshot,
      ])
    );

    const ingredientAdded: IngredientSnapshot[] = [];
    const ingredientRemoved: IngredientSnapshot[] = [];
    const ingredientChanged: {
      ingredientId: string;
      name: string;
      from: IngredientSnapshot;
      to: IngredientSnapshot;
    }[] = [];

    for (const [ingredientId, toIngredient] of toIngredientMap.entries()) {
      const fromIngredient = fromIngredientMap.get(ingredientId);
      if (!fromIngredient) {
        ingredientAdded.push(toIngredient);
        continue;
      }
      if (!ingredientEqual(fromIngredient, toIngredient)) {
        ingredientChanged.push({
          ingredientId,
          name: toIngredient.name || fromIngredient.name,
          from: fromIngredient,
          to: toIngredient,
        });
      }
    }

    for (const [ingredientId, fromIngredient] of fromIngredientMap.entries()) {
      if (!toIngredientMap.has(ingredientId)) {
        ingredientRemoved.push(fromIngredient);
      }
    }

    const fromStepMap = new Map(
      fromVersion.steps.map((step) => [
        step.stepNumber,
        {
          stepNumber: step.stepNumber,
          instruction: step.instruction,
          durationMinutes: step.durationMinutes,
          temperatureValue: step.temperatureValue,
          temperatureUnit: step.temperatureUnit,
          equipmentNeeded: step.equipmentNeeded,
          tips: step.tips,
          videoUrl: step.videoUrl,
          imageUrl: step.imageUrl,
        } satisfies StepSnapshot,
      ])
    );
    const toStepMap = new Map(
      toVersion.steps.map((step) => [
        step.stepNumber,
        {
          stepNumber: step.stepNumber,
          instruction: step.instruction,
          durationMinutes: step.durationMinutes,
          temperatureValue: step.temperatureValue,
          temperatureUnit: step.temperatureUnit,
          equipmentNeeded: step.equipmentNeeded,
          tips: step.tips,
          videoUrl: step.videoUrl,
          imageUrl: step.imageUrl,
        } satisfies StepSnapshot,
      ])
    );

    const stepAdded: StepSnapshot[] = [];
    const stepRemoved: StepSnapshot[] = [];
    const stepChanged: {
      stepNumber: number;
      from: StepSnapshot;
      to: StepSnapshot;
    }[] = [];

    for (const [stepNumber, toStep] of toStepMap.entries()) {
      const fromStep = fromStepMap.get(stepNumber);
      if (!fromStep) {
        stepAdded.push(toStep);
        continue;
      }
      if (!stepEqual(fromStep, toStep)) {
        stepChanged.push({ stepNumber, from: fromStep, to: toStep });
      }
    }

    for (const [stepNumber, fromStep] of fromStepMap.entries()) {
      if (!toStepMap.has(stepNumber)) {
        stepRemoved.push(fromStep);
      }
    }

    return NextResponse.json({
      from: {
        id: fromVersion.id,
        versionNumber: fromVersion.versionNumber,
        createdAt: fromVersion.createdAt,
      },
      to: {
        id: toVersion.id,
        versionNumber: toVersion.versionNumber,
        createdAt: toVersion.createdAt,
      },
      changes: {
        base: baseDiff,
        ingredients: {
          added: ingredientAdded,
          removed: ingredientRemoved,
          changed: ingredientChanged,
        },
        steps: {
          added: stepAdded,
          removed: stepRemoved,
          changed: stepChanged,
        },
      },
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to compare recipe versions:", error);
    return NextResponse.json(
      { error: "Failed to compare recipe versions" },
      { status: 500 }
    );
  }
}
