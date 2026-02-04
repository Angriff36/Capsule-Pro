"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useState } from "react";
import {
  getRecipeForEdit,
  type RecipeForEdit,
  updateRecipe,
} from "../../actions";
import { RecipeEditModal } from "../../components/recipe-edit-modal";

type RecipeDetailEditButtonProps = {
  recipeId: string;
  recipeName: string;
};

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRecipeData, setEditRecipeData] = useState<RecipeForEdit | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleEditClick = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await getRecipeForEdit(recipeId);
      if (!data) {
        setErrorMessage("Recipe not found.");
        return;
      }
      setEditRecipeData(data);
      setIsEditModalOpen(true);
    } catch (error) {
      console.error("Failed to load recipe for edit:", error);
      setErrorMessage("Failed to load recipe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRecipe = async (formData: FormData) => {
    setErrorMessage(null);
    try {
      await updateRecipe(recipeId, formData);
      setIsEditModalOpen(false);
      setEditRecipeData(null);
      window.location.reload();
    } catch (error) {
      console.error("Failed to update recipe:", error);
      setErrorMessage("Failed to update recipe. Please try again.");
      throw error;
    }
  };

  const handleEditModalClose = (open: boolean) => {
    setIsEditModalOpen(open);
    if (!open) {
      setEditRecipeData(null);
      setErrorMessage(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        aria-label={`Edit ${recipeName}`}
        disabled={isLoading}
        onClick={handleEditClick}
        type="button"
      >
        {isLoading ? "Loading..." : "Edit Recipe"}
      </Button>

      {errorMessage && (
        <p className="text-destructive text-sm">{errorMessage}</p>
      )}

      {editRecipeData && (
        <RecipeEditModal
          key={`${editRecipeData.id}-${isEditModalOpen ? "open" : "closed"}`}
          onOpenChange={handleEditModalClose}
          onSave={handleUpdateRecipe}
          open={isEditModalOpen}
          recipe={buildEditRecipePayload(editRecipeData)}
        />
      )}
    </div>
  );
};
