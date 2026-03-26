"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { PencilIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { renameRecipe } from "./actions";

interface RecipeQuickRenameProps {
  recipeId: string;
  recipeName: string;
}

export function RecipeQuickRename({
  recipeId,
  recipeName,
}: RecipeQuickRenameProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(recipeName);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Recipe name cannot be empty.");
      return;
    }
    if (trimmedName === recipeName) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      try {
        await renameRecipe(recipeId, trimmedName);
        toast.success("Recipe renamed.");
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to rename.");
      }
    });
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label="Rename recipe"
          className="size-8"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="text-sm font-medium">Rename Recipe</div>
          <Input
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="Recipe name"
            value={name}
          />
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setOpen(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={handleSave}
              size="sm"
              type="button"
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
