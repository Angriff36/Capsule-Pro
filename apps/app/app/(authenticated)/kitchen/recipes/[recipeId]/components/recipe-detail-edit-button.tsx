"use client";

import type { ConstraintOutcome } from "@angriff36/manifest/ir";
import {
  ConstraintOverrideDialog,
  useConstraintOverride,
} from "@repo/design-system/components/constraint-override-dialog";
import type { OverrideReasonCode } from "@repo/design-system/components/override-reasons";
import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { startTransition, useState, useTransition } from "react";
import { apiFetch } from "@/app/lib/api";
import { kitchenRecipeCompositeUpdate } from "@/app/lib/routes";
import {
  getRecipeForEdit,
  type RecipeForEdit,
} from "../../actions-manifest-v2";
import { RecipeEditModal } from "../../components/recipe-edit-modal";

interface CompositeRouteResponse {
  success: boolean;
  message?: string;
  constraintOutcomes?: ConstraintOutcome[];
  data?: {
    version: unknown;
    ingredients: unknown[];
    steps: unknown[];
    newVersionNumber: number;
    events: unknown[];
  };
}

interface ModalIngredient {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  notes?: string;
}

interface ModalStep {
  id?: string;
  instruction: string;
  step_number: number;
}

interface RecipeDetailEditButtonProps {
  recipeId: string;
  recipeName: string;
}

const buildEditRecipePayload = (recipe: RecipeForEdit) => ({
  id: recipe.id,
  name: recipe.name,
  category: recipe.category ?? undefined,
  description: recipe.description ?? undefined,
  tags: recipe.tags,
  ingredients: recipe.ingredients.map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    quantity: ingredient.quantity.toString(),
    unit: ingredient.unit,
  })),
  steps: recipe.steps.map((step) => ({
    id: step.id,
    instruction: step.instruction,
    step_number: step.stepNumber,
  })),
  yieldQuantity: recipe.version.yieldQuantity,
  yieldUnit: recipe.version.yieldUnit,
  yieldDescription: recipe.version.yieldDescription ?? undefined,
  prepTimeMinutes: recipe.version.prepTimeMinutes ?? undefined,
  cookTimeMinutes: recipe.version.cookTimeMinutes ?? undefined,
  restTimeMinutes: recipe.version.restTimeMinutes ?? undefined,
  difficultyLevel: recipe.version.difficultyLevel ?? undefined,
});

/**
 * Converts FormData from RecipeEditModal to JSON payload for composite route.
 */
function buildUpdatePayload(formData: FormData) {
  const ingredientsRaw = formData.get("ingredients") as string;
  const stepsRaw = formData.get("steps") as string;

  let ingredients: ModalIngredient[] = [];
  let steps: ModalStep[] = [];

  try {
    if (ingredientsRaw) {
      ingredients = JSON.parse(ingredientsRaw) as ModalIngredient[];
    }
  } catch {
    // Ignore parse errors
  }

  try {
    if (stepsRaw) {
      steps = JSON.parse(stepsRaw) as ModalStep[];
    }
  } catch {
    // Ignore parse errors
  }

  // Convert ingredients to raw format (name + unit code) for server resolution
  const formattedIngredients = ingredients.map((ing, idx) => ({
    name: ing.name,
    quantity: Number.parseFloat(ing.quantity) || 0,
    unit: ing.unit || null,
    sortOrder: idx,
  }));

  // Convert steps to route format
  const formattedSteps = steps.map((step, idx) => ({
    stepNumber: idx + 1,
    instruction: step.instruction,
  }));

  return {
    name: (formData.get("name") as string) || undefined,
    category: (formData.get("category") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    tags: formData.get("tags")
      ? ((formData.get("tags") as string) || "").split(",").filter(Boolean)
      : undefined,
    yieldQuantity: formData.get("yieldQuantity")
      ? Number.parseInt(formData.get("yieldQuantity") as string, 10)
      : undefined,
    // yieldUnit is a code string - route will need to handle this
    // For now, we skip yieldUnitId as the modal doesn't have the ID
    yieldDescription: (formData.get("yieldDescription") as string) || undefined,
    prepTimeMinutes: formData.get("prepTimeMinutes")
      ? Number.parseInt(formData.get("prepTimeMinutes") as string, 10)
      : undefined,
    cookTimeMinutes: formData.get("cookTimeMinutes")
      ? Number.parseInt(formData.get("cookTimeMinutes") as string, 10)
      : undefined,
    restTimeMinutes: formData.get("restTimeMinutes")
      ? Number.parseInt(formData.get("restTimeMinutes") as string, 10)
      : undefined,
    difficultyLevel: formData.get("difficultyLevel")
      ? Number.parseInt(formData.get("difficultyLevel") as string, 10)
      : undefined,
    ingredients:
      formattedIngredients.length > 0 ? formattedIngredients : undefined,
    steps: formattedSteps.length > 0 ? formattedSteps : undefined,
  };
}

export const RecipeDetailEditButton = ({
  recipeId,
  recipeName,
}: RecipeDetailEditButtonProps) => {
  const router = useRouter();
  const [isPending, startTransitionAction] = useTransition();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRecipeData, setEditRecipeData] = useState<RecipeForEdit | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompositeRouteResponse | null>(null);
  const [cachedFormData, setCachedFormData] = useState<FormData | null>(null);

  const handleEditClick = () => {
    setIsLoading(true);
    setError(null);
    startTransition(async () => {
      try {
        const data = await getRecipeForEdit(recipeId);
        if (!data) {
          setError("Recipe not found.");
          return;
        }
        setEditRecipeData(data);
        setIsEditModalOpen(true);
      } catch (err) {
        captureException(err);
        setError("Failed to load recipe. Please try again.");
      } finally {
        setIsLoading(false);
      }
    });
  };

  const handleUpdateRecipe = (formData: FormData) => {
    setError(null);
    setResult(null);
    setCachedFormData(formData);

    const payload = buildUpdatePayload(formData);

    return new Promise<void>((resolve, reject) => {
      startTransitionAction(async () => {
        try {
          const response = await apiFetch(
            kitchenRecipeCompositeUpdate(recipeId),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );

          const actionResult: CompositeRouteResponse = await response.json();
          setResult(actionResult);

          if (actionResult.success) {
            setIsEditModalOpen(false);
            setEditRecipeData(null);
            router.refresh();
            resolve();
          } else if (actionResult.constraintOutcomes?.length) {
            // Constraints blocked - dialog will be shown via constraintState
            // Don't reject, let the override dialog handle it
          } else if (actionResult.message) {
            setError(actionResult.message);
            reject(new Error(actionResult.message));
          } else {
            setError("Failed to update recipe.");
            reject(new Error("Failed to update recipe."));
          }
        } catch (err) {
          captureException(err);
          setError("Failed to update recipe. Please try again.");
          reject(err);
        }
      });
    });
  };

  const handleOverride = (reason: OverrideReasonCode, details: string) => {
    if (!cachedFormData) {
      return;
    }

    const payload = {
      ...buildUpdatePayload(cachedFormData),
      override: {
        reasonCode: reason,
        details,
      },
    };

    startTransitionAction(async () => {
      try {
        const response = await apiFetch(
          kitchenRecipeCompositeUpdate(recipeId),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const actionResult: CompositeRouteResponse = await response.json();
        setResult(actionResult);

        if (actionResult.success) {
          setIsEditModalOpen(false);
          setEditRecipeData(null);
          router.refresh();
        } else if (actionResult.message) {
          setError(actionResult.message);
        }
      } catch (err) {
        captureException(err);
        setError("Failed to update recipe. Please try again.");
      }
    });
  };

  const handleEditModalClose = (open: boolean) => {
    setIsEditModalOpen(open);
    if (!open) {
      setEditRecipeData(null);
      setError(null);
      setResult(null);
    }
  };

  const constraintState = useConstraintOverride({
    result: result ?? {},
    onOverride: handleOverride,
  });

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        aria-label={`Edit ${recipeName}`}
        disabled={isLoading || isPending}
        onClick={handleEditClick}
        type="button"
      >
        {isLoading || isPending ? "Loading..." : "Edit Recipe"}
      </Button>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {editRecipeData && (
        <RecipeEditModal
          key={`${editRecipeData.id}-${isEditModalOpen ? "open" : "closed"}`}
          onOpenChange={handleEditModalClose}
          onSave={handleUpdateRecipe}
          open={isEditModalOpen}
          recipe={buildEditRecipePayload(editRecipeData)}
        />
      )}

      <ConstraintOverrideDialog
        actionDescription="update this recipe"
        constraints={constraintState.overrideConstraints}
        onConfirm={constraintState.handleOverride}
        onOpenChange={constraintState.setShowOverrideDialog}
        open={constraintState.showOverrideDialog}
        warningsOnly={constraintState.warningsOnly}
      />
    </div>
  );
};
