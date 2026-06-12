import type { WizardFormData } from "../../types/wizard";
import ChipToggle from "../ui/ChipToggle";
import StepHeader from "../ui/StepHeader";
import TextArea from "../ui/TextArea";

const CUISINE_OPTIONS = [
  "American",
  "Italian",
  "Mediterranean",
  "French",
  "Asian Fusion",
  "Mexican / Latin",
  "Southern / BBQ",
  "Seafood",
  "Farm-to-Table",
  "Indian",
  "Middle Eastern",
  "Japanese",
  "Open to Suggestions",
];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Kosher",
  "Halal",
  "Keto / Low-Carb",
];

const DIETARY_PERCENTAGES = [
  { value: "few", label: "A few guests (< 10%)" },
  { value: "some", label: "Some guests (10-25%)" },
  { value: "many", label: "Many guests (25-50%)" },
  { value: "majority", label: "Most or all guests (50%+)" },
];

interface Props {
  formData: WizardFormData;
  toggleArrayItem: (field: keyof WizardFormData, item: string) => void;
  updateField: <K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => void;
}

export default function MenuPreferencesStep({
  formData,
  toggleArrayItem,
  updateField,
}: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Let us know what flavors excite you and any dietary considerations."
        title="Cuisine & dietary needs"
      />

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          What cuisines interest you? Select all that apply.
        </label>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map((cuisine) => (
            <ChipToggle
              key={cuisine}
              label={cuisine}
              onClick={() => toggleArrayItem("cuisinePreferences", cuisine)}
              selected={formData.cuisinePreferences.includes(cuisine)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          Any dietary restrictions to accommodate?
        </label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map((diet) => (
            <ChipToggle
              key={diet}
              label={diet}
              onClick={() => toggleArrayItem("dietaryNeeds", diet)}
              selected={formData.dietaryNeeds.includes(diet)}
            />
          ))}
        </div>
      </div>

      {formData.dietaryNeeds.length > 0 && (
        <div>
          <label className="mb-3 block font-medium text-sm text-stone-700">
            What portion of your guests have dietary needs?
          </label>
          <div className="flex flex-wrap gap-3">
            {DIETARY_PERCENTAGES.map((opt) => (
              <button
                className={`rounded-full border px-4 py-2 font-medium text-sm transition-all ${
                  formData.dietaryPercentage === opt.value
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                }
                `}
                key={opt.value}
                onClick={() => updateField("dietaryPercentage", opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <TextArea
        label="Menu notes or special requests"
        onChange={(v) => updateField("menuNotes", v)}
        placeholder="Any must-have dishes, allergies, cultural considerations, or ideas you'd like us to consider..."
        rows={3}
        value={formData.menuNotes}
      />
    </div>
  );
}
