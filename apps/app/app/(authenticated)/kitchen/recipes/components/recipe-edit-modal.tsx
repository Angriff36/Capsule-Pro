"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@repo/design-system/components/ui/sheet";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useState } from "react";

type RecipeEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: {
    id?: string;
    name?: string;
    category?: string;
    description?: string;
    tags?: string[];
    yieldQuantity?: number;
    yieldUnit?: string;
    yieldDescription?: string;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    restTimeMinutes?: number;
    difficultyLevel?: number;
  };
  onSave?: (data: FormData) => Promise<void>;
};

const difficultyLevels = [
  { value: "1", label: "Very Easy" },
  { value: "2", label: "Easy" },
  { value: "3", label: "Medium" },
  { value: "4", label: "Hard" },
  { value: "5", label: "Expert" },
] as const;

const categoryOptions = [
  "Appetizer",
  "Main Course",
  "Side Dish",
  "Dessert",
  "Beverage",
  "Sauce",
  "Base",
  "Other",
] as const;

export const RecipeEditModal = ({
  open,
  onOpenChange,
  recipe,
  onSave,
}: RecipeEditModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (formData: FormData) => {
    if (!onSave) return;
    setIsSubmitting(true);
    try {
      formData.set("tags", tags.join(","));
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{recipe?.id ? "Edit Recipe" : "New Recipe"}</SheetTitle>
          <SheetDescription>
            {recipe?.id
              ? "Update recipe details below. Changes create a new version."
              : "Fill in the recipe details to create a new recipe."}
          </SheetDescription>
        </SheetHeader>

        <form action={handleSubmit} className="flex flex-1 flex-col gap-6 p-4">
          {recipe?.id && (
            <input name="recipeId" type="hidden" value={recipe.id} />
          )}

          {/* Name field */}
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

          {/* Category field */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select defaultValue={recipe?.category ?? ""} name="category">
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description field */}
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

          {/* Tags field */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                id="tags"
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type and press Enter to add"
                value={tagInput}
              />
              <Button onClick={handleAddTag} type="button" variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag) => (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground text-sm"
                    key={tag}
                  >
                    {tag}
                    <button
                      className="hover:text-destructive"
                      onClick={() => handleRemoveTag(tag)}
                      type="button"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Yield section */}
          <div className="space-y-4">
            <Label className="font-medium text-base">Yield</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yieldQuantity">Quantity</Label>
                <Input
                  defaultValue={recipe?.yieldQuantity ?? ""}
                  id="yieldQuantity"
                  min="1"
                  name="yieldQuantity"
                  placeholder="e.g., 4"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yieldUnit">Unit</Label>
                <Input
                  defaultValue={recipe?.yieldUnit ?? ""}
                  id="yieldUnit"
                  name="yieldUnit"
                  placeholder="e.g., servings"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yieldDescription">Yield Description</Label>
              <Input
                defaultValue={recipe?.yieldDescription ?? ""}
                id="yieldDescription"
                name="yieldDescription"
                placeholder="e.g., 4 large portions"
              />
            </div>
          </div>

          {/* Times section */}
          <div className="space-y-4">
            <Label className="font-medium text-base">Times (minutes)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prepTimeMinutes">Prep</Label>
                <Input
                  defaultValue={recipe?.prepTimeMinutes ?? ""}
                  id="prepTimeMinutes"
                  min="0"
                  name="prepTimeMinutes"
                  placeholder="15"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cookTimeMinutes">Cook</Label>
                <Input
                  defaultValue={recipe?.cookTimeMinutes ?? ""}
                  id="cookTimeMinutes"
                  min="0"
                  name="cookTimeMinutes"
                  placeholder="30"
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restTimeMinutes">Rest</Label>
                <Input
                  defaultValue={recipe?.restTimeMinutes ?? ""}
                  id="restTimeMinutes"
                  min="0"
                  name="restTimeMinutes"
                  placeholder="10"
                  type="number"
                />
              </div>
            </div>
          </div>

          {/* Difficulty field */}
          <div className="space-y-2">
            <Label htmlFor="difficultyLevel">Difficulty</Label>
            <Select
              defaultValue={recipe?.difficultyLevel?.toString() ?? "3"}
              name="difficultyLevel"
            >
              <SelectTrigger id="difficultyLevel">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficultyLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <SheetFooter className="mt-auto pt-4">
            <Button
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Save Recipe"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
