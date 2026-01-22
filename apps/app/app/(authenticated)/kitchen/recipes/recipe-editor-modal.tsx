"use client";

import { AspectRatio } from "@repo/design-system/components/ui/aspect-ratio";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ImagePlusIcon, PlusIcon, UploadIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

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

type RecipeImage = {
  id: string;
  file: File;
  url: string;
  isMain: boolean;
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
  const [images, setImages] = useState<RecipeImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const updateIngredient = (
    id: string,
    field: keyof Ingredient,
    value: string
  ) => {
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }

    const newImages: RecipeImage[] = files.map((file) => ({
      id: Math.random().toString(),
      file,
      url: URL.createObjectURL(file),
      isMain: images.length === 0,
    }));

    setImages([...images, ...newImages]);
  };

  const handleRemoveImage = (id: string) => {
    const removed = images.find((img) => img.id === id);
    if (removed) {
      URL.revokeObjectURL(removed.url);
    }
    const newImages = images.filter((img) => img.id !== id);
    if (removed?.isMain && newImages.length > 0) {
      newImages[0].isMain = true;
    }
    setImages(newImages);
  };

  const handleSetMainImage = (id: string) => {
    setImages(images.map((img) => ({ ...img, isMain: img.id === id })));
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{recipe?.id ? "Edit Recipe" : "Add Recipe"}</DialogTitle>
          <DialogDescription>
            Fill in the recipe details below. Required fields are marked with an
            asterisk.
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
              <Select
                defaultValue={recipe?.difficulty ?? "Medium"}
                name="difficulty"
              >
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
            <Label>Images</Label>
            <div className="rounded-lg border-2 border-dashed p-4 text-center">
              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={handleImageUpload}
                ref={fileInputRef}
                type="file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <UploadIcon className="mr-2 size-4" />
                Upload Images
              </Button>
              <p className="text-muted-foreground mt-2 text-sm">
                Drag and drop or click to upload
              </p>
            </div>
            {images.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {images.map((image) => (
                  <div className="relative group" key={image.id}>
                    <AspectRatio ratio={16 / 9}>
                      <Image
                        alt="Recipe"
                        className="h-full w-full rounded-lg object-cover"
                        fill
                        src={image.url}
                      />
                    </AspectRatio>
                    {image.isMain && (
                      <Badge
                        className="absolute left-2 top-2"
                        variant="default"
                      >
                        Main
                      </Badge>
                    )}
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!image.isMain && (
                        <Button
                          onClick={() => handleSetMainImage(image.id)}
                          size="icon"
                          type="button"
                          variant="secondary"
                        >
                          <ImagePlusIcon className="size-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleRemoveImage(image.id)}
                        size="icon"
                        type="button"
                        variant="destructive"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <div className="grid gap-2 md:grid-cols-4" key={ingredient.id}>
                  <Input
                    onChange={(e) =>
                      updateIngredient(
                        ingredient.id,
                        "quantity",
                        e.target.value
                      )
                    }
                    placeholder="Quantity"
                    value={ingredient.quantity}
                  />
                  <Input
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "unit", e.target.value)
                    }
                    placeholder="Unit"
                    value={ingredient.unit}
                  />
                  <Input
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "name", e.target.value)
                    }
                    placeholder="Ingredient name"
                    value={ingredient.name}
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
                <div className="flex gap-2" key={instruction.id}>
                  <div className="flex min-w-[40px] items-center justify-center rounded bg-muted font-semibold">
                    {instruction.stepNumber}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <Textarea
                      onChange={(e) =>
                        updateInstruction(instruction.id, e.target.value)
                      }
                      placeholder="Describe this step..."
                      rows={2}
                      value={instruction.text}
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
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Type and press Enter to add tags"
                value={tagInput}
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
                    className="cursor-pointer"
                    key={tag}
                    onClick={() => removeTag(tag)}
                    variant="secondary"
                  >
                    {tag}
                    <XIcon className="ml-1 inline size-3" />
                  </Badge>
                ))}
              </div>
            )}
            <input name="tags" type="hidden" value={JSON.stringify(tags)} />
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
