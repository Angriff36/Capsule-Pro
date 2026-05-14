import type { MenuFormData, ServiceStyle } from "../../types/menu";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";

const SERVICE_STYLES: {
  value: ServiceStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "plated",
    label: "Plated Dinner",
    description: "Individually plated courses. Polished, precise, elegant.",
  },
  {
    value: "buffet",
    label: "Buffet",
    description: "Self-serve stations with curated variety.",
  },
  {
    value: "stations",
    label: "Food Stations",
    description: "Interactive themed stations with live cooking.",
  },
  {
    value: "family-style",
    label: "Family Style",
    description: "Shared platters brought to the table.",
  },
  {
    value: "drop-off",
    label: "Drop-Off",
    description: "We set up, you enjoy. No service staff.",
  },
  {
    value: "cocktail-reception",
    label: "Cocktail / Passed",
    description: "Elegant passed bites and small plates.",
  },
];

interface Props {
  formData: MenuFormData;
  updateField: <K extends keyof MenuFormData>(
    field: K,
    value: MenuFormData[K]
  ) => void;
}

export default function MenuServiceStyleStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="The service style determines which dishes are available and how they are presented."
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

      {formData.serviceStyle && (
        <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
          <p className="text-xs text-stone-500">
            The menu items in the next steps will be filtered to show only
            dishes compatible with
            <strong className="text-stone-700">
              {" "}
              {
                SERVICE_STYLES.find((s) => s.value === formData.serviceStyle)
                  ?.label
              }
            </strong>{" "}
            service and available in{" "}
            <strong className="text-stone-700">{formData.season}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
