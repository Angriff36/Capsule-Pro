"use client";

import { captureException } from "@sentry/nextjs";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createRecipe,
  getRecipeForEdit,
  type RecipeForEdit,
  updateRecipe,
} from "./actions-manifest";
import { RecipeEditModal } from "./components/recipe-edit-modal";
import { RecipeEditorModal } from "./recipe-editor-modal";

export const RecipesPageClient = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);
  const [editRecipeData, setEditRecipeData] = useState<RecipeForEdit | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [_isPending, startTransition] = useTransition();
  const router = useRouter();

  // Listen for edit events from recipe cards
  useEffect(() => {
    const handleEditRecipe = (event: CustomEvent<{ recipeId: string }>) => {
      setEditRecipeId(event.detail.recipeId);
    };

    window.addEventListener(
      "edit-recipe" as keyof WindowEventMap,
      handleEditRecipe as EventListener
    );
    return () => {
      window.removeEventListener(
        "edit-recipe" as keyof WindowEventMap,
        handleEditRecipe as EventListener
      );
    };
  }, []);

  // Fetch recipe data when editRecipeId changes
  useEffect(() => {
    if (editRecipeId) {
      startTransition(async () => {
        const data = await getRecipeForEdit(editRecipeId);
        if (data) {
          setEditRecipeData(data);
          setIsEditModalOpen(true);
        } else {
          toast.error("Recipe not found");
          setEditRecipeId(null);
        }
      });
    }
  }, [editRecipeId]);

  const handleSaveNewRecipe = async (formData: FormData) => {
    try {
      await createRecipe(formData);
      toast.success("Recipe added successfully");
    } catch (error) {
      captureException(error);
      toast.error("Failed to save recipe. Please try again.");
      throw error;
    }
  };

  const handleUpdateRecipe = async (formData: FormData) => {
    if (!editRecipeId) {
      return;
    }
    try {
      await updateRecipe(editRecipeId, formData);
      toast.success("Recipe updated successfully");
      router.refresh();
    } catch (error) {
      captureException(error);
      toast.error("Failed to update recipe. Please try again.");
      throw error;
    }
  };

  const handleEditModalClose = (open: boolean) => {
    setIsEditModalOpen(open);
    if (!open) {
      setEditRecipeId(null);
      setEditRecipeData(null);
    }
  };

  return (
    <>
      {/* Create recipe modal */}
      <RecipeEditorModal
        onOpenChange={setIsCreateModalOpen}
        onSave={handleSaveNewRecipe}
        open={isCreateModalOpen}
      />

      {/* Edit recipe modal */}
      <RecipeEditModal
        key={`${editRecipeData?.id ?? "new"}-${isEditModalOpen ? "open" : "closed"}`}
        onOpenChange={handleEditModalClose}
        onSave={handleUpdateRecipe}
        open={isEditModalOpen}
        recipe={
          editRecipeData
            ? {
                id: editRecipeData.id,
                name: editRecipeData.name,
                category: editRecipeData.category ?? undefined,
                description: editRecipeData.description ?? undefined,
                tags: editRecipeData.tags,
                ingredients: editRecipeData.ingredients.map((ingredient) => ({
                  id: ingredient.id,
                  name: ingredient.name,
                  quantity: ingredient.quantity.toString(),
                  unit: ingredient.unit,
                })),
                steps: editRecipeData.steps.map((step) => ({
                  id: step.id,
                  instruction: step.instruction,
                  step_number: step.stepNumber,
                })),
                yieldQuantity: editRecipeData.version.yieldQuantity,
                yieldUnit: editRecipeData.version.yieldUnit,
                yieldDescription:
                  editRecipeData.version.yieldDescription ?? undefined,
                prepTimeMinutes:
                  editRecipeData.version.prepTimeMinutes ?? undefined,
                cookTimeMinutes:
                  editRecipeData.version.cookTimeMinutes ?? undefined,
                restTimeMinutes:
                  editRecipeData.version.restTimeMinutes ?? undefined,
                difficultyLevel:
                  editRecipeData.version.difficultyLevel ?? undefined,
              }
            : undefined
        }
      />

      {/* FAB for creating new recipe */}
      <button
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
        onClick={() => setIsCreateModalOpen(true)}
        type="button"
      >
        <PlusIcon className="size-6" />
      </button>
    </>
  );
};
