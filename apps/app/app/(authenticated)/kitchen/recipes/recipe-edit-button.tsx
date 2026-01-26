"use client";

import { Button } from "@repo/design-system/components/ui/button";

type RecipeEditButtonProps = {
  recipeId: string;
  recipeName: string;
};

export const RecipeEditButton = ({
  recipeId,
  recipeName,
}: RecipeEditButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent("edit-recipe", { detail: { recipeId } })
    );
  };

  return (
    <Button
      aria-label={`Edit ${recipeName}`}
      className="text-white"
      onClick={handleClick}
      size="sm"
      type="button"
      variant="secondary"
    >
      Edit
    </Button>
  );
};
