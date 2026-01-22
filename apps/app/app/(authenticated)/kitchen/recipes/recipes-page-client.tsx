"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { createRecipe } from "./actions";
import { RecipeEditorModal } from "./recipe-editor-modal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const RecipesPageClient = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleSaveRecipe = async (formData: FormData) => {
    try {
      await createRecipe(formData);
      toast.success("Recipe added successfully");
    } catch (error) {
      console.error("Failed to save recipe:", error);
      toast.error("Failed to save recipe. Please try again.");
      throw error;
    }
  };

  return (
    <>
      <RecipeEditorModal
        onSave={handleSaveRecipe}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 transition-transform"
        type="button"
      >
        <PlusIcon className="size-6" />
      </button>
    </>
  );
};
