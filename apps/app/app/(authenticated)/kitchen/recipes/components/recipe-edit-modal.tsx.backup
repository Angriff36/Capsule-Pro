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

type Ingredient = {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  notes?: string;
};

type RecipeEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: {
    id?: string;
    name?: string;
    category?: string;
    description?: string;
    tags?: string[];
    ingredients?: Ingredient[];
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

/** Tag chip component for displaying removable tags */
function TagChip({
  tag,
  onRemove,
}: {
  tag: string;
  onRemove: (tag: string) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground text-sm">
      {tag}
      <button
        className="hover:text-destructive"
        onClick={() => onRemove(tag)}
        type="button"
      >
        &times;
      </button>
    </span>
  );
}

/** Ingredient row component for displaying and editing a single ingredient */
function IngredientRow({
  ingredient,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  ingredient: Ingredient;
  index: number;
  onUpdate: (index: number, field: keyof Ingredient, value: string) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  return (
    <div className="flex items-start gap-2 p-3 border rounded-md">
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onMoveDown(index)}
        >
          ↓
        </Button>
      </div>
      <div className="flex-1 grid grid-cols-12 gap-2">
        <Input
          className="col-span-3"
          placeholder="Qty"
          value={ingredient.quantity}
          onChange={(e) => onUpdate(index, "quantity", e.target.value)}
        />
        <Input
          className="col-span-3"
          placeholder="Unit"
          value={ingredient.unit}
          onChange={(e) => onUpdate(index, "unit", e.target.value)}
        />
        <Input
          className="col-span-5"
          placeholder="Ingredient name"
          value={ingredient.name}
          onChange={(e) => onUpdate(index, "name", e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="col-span-1 h-9 w-9 text-destructive hover:text-destructive"
          onClick={() => onRemove(index)}
          title="Remove ingredient"
        >
          ×
        </Button>
      </div>
    </div>
  );
}

/** Reusable time input field */
function TimeInput({
  id,
  label,
  defaultValue,
  placeholder,
}: {
  id: string;
  label: string;
  defaultValue?: number;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        defaultValue={defaultValue ?? ""}
        id={id}
        min="0"
        name={id}
        placeholder={placeholder}
        type="number"
      />
    </div>
  );
}

export const RecipeEditModal = ({
  open,
  onOpenChange,
  recipe,
  onSave,
}: RecipeEditModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients ?? []
  );

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

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: "", quantity: "", unit: "" },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleUpdateIngredient = (
    index: number,
    field: keyof Ingredient,
    value: string
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleMoveIngredient = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (
      newIndex < 0 ||
      newIndex >= ingredients.length ||
      (direction === "up" && index === 0)
    ) {
      return;
    }
    const updated = [...ingredients];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setIngredients(updated);
  };

  const handleSubmit = async (formData: FormData) => {
    if (!onSave) {
      return;
    }
    setIsSubmitting(true);
    try {
      formData.set("tags", tags.join(","));
      formData.set("ingredients", JSON.stringify(ingredients));
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = Boolean(recipe?.id);
  const modalTitle = isEditMode ? "Edit Recipe" : "New Recipe";
  const modalDescription = isEditMode
    ? "Update recipe details below. Changes create a new version."
    : "Fill in the recipe details to create a new recipe.";

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="right">
        <SheetHeader>
          <SheetTitle>{modalTitle}</SheetTitle>
          <SheetDescription>{modalDescription}</SheetDescription>
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
                  <TagChip key={tag} onRemove={handleRemoveTag} tag={tag} />
                ))}
              </div>
            )}
          </div>

          {/* Ingredients section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-base">Ingredients</Label>
              <Button
                onClick={handleAddIngredient}
                type="button"
                variant="outline"
                size="sm"
              >
                Add Ingredient
              </Button>
            </div>
            {ingredients.length > 0 && (
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <IngredientRow
                    key={index}
                    ingredient={ingredient}
                    index={index}
                    onUpdate={handleUpdateIngredient}
                    onRemove={handleRemoveIngredient}
                    onMoveUp={(index) => handleMoveIngredient(index, "up")}
                    onMoveDown={(index) => handleMoveIngredient(index, "down")}
                  />
                ))}
              </div>
            )}
            {ingredients.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No ingredients added yet. Click "Add Ingredient" to get started.
              </p>
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
              <TimeInput
                defaultValue={recipe?.prepTimeMinutes}
                id="prepTimeMinutes"
                label="Prep"
                placeholder="15"
              />
              <TimeInput
                defaultValue={recipe?.cookTimeMinutes}
                id="cookTimeMinutes"
                label="Cook"
                placeholder="30"
              />
              <TimeInput
                defaultValue={recipe?.restTimeMinutes}
                id="restTimeMinutes"
                label="Rest"
                placeholder="10"
              />
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
