"use client";

import {
  ConstraintOverrideDialog,
  useConstraintOverride,
} from "@repo/design-system/components/constraint-override-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import type { OverrideReasonCode } from "@repo/manifest";
import { useRouter } from "next/navigation";
import { startTransition, useState, useTransition } from "react";
import type { ManifestActionResult } from "../../actions-manifest-v2";
import {
  getRecipeForEdit,
  type RecipeForEdit,
  updateRecipe,
  updateRecipeWithOverride,
} from "../../actions-manifest-v2";
import { RecipeEditModal } from "../../components/recipe-edit-modal";

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
  const [result, setResult] = useState<ManifestActionResult | null>(null);
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
        console.error("Failed to load recipe for edit:", err);
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

    startTransitionAction(async () => {
      try {
        const actionResult = await updateRecipe(recipeId, formData);
        setResult(actionResult);

        if (actionResult.success) {
          setIsEditModalOpen(false);
          setEditRecipeData(null);
          if (actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          } else {
            router.refresh();
          }
        } else if (actionResult.error) {
          setError(actionResult.error);
        }
      } catch (err) {
        console.error("Failed to update recipe:", err);
        setError("Failed to update recipe. Please try again.");
      }
    });
  };

  const handleOverride = async (
    reason: OverrideReasonCode,
    details: string
  ) => {
    if (!cachedFormData) return;

    startTransitionAction(async () => {
      try {
        const actionResult = await updateRecipeWithOverride(
          recipeId,
          cachedFormData,
          reason,
          details
        );
        setResult(actionResult);

        if (actionResult.success) {
          setIsEditModalOpen(false);
          setEditRecipeData(null);
          if (actionResult.redirectUrl) {
            router.push(actionResult.redirectUrl);
          } else {
            router.refresh();
          }
        } else if (actionResult.error) {
          setError(actionResult.error);
        }
      } catch (err) {
        console.error("Failed to update recipe with override:", err);
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

  const constraintState = useConstraintOverride(result ?? {}, {
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
      />
    </div>
  );
};
