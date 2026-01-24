/**
 * @module AllergenManagementModal
 * @intent Provide modal interface for editing allergen and dietary tag information
 * @responsibility Render modal with checkboxes for allergens and dietary tags, handle save operations
 * @domain Kitchen
 * @tags allergens, modal, form, dietary-restrictions
 * @canonical true
 */
"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.AllergenManagementModal = AllergenManagementModal;
const button_1 = require("@repo/design-system/components/ui/button");
const checkbox_1 = require("@repo/design-system/components/ui/checkbox");
const dialog_1 = require("@repo/design-system/components/ui/dialog");
const label_1 = require("@repo/design-system/components/ui/label");
const scroll_area_1 = require("@repo/design-system/components/ui/scroll-area");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const sonner_1 = require("sonner");
const COMMON_ALLERGENS = [
  { id: "peanuts", label: "Peanuts", description: "Legumes including peanuts" },
  {
    id: "tree nuts",
    label: "Tree Nuts",
    description: "Almonds, walnuts, pecans, cashews, etc.",
  },
  { id: "dairy", label: "Dairy", description: "Milk, cheese, butter, etc." },
  { id: "eggs", label: "Eggs", description: "Chicken eggs and egg products" },
  { id: "gluten", label: "Gluten", description: "Wheat, barley, rye, etc." },
  { id: "soy", label: "Soy", description: "Soybeans and soy products" },
  { id: "fish", label: "Fish", description: "All types of fish" },
  {
    id: "shellfish",
    label: "Shellfish",
    description: "Shrimp, crab, lobster, etc.",
  },
  { id: "sesame", label: "Sesame", description: "Sesame seeds and sesame oil" },
];
const COMMON_ALLERGENS_IDS = [
  "peanuts",
  "tree-nuts",
  "dairy",
  "eggs",
  "gluten",
  "soy",
  "fish",
  "shellfish",
  "sesame",
];
const DIETARY_TAGS = [
  { id: "vegan", label: "Vegan", description: "No animal products" },
  {
    id: "vegetarian",
    label: "Vegetarian",
    description: "No meat, but may include dairy/eggs",
  },
  {
    id: "kosher",
    label: "Kosher",
    description: "Prepared according to Jewish law",
  },
  {
    id: "halal",
    label: "Halal",
    description: "Prepared according to Islamic law",
  },
  {
    id: "gluten-free",
    label: "Gluten-Free",
    description: "No gluten-containing ingredients",
  },
  { id: "dairy-free", label: "Dairy-Free", description: "No dairy products" },
  { id: "nut-free", label: "Nut-Free", description: "No nuts or peanuts" },
];
function AllergenManagementModal({
  type,
  id,
  name,
  currentAllergens,
  currentDietaryTags,
  tenantId,
}) {
  const [open, setOpen] = (0, react_1.useState)(false);
  const [saving, setSaving] = (0, react_1.useState)(false);
  const [selectedAllergens, setSelectedAllergens] = (0, react_1.useState)(
    currentAllergens
  );
  const [selectedDietaryTags, setSelectedDietaryTags] = (0, react_1.useState)(
    currentDietaryTags
  );
  const handleAllergenToggle = (allergen) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };
  const handleDietaryToggle = (tag) => {
    setSelectedDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      // Recipe allergen management has been deprecated and is no longer available
      if (type === "recipe") {
        sonner_1.toast.error(
          "Recipe allergen management is not available. Allergens are managed at the dish level."
        );
        setOpen(false);
        return;
      }
      const endpoint = "/api/kitchen/allergens/update-dish";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          tenantId, // Server validates tenantId from auth
          allergens: selectedAllergens,
          dietaryTags: selectedDietaryTags,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update allergen information");
      }
      sonner_1.toast.success(`Allergen information updated for dish: ${name}`);
      setOpen(false);
      // Trigger a custom event for parent component to refresh
      window.dispatchEvent(new CustomEvent("allergen-updated"));
    } catch (error) {
      console.error("Error updating allergens:", error);
      sonner_1.toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update allergen information. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };
  const hasChanges =
    JSON.stringify(selectedAllergens.sort()) !==
      JSON.stringify(currentAllergens.sort()) ||
    JSON.stringify(selectedDietaryTags.sort()) !==
      JSON.stringify(currentDietaryTags.sort());
  return (
    <dialog_1.Dialog onOpenChange={setOpen} open={open}>
      <dialog_1.DialogTrigger asChild>
        <button_1.Button size="sm" variant="outline">
          <lucide_react_1.EditIcon className="mr-2 h-4 w-4" />
          Edit Allergens
        </button_1.Button>
      </dialog_1.DialogTrigger>
      <dialog_1.DialogContent className="max-w-2xl">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle>Edit Allergen Information</dialog_1.DialogTitle>
          <dialog_1.DialogDescription>
            Manage allergens and dietary restrictions for &quot;{name}
            &quot;. This information will be used to generate warnings for
            guests with restrictions.
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <scroll_area_1.ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Allergens Section */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-base">Allergens</h3>
                <p className="text-muted-foreground text-sm">
                  Select all allergens present in this {type}
                </p>
              </div>

              <div className="space-y-2">
                {COMMON_ALLERGENS.map((allergen) => (
                  <div
                    className="flex items-start space-x-3 rounded-md border p-3"
                    key={allergen.id}
                  >
                    <checkbox_1.Checkbox
                      checked={selectedAllergens.includes(allergen.id)}
                      id={`allergen-${allergen.id}`}
                      onCheckedChange={() => handleAllergenToggle(allergen.id)}
                    />
                    <div className="flex-1">
                      <label_1.Label
                        className="cursor-pointer font-medium"
                        htmlFor={`allergen-${allergen.id}`}
                      >
                        {allergen.label}
                      </label_1.Label>
                      <p className="text-muted-foreground text-sm">
                        {allergen.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dietary Tags Section */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-base">Dietary Tags</h3>
                <p className="text-muted-foreground text-sm">
                  Select applicable dietary restrictions
                </p>
              </div>

              <div className="space-y-2">
                {DIETARY_TAGS.map((tag) => (
                  <div
                    className="flex items-start space-x-3 rounded-md border p-3"
                    key={tag.id}
                  >
                    <checkbox_1.Checkbox
                      checked={selectedDietaryTags.includes(tag.id)}
                      id={`dietary-${tag.id}`}
                      onCheckedChange={() => handleDietaryToggle(tag.id)}
                    />
                    <div className="flex-1">
                      <label_1.Label
                        className="cursor-pointer font-medium"
                        htmlFor={`dietary-${tag.id}`}
                      >
                        {tag.label}
                      </label_1.Label>
                      <p className="text-muted-foreground text-sm">
                        {tag.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-md bg-muted p-4">
              <h4 className="font-semibold text-sm mb-2">Summary</h4>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    Selected allergens:{" "}
                  </span>
                  <span className="font-medium">
                    {selectedAllergens.length > 0
                      ? selectedAllergens.join(", ")
                      : "None"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Dietary tags: </span>
                  <span className="font-medium">
                    {selectedDietaryTags.length > 0
                      ? selectedDietaryTags.join(", ")
                      : "None"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </scroll_area_1.ScrollArea>

        <dialog_1.DialogFooter>
          <button_1.Button onClick={() => setOpen(false)} variant="outline">
            Cancel
          </button_1.Button>
          <button_1.Button
            disabled={!hasChanges || saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <lucide_react_1.LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button_1.Button>
        </dialog_1.DialogFooter>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
  );
}
