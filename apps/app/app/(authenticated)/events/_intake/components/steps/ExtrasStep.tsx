import { Beer, CircleOff, GlassWater, Martini, Wine } from "lucide-react";
import type { WizardFormData } from "../../types/wizard";
import ChipToggle from "../ui/ChipToggle";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";

const BAR_OPTIONS = [
  {
    value: "none",
    label: "No Bar Service",
    description: "Food only",
    icon: <CircleOff className="w-4 h-4" />,
  },
  {
    value: "beer-wine",
    label: "Beer & Wine",
    description: "Curated beer and wine selection",
    icon: <Beer className="w-4 h-4" />,
  },
  {
    value: "full-bar",
    label: "Full Bar",
    description: "Standard spirits, beer, and wine",
    icon: <GlassWater className="w-4 h-4" />,
  },
  {
    value: "premium-bar",
    label: "Premium Bar",
    description: "Top-shelf spirits and craft cocktails",
    icon: <Martini className="w-4 h-4" />,
  },
  {
    value: "byob-service",
    label: "BYOB Service",
    description: "You supply, we bartend",
    icon: <Wine className="w-4 h-4" />,
  },
];

const RENTAL_OPTIONS = [
  "Tables & Chairs",
  "Linens & Napkins",
  "China & Flatware",
  "Glassware",
  "Chafing Dishes & Warmers",
  "Tent / Canopy",
];

const RENTAL_KEYS: Record<string, string> = {
  "Tables & Chairs": "tables-chairs",
  "Linens & Napkins": "linens",
  "China & Flatware": "china-flatware",
  Glassware: "glassware",
  "Chafing Dishes & Warmers": "chafing-dishes",
  "Tent / Canopy": "tent",
};

const ADDON_OPTIONS = [
  "Late Night Snack Station",
  "Dessert Table",
  "Grazing / Charcuterie Display",
  "Raw Bar / Oyster Station",
  "Espresso Cart",
  "Live Action Station (chef)",
];

const ADDON_KEYS: Record<string, string> = {
  "Late Night Snack Station": "late-night-snack",
  "Dessert Table": "dessert-table",
  "Grazing / Charcuterie Display": "grazing-display",
  "Raw Bar / Oyster Station": "raw-bar",
  "Espresso Cart": "espresso-cart",
  "Live Action Station (chef)": "action-station",
};

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => void;
  toggleArrayItem: (field: keyof WizardFormData, item: string) => void;
}

export default function ExtrasStep({
  formData,
  updateField,
  toggleArrayItem,
}: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="The details that elevate your event from great to unforgettable."
        title="Bar, rentals & add-ons"
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Bar service
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BAR_OPTIONS.map((opt) => (
            <SelectCard
              description={opt.description}
              icon={opt.icon}
              key={opt.value}
              label={opt.label}
              onClick={() => updateField("barService", opt.value)}
              selected={formData.barService === opt.value}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Rentals needed (select all that apply)
        </label>
        <div className="flex flex-wrap gap-2">
          {RENTAL_OPTIONS.map((rental) => (
            <ChipToggle
              key={rental}
              label={rental}
              onClick={() =>
                toggleArrayItem("rentalsNeeded", RENTAL_KEYS[rental])
              }
              selected={formData.rentalsNeeded.includes(RENTAL_KEYS[rental])}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Add-on experiences
        </label>
        <div className="flex flex-wrap gap-2">
          {ADDON_OPTIONS.map((addon) => (
            <ChipToggle
              key={addon}
              label={addon}
              onClick={() => toggleArrayItem("addOns", ADDON_KEYS[addon])}
              selected={formData.addOns.includes(ADDON_KEYS[addon])}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
