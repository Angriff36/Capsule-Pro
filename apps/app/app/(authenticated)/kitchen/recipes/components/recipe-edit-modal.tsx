"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
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
import { Clock, Thermometer, Wrench, Lightbulb, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface Ingredient {
  id?: string;
  name: string;
  quantity: string;
  unit: string;
  notes?: string;
}

interface Step {
  id?: string;
  instruction: string;
  step_number: number;
  duration_minutes?: number | null;
  temperature_value?: number | null;
  temperature_unit?: string | null;
  equipment_needed?: string[];
  tips?: string | null;
  video_url?: string | null;
  image_url?: string | null;
  is_ccp?: boolean;
}

// HACCP Critical Control Point temperature thresholds (Fahrenheit)
const CCP_TEMP_THRESHOLDS = {
  min: 135, // Minimum safe hot holding temp
  max: 425, // Typical high-heat cooking
};

// Common kitchen equipment for recipes
const COMMON_EQUIPMENT = [
  "Oven",
  "Stovetop",
  "Grill",
  "Deep Fryer",
  "Blender",
  "Food Processor",
  "Stand Mixer",
  "Hand Mixer",
  "Immersion Blender",
  "Chef's Knife",
  "Cutting Board",
  "Mixing Bowls",
  "Measuring Cups",
  "Measuring Spoons",
  "Thermometer",
  "Timer",
  "Cast Iron Skillet",
  "Non-stick Pan",
  "Stock Pot",
  "Saucepan",
  "Dutch Oven",
  "Baking Sheet",
  "Roasting Pan",
  "Wire Rack",
  "Colander",
  "Strainer",
  "Whisk",
  "Spatula",
  "Tongs",
  "Ladle",
  "Slotted Spoon",
  "Peeler",
  "Grater",
  "Microplane",
  "Rolling Pin",
  "Parchment Paper",
  "Aluminum Foil",
  "Plastic Wrap",
  "Vacuum Sealer",
  "Sous Vide",
  "Steamer",
  "Pressure Cooker",
  "Slow Cooker",
  "Air Fryer",
  "Microwave",
  "Salamander",
  "Flat Top",
  "Charbroiler",
];

interface RecipeEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: {
    id?: string;
    name?: string;
    category?: string;
    description?: string;
    tags?: string[];
    ingredients?: Ingredient[];
    steps?: Step[];
    yieldQuantity?: number;
    yieldUnit?: string;
    yieldDescription?: string;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    restTimeMinutes?: number;
    difficultyLevel?: number;
  };
  onSave?: (data: FormData) => Promise<void>;
}

// Initialize steps with all fields
const initializeStep = (step: Partial<Step> = {}): Step => ({
  instruction: step.instruction ?? "",
  step_number: step.step_number ?? 1,
  duration_minutes: step.duration_minutes ?? null,
  temperature_value: step.temperature_value ?? null,
  temperature_unit: step.temperature_unit ?? "F",
  equipment_needed: step.equipment_needed ?? [],
  tips: step.tips ?? null,
  video_url: step.video_url ?? null,
  image_url: step.image_url ?? null,
  is_ccp: step.is_ccp ?? false,
  id: step.id,
});

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

/** Equipment chip component for displaying removable equipment tags */
function EquipmentChip({
  equipment,
  onRemove,
}: {
  equipment: string;
  onRemove: (equipment: string) => void;
}) {
  return (
    <Badge className="gap-1 pr-1" variant="outline">
      <Wrench className="h-3 w-3" />
      {equipment}
      <button
        className="ml-1 rounded-full hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => onRemove(equipment)}
        type="button"
      >
        &times;
      </button>
    </Badge>
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
          className="h-6 w-6"
          disabled={index === 0}
          onClick={() => onMoveUp(index)}
          size="icon"
          type="button"
          variant="ghost"
        >
          ↑
        </Button>
        <Button
          className="h-6 w-6"
          onClick={() => onMoveDown(index)}
          size="icon"
          type="button"
          variant="ghost"
        >
          ↓
        </Button>
      </div>
      <div className="flex-1 grid grid-cols-12 gap-2">
        <Input
          className="col-span-3"
          onChange={(e) => onUpdate(index, "quantity", e.target.value)}
          placeholder="Qty"
          value={ingredient.quantity}
        />
        <Input
          className="col-span-3"
          onChange={(e) => onUpdate(index, "unit", e.target.value)}
          placeholder="Unit"
          value={ingredient.unit}
        />
        <Input
          className="col-span-5"
          onChange={(e) => onUpdate(index, "name", e.target.value)}
          placeholder="Ingredient name"
          value={ingredient.name}
        />
        <Button
          className="col-span-1 h-9 w-9 text-destructive hover:text-destructive"
          onClick={() => onRemove(index)}
          size="icon"
          title="Remove ingredient"
          type="button"
          variant="ghost"
        >
          ×
        </Button>
      </div>
    </div>
  );
}

/** Step row component for displaying and editing a single step with enhanced fields */
function StepRow({
  step,
  index,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddEquipment,
  onRemoveEquipment,
  equipmentInput,
  setEquipmentInput,
  showTips,
  setShowTips,
}: {
  step: Step;
  index: number;
  onUpdate: (index: number, field: keyof Step, value: string | number | boolean | null) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAddEquipment: (index: number, equipment: string) => void;
  onRemoveEquipment: (index: number, equipment: string) => void;
  equipmentInput: string;
  setEquipmentInput: (value: string) => void;
  showTips: boolean;
  setShowTips: (show: boolean) => void;
}) {
  // Determine if this step is a CCP based on temperature
  const isCCP = step.temperature_value !== null &&
    step.temperature_value !== undefined &&
    step.temperature_value >= CCP_TEMP_THRESHOLDS.min;

  // Get filtered equipment suggestions
  const filteredEquipment = COMMON_EQUIPMENT.filter(
    (eq) =>
      eq.toLowerCase().includes(equipmentInput.toLowerCase()) &&
      !step.equipment_needed?.includes(eq)
  ).slice(0, 5);

  return (
    <div className="flex items-start gap-2 p-4 border rounded-lg bg-card">
      {/* Move controls */}
      <div className="flex flex-col gap-1 pt-6">
        <Button
          className="h-6 w-6"
          disabled={index === 0}
          onClick={() => onMoveUp(index)}
          size="icon"
          type="button"
          variant="ghost"
        >
          ↑
        </Button>
        <Button
          className="h-6 w-6"
          onClick={() => onMoveDown(index)}
          size="button"
          type="button"
          variant="ghost"
        >
          ↓
        </Button>
      </div>

      <div className="flex-1 space-y-4">
        {/* Step header with number and CCP indicator */}
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">
            Step {index + 1}
          </Label>
          {isCCP && (
            <Badge className="gap-1 bg-amber-500" variant="default">
              <AlertTriangle className="h-3 w-3" />
              CCP
            </Badge>
          )}
        </div>

        {/* Instruction textarea */}
        <Textarea
          className="w-full"
          onChange={(e) => onUpdate(index, "instruction", e.target.value)}
          placeholder="Enter instruction for this step"
          rows={3}
          value={step.instruction}
        />

        {/* Timer and Temperature row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Timer input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Duration (minutes)
            </Label>
            <Input
              min="0"
              onChange={(e) => onUpdate(index, "duration_minutes", e.target.value ? Number(e.target.value) : null)}
              placeholder="e.g., 15"
              type="number"
              value={step.duration_minutes ?? ""}
            />
          </div>

          {/* Temperature input with unit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Thermometer className="h-4 w-4" />
              Temperature
            </Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                min="0"
                onChange={(e) => onUpdate(index, "temperature_value", e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g., 350"
                type="number"
                value={step.temperature_value ?? ""}
              />
              <Select
                onValueChange={(value) => onUpdate(index, "temperature_unit", value)}
                value={step.temperature_unit ?? "F"}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">°F</SelectItem>
                  <SelectItem value="C">°C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Equipment tags */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="h-4 w-4" />
            Equipment Needed
          </Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {step.equipment_needed?.map((eq) => (
              <EquipmentChip
                equipment={eq}
                key={eq}
                onRemove={() => onRemoveEquipment(index, eq)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              onChange={(e) => setEquipmentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (equipmentInput.trim()) {
                    onAddEquipment(index, equipmentInput.trim());
                    setEquipmentInput("");
                  }
                }
              }}
              placeholder="Type equipment and press Enter"
              value={equipmentInput}
            />
            <Button
              onClick={() => {
                if (equipmentInput.trim()) {
                  onAddEquipment(index, equipmentInput.trim());
                  setEquipmentInput("");
                }
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              Add
            </Button>
          </div>
          {equipmentInput && filteredEquipment.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {filteredEquipment.map((eq) => (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  key={eq}
                  onClick={() => {
                    onAddEquipment(index, eq);
                    setEquipmentInput("");
                  }}
                  type="button"
                >
                  {eq}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tips/notes toggle and field */}
        <div className="space-y-2">
          <Button
            className="flex items-center gap-2 text-sm text-muted-foreground"
            onClick={() => setShowTips(!showTips)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Lightbulb className="h-4 w-4" />
            {showTips ? "Hide Tips" : "Add Tips"}
            {step.tips && !showTips && (
              <Badge className="ml-1" variant="secondary">
                1
              </Badge>
            )}
          </Button>
          {showTips && (
            <Textarea
              className="w-full"
              onChange={(e) => onUpdate(index, "tips", e.target.value || null)}
              placeholder="Add tips, notes, or warnings for this step"
              rows={2}
              value={step.tips ?? ""}
            />
          )}
        </div>

        {/* CCP checkbox for temperature verification */}
        {step.temperature_value !== null && step.temperature_value !== undefined && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Critical Control Point: Temperature verification required
            </span>
          </div>
        )}

        {/* Remove step button */}
        <Button
          className="text-destructive hover:text-destructive"
          onClick={() => onRemove(index)}
          size="sm"
          title="Remove step"
          type="button"
          variant="ghost"
        >
          Remove Step
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
  const [steps, setSteps] = useState<Step[]>(
    recipe?.steps?.map((s, idx) => initializeStep({ ...s, step_number: idx + 1 })) ?? []
  );
  const [equipmentInputs, setEquipmentInputs] = useState<Record<number, string>>({});
  const [showTipsMap, setShowTipsMap] = useState<Record<number, boolean>>({});

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
    setIngredients([...ingredients, { name: "", quantity: "", unit: "" }]);
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
  const handleAddStep = () => {
    setSteps([...steps, {
      instruction: "",
      step_number: steps.length + 1,
      duration_minutes: null,
      temperature_value: null,
      temperature_unit: "F",
      equipment_needed: [],
      tips: null,
      video_url: null,
      image_url: null,
      is_ccp: false,
    }]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Update step numbers
    const updated = newSteps.map((step, idx) => ({ ...step, step_number: idx + 1 }));
    setSteps(updated);
    // Clean up equipment inputs and tips state
    const newEquipmentInputs = { ...equipmentInputs };
    delete newEquipmentInputs[index];
    setEquipmentInputs(newEquipmentInputs);
    const newShowTips = { ...showTipsMap };
    delete newShowTips[index];
    setShowTipsMap(newShowTips);
  };

  const handleUpdateStep = (
    index: number,
    field: keyof Step,
    value: string | number | boolean | null
  ) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    // Auto-set CCP flag when temperature is set above threshold
    if (field === "temperature_value" && typeof value === "number") {
      updated[index].is_ccp = value >= CCP_TEMP_THRESHOLDS.min;
    }
    setSteps(updated);
  };

  const handleAddEquipment = (index: number, equipment: string) => {
    const updated = [...steps];
    const currentEquipment = updated[index].equipment_needed ?? [];
    if (!currentEquipment.includes(equipment)) {
      updated[index] = {
        ...updated[index],
        equipment_needed: [...currentEquipment, equipment],
      };
      setSteps(updated);
    }
  };

  const handleRemoveEquipment = (index: number, equipment: string) => {
    const updated = [...steps];
    const currentEquipment = updated[index].equipment_needed ?? [];
    updated[index] = {
      ...updated[index],
      equipment_needed: currentEquipment.filter((eq) => eq !== equipment),
    };
    setSteps(updated);
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (
      newIndex < 0 ||
      newIndex >= steps.length ||
      (direction === "up" && index === 0)
    ) {
      return;
    }
    const updated = [...steps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSteps(updated);
  };

  const handleSubmit = async (formData: FormData) => {
    if (!onSave) {
      return;
    }
    setIsSubmitting(true);
    try {
      formData.set("tags", tags.join(","));
      formData.set("ingredients", JSON.stringify(ingredients));
      formData.set("steps", JSON.stringify(steps));
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
                size="sm"
                type="button"
                variant="outline"
              >
                Add Ingredient
              </Button>
            </div>
            {ingredients.length > 0 && (
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <IngredientRow
                    index={index}
                    ingredient={ingredient}
                    key={index}
                    onMoveDown={(index) => handleMoveIngredient(index, "down")}
                    onMoveUp={(index) => handleMoveIngredient(index, "up")}
                    onRemove={handleRemoveIngredient}
                    onUpdate={handleUpdateIngredient}
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

          {/* Steps section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium text-base">Steps</Label>
              <Button
                onClick={handleAddStep}
                size="sm"
                type="button"
                variant="outline"
              >
                Add Step
              </Button>
            </div>
            {steps.length > 0 && (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <StepRow
                    equipmentInput={equipmentInputs[index] ?? ""}
                    index={index}
                    key={index}
                    onAddEquipment={handleAddEquipment}
                    onMoveDown={() => handleMoveStep(index, "down")}
                    onMoveUp={() => handleMoveStep(index, "up")}
                    onRemove={handleRemoveStep}
                    onRemoveEquipment={handleRemoveEquipment}
                    onUpdate={handleUpdateStep}
                    setEquipmentInput={(value) =>
                      setEquipmentInputs((prev) => ({ ...prev, [index]: value }))
                    }
                    setShowTips={(show) =>
                      setShowTipsMap((prev) => ({ ...prev, [index]: show }))
                    }
                    showTips={showTipsMap[index] ?? Boolean(step.tips)}
                    step={step}
                  />
                ))}
              </div>
            )}
            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                No steps added yet. Click "Add Step" to get started.
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
