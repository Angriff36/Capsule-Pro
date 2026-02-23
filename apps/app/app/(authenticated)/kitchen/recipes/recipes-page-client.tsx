"use client";

import { captureException } from "@sentry/nextjs";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import {
  kitchenRecipeCompositeCreate,
  kitchenRecipeCompositeUpdate,
} from "@/app/lib/routes";
import { getRecipeForEdit, type RecipeForEdit } from "./actions-manifest-v2";
import { RecipeEditModal } from "./components/recipe-edit-modal";
import { RecipeEditorModal } from "./recipe-editor-modal";

interface CompositeRouteResponse {
  success: boolean;
  message?: string;
  constraintOutcomes?: Array<{ blocked: boolean; message: string }>;
  data?: {
    recipeId?: string;
    version?: unknown;
  };
}

/** Convert difficulty string to numeric level */
const difficultyToLevel = (difficulty: string): number | undefined => {
  const map: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
  return map[difficulty];
};

/** Build JSON payload from RecipeEditorModal FormData for create route */
const buildCreatePayload = (formData: FormData) => {
  const tagsRaw = formData.get("tags") as string;
  let tags: string[] | undefined;
  try {
    const parsed = tagsRaw ? JSON.parse(tagsRaw) : [];
    tags = parsed.length > 0 ? parsed : undefined;
  } catch {
    // Ignore parse errors
  }

  return {
    name: (formData.get("name") as string) || "",
    description: (formData.get("description") as string) || undefined,
    tags,
    yieldQuantity: formData.get("servings")
      ? Number.parseInt(formData.get("servings") as string, 10)
      : undefined,
    prepTimeMinutes: formData.get("prepTime")
      ? Number.parseInt(formData.get("prepTime") as string, 10)
      : undefined,
    cookTimeMinutes: formData.get("cookTime")
      ? Number.parseInt(formData.get("cookTime") as string, 10)
      : undefined,
    difficultyLevel: formData.get("difficulty")
      ? difficultyToLevel(formData.get("difficulty") as string)
      : undefined,
  };
};

/** Build JSON payload from RecipeEditModal FormData for update route */
const buildUpdatePayload = (formData: FormData) => {
  const tagsRaw = formData.get("tags") as string;
  let tags: string[] | undefined;
  try {
    const parsed = tagsRaw ? JSON.parse(tagsRaw) : [];
    tags = parsed.length > 0 ? parsed : undefined;
  } catch {
    // Ignore parse errors
  }

  return {
    name: (formData.get("name") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
    tags,
    yieldQuantity: formData.get("servings")
      ? Number.parseInt(formData.get("servings") as string, 10)
      : undefined,
    prepTimeMinutes: formData.get("prepTime")
      ? Number.parseInt(formData.get("prepTime") as string, 10)
      : undefined,
    cookTimeMinutes: formData.get("cookTime")
      ? Number.parseInt(formData.get("cookTime") as string, 10)
      : undefined,
    difficultyLevel: formData.get("difficulty")
      ? difficultyToLevel(formData.get("difficulty") as string)
      : undefined,
  };
};

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
    const payload = buildCreatePayload(formData);

    try {
      const response = await apiFetch(kitchenRecipeCompositeCreate(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: CompositeRouteResponse = await response.json();

      if (result.success) {
        toast.success("Recipe added successfully");
        if (result.data?.recipeId) {
          router.push(`/kitchen/recipes/${result.data.recipeId}`);
        } else {
          router.refresh();
        }
      } else if (result.constraintOutcomes?.some((c) => c.blocked)) {
        const messages = result.constraintOutcomes
          .filter((c) => c.blocked)
          .map((c) => c.message)
          .join("; ");
        toast.error(`Blocked by constraints: ${messages}`);
        throw new Error(`Blocked by constraints: ${messages}`);
      } else {
        toast.error(result.message || "Failed to create recipe");
        throw new Error(result.message || "Failed to create recipe");
      }
    } catch (error) {
      captureException(error);
      if (error instanceof Error && error.message.includes("constraints")) {
        // Already handled above
      } else {
        toast.error("Failed to save recipe. Please try again.");
      }
      throw error;
    }
  };

  const handleUpdateRecipe = async (formData: FormData) => {
    if (!editRecipeId) {
      return;
    }

    const payload = buildUpdatePayload(formData);

    try {
      const response = await apiFetch(kitchenRecipeCompositeUpdate(editRecipeId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result: CompositeRouteResponse = await response.json();

      if (result.success) {
        toast.success("Recipe updated successfully");
        router.refresh();
      } else if (result.constraintOutcomes?.some((c) => c.blocked)) {
        const messages = result.constraintOutcomes
          .filter((c) => c.blocked)
          .map((c) => c.message)
          .join("; ");
        toast.error(`Blocked by constraints: ${messages}`);
        throw new Error(`Blocked by constraints: ${messages}`);
      } else {
        toast.error(result.message || "Failed to update recipe");
        throw new Error(result.message || "Failed to update recipe");
      }
    } catch (error) {
      captureException(error);
      if (error instanceof Error && error.message.includes("constraints")) {
        // Already handled above
      } else {
        toast.error("Failed to update recipe. Please try again.");
      }
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
