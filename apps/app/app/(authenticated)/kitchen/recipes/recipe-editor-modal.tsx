"use client";

import { useState } from "react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Badge } from "@repo/design-system/components/ui/badge";
import { XIcon, PlusIcon } from "lucide-react";

type Ingredient = {
  id: string;
  quantity: string;
  unit: string;
  name: string;
  optional: boolean;
};

type Instruction = {
  id: string;
  stepNumber: number;
  text: string;
};

type RecipeEditorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: {
    id?: string;
    name?: string;
    description?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    difficulty?: string;
    tags?: string[];
    ingredients?: Ingredient[];
    instructions?: Instruction[];
  };
  onSave: (data: FormData) => Promise<void>;
};

const difficultyLevels = ["Easy", "Medium", "Hard"] as const;

export const RecipeEditorModal = ({
  open,
  onOpenChange,
  recipe,
  onSave,
}: RecipeEditorModalProps) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients ?? []
  );
  const [instructions, setInstructions] = useState<Instruction[]>(
    recipe?.instructions ?? []
  );
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: Math.random().toString(),
        quantity: "",
        unit: "",
        name: "",
        optional: false,
      },
    ]);
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    );
  };

  const addInstruction = () => {
    setInstructions([
      ...instructions,
      {
        id: Math.random().toString(),
        stepNumber: instructions.length + 1,
        text: "",
      },
    ]);
  };

  const removeInstruction = (id: string) => {
    setInstructions(instructions.filter((inst) => inst.id !== id));
  };

  const updateInstruction = (id: string, text: string) => {
    setInstructions(
      instructions.map((inst) => (inst.id === id ? { ...inst, text } : inst))
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>
            {recipe?.id ? "Edit Recipe" : "Add Recipe"}
          </DialogTitle>
          <DialogDescription>
            Fill in the recipe details below. Required fields are marked with
            an asterisk.
          </DialogDescription>
        </DialogHeader>

        <form
          action={async (formData) => {
            await onSave(formData);
            onOpenChange(false);
          }}
          className="flex flex-col gap-6"
        >
          {recipe?.id && (
            <input name="recipeId" type="hidden" value={recipe.id} />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Recipe Name <span className="text-destructive">*</span>
              </Label>
              <Input
                defaultValue={recipe?.name ?? ""}
                id="name"
                name="name"
                placeholder="e.g., Classic Caesar Salad"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select defaultValue={recipe?.difficulty ?? "Medium"} name="difficulty">
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prepTime">Prep Time (minutes)</Label>
              <Input
                defaultValue={recipe?.prepTime ?? ""}
                id="prepTime"
                min="0"
                name="prepTime"
                type="number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                defaultValue={recipe?.servings ?? ""}
                id="servings"
                min="1"
                name="servings"
                type="number"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cookTime">Cook Time (minutes)</Label>
              <Input
                defaultValue={recipe?.cookTime ?? ""}
                id="cookTime"
                min="0"
                name="cookTime"
                type="number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              defaultValue={recipe?.description ?? ""}
              id="description"
              name="description"
              placeholder="Brief description of the recipe"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ingredients</Label>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  addIngredient();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <PlusIcon className="mr-2 size-4" />
                Add Ingredient
              </Button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="grid gap-2 md:grid-cols-4">
                  <Input
                    placeholder="Quantity"
                    value={ingredient.quantity}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "quantity", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Unit"
                    value={ingredient.unit}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "unit", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "name", e.target.value)
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => removeIngredient(ingredient.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {ingredients.length === 0 && (
                <p className="text-center text-muted-foreground text-sm">
                  No ingredients yet. Click "Add Ingredient" to start.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Instructions</Label>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  addInstruction();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <PlusIcon className="mr-2 size-4" />
                Add Step
              </Button>
            </div>
            <div className="space-y-2">
              {instructions.map((instruction) => (
                <div key={instruction.id} className="flex gap-2">
                  <div className="flex min-w-[40px] items-center justify-center rounded bg-muted font-semibold">
                    {instruction.stepNumber}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Textarea
                      placeholder="Describe this step..."
                      value={instruction.text}
                      onChange={(e) =>
                        updateInstruction(instruction.id, e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                  <Button
                    onClick={() => removeInstruction(instruction.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              ))}
              {instructions.length === 0 && (
                <p className="text-center text-muted-foreground text-sm">
                  No instructions yet. Click "Add Step" to start.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                id="tags"
                placeholder="Type and press Enter to add tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  addTag();
                }}
                type="button"
                variant="outline"
              >
                <PlusIcon className="size-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="cursor-pointer"
                    variant="secondary"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <XIcon className="ml-1 inline size-3" />
                  </Badge>
                ))}
              </div>
            )}
            <input
              name="tags"
              type="hidden"
              value={JSON.stringify(tags)}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
