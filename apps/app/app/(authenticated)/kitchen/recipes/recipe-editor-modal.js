"use client";

var __importDefault =
  (this && this.__importDefault) ||
  ((mod) => (mod && mod.__esModule ? mod : { default: mod }));
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeEditorModal = void 0;
const aspect_ratio_1 = require("@repo/design-system/components/ui/aspect-ratio");
const badge_1 = require("@repo/design-system/components/ui/badge");
const button_1 = require("@repo/design-system/components/ui/button");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const input_1 = require("@repo/design-system/components/ui/input");
const label_1 = require("@repo/design-system/components/ui/label");
const select_1 = require("@repo/design-system/components/ui/select");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const lucide_react_1 = require("lucide-react");
const image_1 = __importDefault(require("next/image"));
const react_1 = require("react");
const difficultyLevels = ["Easy", "Medium", "Hard"];
const RecipeEditorModal = ({ open, onOpenChange, recipe, onSave }) => {
  const [ingredients, setIngredients] = (0, react_1.useState)(
    recipe?.ingredients ?? []
  );
  const [instructions, setInstructions] = (0, react_1.useState)(
    recipe?.instructions ?? []
  );
  const [tags, setTags] = (0, react_1.useState)(recipe?.tags ?? []);
  const [tagInput, setTagInput] = (0, react_1.useState)("");
  const [images, setImages] = (0, react_1.useState)([]);
  const fileInputRef = (0, react_1.useRef)(null);
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
  const removeIngredient = (id) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };
  const updateIngredient = (id, field, value) => {
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
  const removeInstruction = (id) => {
    setInstructions(instructions.filter((inst) => inst.id !== id));
  };
  const updateInstruction = (id, text) => {
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
  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      return;
    }
    const newImages = files.map((file) => ({
      id: Math.random().toString(),
      file,
      url: URL.createObjectURL(file),
      isMain: images.length === 0,
    }));
    setImages([...images, ...newImages]);
  };
  const handleRemoveImage = (id) => {
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
  const handleSetMainImage = (id) => {
    setImages(images.map((img) => ({ ...img, isMain: img.id === id })));
  };
  return (
    <dialog_1.Dialog onOpenChange={onOpenChange} open={open}>
      <dialog_1.DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>
            {recipe?.id ? "Edit Recipe" : "Add Recipe"}
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Fill in the recipe details below. Required fields are marked with an
            asterisk.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

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
              <label_1.Label htmlFor="name">
                Recipe Name <span className="text-destructive">*</span>
              </label_1.Label>
              <input_1.Input
                defaultValue={recipe?.name ?? ""}
                id="name"
                name="name"
                placeholder="e.g., Classic Caesar Salad"
                required
              />
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="difficulty">Difficulty</label_1.Label>
              <select_1.Select
                defaultValue={recipe?.difficulty ?? "Medium"}
                name="difficulty"
              >
                <select_1.SelectTrigger id="difficulty">
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {difficultyLevels.map((level) => (
                    <select_1.SelectItem key={level} value={level}>
                      {level}
                    </select_1.SelectItem>
                  ))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="prepTime">
                Prep Time (minutes)
              </label_1.Label>
              <input_1.Input
                defaultValue={recipe?.prepTime ?? ""}
                id="prepTime"
                min="0"
                name="prepTime"
                type="number"
              />
            </div>

            <div className="space-y-2">
              <label_1.Label htmlFor="servings">Servings</label_1.Label>
              <input_1.Input
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
              <label_1.Label htmlFor="cookTime">
                Cook Time (minutes)
              </label_1.Label>
              <input_1.Input
                defaultValue={recipe?.cookTime ?? ""}
                id="cookTime"
                min="0"
                name="cookTime"
                type="number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label_1.Label htmlFor="description">Description</label_1.Label>
            <textarea_1.Textarea
              defaultValue={recipe?.description ?? ""}
              id="description"
              name="description"
              placeholder="Brief description of the recipe"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <label_1.Label>Images</label_1.Label>
            <div className="rounded-lg border-2 border-dashed p-4 text-center">
              <input
                accept="image/*"
                className="hidden"
                multiple
                onChange={handleImageUpload}
                ref={fileInputRef}
                type="file"
              />
              <button_1.Button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <lucide_react_1.UploadIcon className="mr-2 size-4" />
                Upload Images
              </button_1.Button>
              <p className="text-muted-foreground mt-2 text-sm">
                Drag and drop or click to upload
              </p>
            </div>
            {images.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {images.map((image) => (
                  <div className="relative group" key={image.id}>
                    <aspect_ratio_1.AspectRatio ratio={16 / 9}>
                      <image_1.default
                        alt="Recipe"
                        className="h-full w-full rounded-lg object-cover"
                        fill
                        src={image.url}
                      />
                    </aspect_ratio_1.AspectRatio>
                    {image.isMain && (
                      <badge_1.Badge
                        className="absolute left-2 top-2"
                        variant="default"
                      >
                        Main
                      </badge_1.Badge>
                    )}
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {!image.isMain && (
                        <button_1.Button
                          onClick={() => handleSetMainImage(image.id)}
                          size="icon"
                          type="button"
                          variant="secondary"
                        >
                          <lucide_react_1.ImagePlusIcon className="size-4" />
                        </button_1.Button>
                      )}
                      <button_1.Button
                        onClick={() => handleRemoveImage(image.id)}
                        size="icon"
                        type="button"
                        variant="destructive"
                      >
                        <lucide_react_1.XIcon className="size-4" />
                      </button_1.Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label_1.Label>Ingredients</label_1.Label>
              <button_1.Button
                onClick={(e) => {
                  e.preventDefault();
                  addIngredient();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <lucide_react_1.PlusIcon className="mr-2 size-4" />
                Add Ingredient
              </button_1.Button>
            </div>
            <div className="space-y-2">
              {ingredients.map((ingredient) => (
                <div className="grid gap-2 md:grid-cols-4" key={ingredient.id}>
                  <input_1.Input
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
                  <input_1.Input
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "unit", e.target.value)
                    }
                    placeholder="Unit"
                    value={ingredient.unit}
                  />
                  <input_1.Input
                    onChange={(e) =>
                      updateIngredient(ingredient.id, "name", e.target.value)
                    }
                    placeholder="Ingredient name"
                    value={ingredient.name}
                  />
                  <div className="flex gap-2">
                    <button_1.Button
                      onClick={() => removeIngredient(ingredient.id)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <lucide_react_1.XIcon className="size-4" />
                    </button_1.Button>
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
              <label_1.Label>Instructions</label_1.Label>
              <button_1.Button
                onClick={(e) => {
                  e.preventDefault();
                  addInstruction();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <lucide_react_1.PlusIcon className="mr-2 size-4" />
                Add Step
              </button_1.Button>
            </div>
            <div className="space-y-2">
              {instructions.map((instruction) => (
                <div className="flex gap-2" key={instruction.id}>
                  <div className="flex min-w-[40px] items-center justify-center rounded bg-muted font-semibold">
                    {instruction.stepNumber}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <textarea_1.Textarea
                      onChange={(e) =>
                        updateInstruction(instruction.id, e.target.value)
                      }
                      placeholder="Describe this step..."
                      rows={2}
                      value={instruction.text}
                    />
                  </div>
                  <button_1.Button
                    onClick={() => removeInstruction(instruction.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <lucide_react_1.XIcon className="size-4" />
                  </button_1.Button>
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
            <label_1.Label htmlFor="tags">Tags</label_1.Label>
            <div className="flex gap-2">
              <input_1.Input
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
              <button_1.Button
                onClick={(e) => {
                  e.preventDefault();
                  addTag();
                }}
                type="button"
                variant="outline"
              >
                <lucide_react_1.PlusIcon className="size-4" />
              </button_1.Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <badge_1.Badge
                    className="cursor-pointer"
                    key={tag}
                    onClick={() => removeTag(tag)}
                    variant="secondary"
                  >
                    {tag}
                    <lucide_react_1.XIcon className="ml-1 inline size-3" />
                  </badge_1.Badge>
                ))}
              </div>
            )}
            <input name="tags" type="hidden" value={JSON.stringify(tags)} />
          </div>

          <div className="flex justify-end gap-3">
            <button_1.Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </button_1.Button>
            <button_1.Button type="submit">Save</button_1.Button>
          </div>
        </form>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
};
exports.RecipeEditorModal = RecipeEditorModal;
