import { Minus, Plus } from "lucide-react";
import type { WizardFormData } from "../../types/wizard";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";

const SERVICE_STYLES = [
  {
    value: "plated",
    label: "Plated Dinner",
    description:
      "Each guest receives an individually plated course. Polished, precise, and elegant.",
  },
  {
    value: "buffet",
    label: "Buffet",
    description:
      "Self-serve stations with a curated selection. Great variety and flexibility.",
  },
  {
    value: "stations",
    label: "Food Stations",
    description:
      "Interactive themed stations with live cooking. Social and experiential.",
  },
  {
    value: "family-style",
    label: "Family Style",
    description:
      "Shared platters brought to the table. Warm, communal, and generous.",
  },
  {
    value: "drop-off",
    label: "Drop-Off Catering",
    description:
      "We set up, you enjoy. No service staff on-site. Budget-friendly.",
  },
  {
    value: "cocktail-reception",
    label: "Cocktail / Passed",
    description:
      "Elegant passed bites and small plates. Perfect for mingling events.",
  },
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => void;
}

export default function ServiceStyleStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="The service style shapes the entire dining experience. Choose what feels right."
        title="How should we serve?"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SERVICE_STYLES.map((style) => (
          <SelectCard
            description={style.description}
            key={style.value}
            label={style.label}
            onClick={() => updateField("serviceStyle", style.value)}
            selected={formData.serviceStyle === style.value}
          />
        ))}
      </div>

      {formData.serviceStyle &&
        formData.serviceStyle !== "drop-off" &&
        formData.serviceStyle !== "cocktail-reception" && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-3">
              How many courses?
            </label>
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center
                text-stone-600 hover:bg-stone-100 transition-colors"
                onClick={() =>
                  updateField(
                    "courseCount",
                    Math.max(1, formData.courseCount - 1)
                  )
                }
                type="button"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="text-center">
                <span className="text-3xl font-light text-stone-800">
                  {formData.courseCount}
                </span>
                <span className="text-sm text-stone-400 ml-2">
                  {formData.courseCount === 1 ? "course" : "courses"}
                </span>
              </div>
              <button
                className="w-10 h-10 rounded-full border border-stone-200 flex items-center justify-center
                text-stone-600 hover:bg-stone-100 transition-colors"
                onClick={() =>
                  updateField(
                    "courseCount",
                    Math.min(8, formData.courseCount + 1)
                  )
                }
                type="button"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-400 mt-2">
              3 courses is standard (appetizer, entree, dessert)
            </p>
          </div>
        )}
    </div>
  );
}
