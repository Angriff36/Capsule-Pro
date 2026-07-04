"use client";

import type { ConstraintOutcome } from "@repo/design-system/components/constraint-override-dialog";
import {
  ConstraintOverrideDialog,
  useConstraintOverride,
} from "@repo/design-system/components/constraint-override-dialog";
import type { OverrideReasonCode } from "@repo/design-system/components/override-reasons";
import { Button } from "@repo/design-system/components/ui/button";
import { captureException } from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { startTransition, useState, useTransition } from "react";
// NOTE: Keeping apiFetch for composite recipe update-with-version route — no generated client equivalent
import { apiFetch } from "@/app/lib/api";
import { kitchenRecipeCompositeUpdate } from "@/app/lib/routes";
import {
  getRecipeForEdit,
  type RecipeForEdit,
} from "../../actions-manifest-v2";
import {
  RecipeEditModal,
  type RecipeSaveResult,
} from "../../components/recipe-edit-modal";
import { buildUpdatePayload } from "../../components/recipe-update-payload";

interface CompositeRouteResponse {
  constraintOutcomes?: ConstraintOutcome[];
  data?: {
    version: unknown;
    ingredients: unknown[];
    steps: unknown[];
    newVersionNumber: number;
    events: unknown[];
  };
  message?: string;
  success: boolean;
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

    return new Promise<RecipeSaveResult>((resolve) => {
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
            resolve({ ok: true });
          } else if (actionResult.constraintOutcomes?.length) {
            // Constraints blocked - the override dialog takes over via
            // constraintState; keep the modal open without an inline error.
            resolve({ ok: false });
          } else {
            resolve({
              ok: false,
              message: actionResult.message || "Failed to update recipe.",
            });
          }
        } catch (err) {
          captureException(err);
          resolve({
            ok: false,
            message: "Failed to update recipe. Please try again.",
          });
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
