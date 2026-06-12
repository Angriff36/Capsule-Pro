import { Beer, CircleOff, GlassWater, Martini, Wine } from "lucide-react";
import { getAvailableItems } from "../../engine/menuConstraints";
import type { DishCost, MenuFormData } from "../../types/menu";
import MenuItemCard from "../menu/MenuItemCard";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";

const BAR_OPTIONS = [
  {
    value: "none",
    label: "No Bar",
    description: "Food only",
    icon: <CircleOff className="h-4 w-4" />,
  },
  {
    value: "beer-wine",
    label: "Beer & Wine",
    description: "Curated selection",
    icon: <Beer className="h-4 w-4" />,
  },
  {
    value: "full-bar",
    label: "Full Bar",
    description: "Standard spirits, beer, wine",
    icon: <GlassWater className="h-4 w-4" />,
  },
  {
    value: "premium-bar",
    label: "Premium Bar",
    description: "Top-shelf & craft cocktails",
    icon: <Martini className="h-4 w-4" />,
  },
  {
    value: "byob-service",
    label: "BYOB",
    description: "You supply, we bartend",
    icon: <Wine className="h-4 w-4" />,
  },
];

interface Props {
  costCache?: Record<string, DishCost>;
  formData: MenuFormData;
  showCost?: boolean;
  showPrice?: boolean;
  toggleMenuItem: (id: string) => void;
  updateField: <K extends keyof MenuFormData>(
    field: K,
    value: MenuFormData[K]
  ) => void;
}

export default function MenuAddOnsStep({
  formData,
  updateField,
  toggleMenuItem,
  showPrice,
  showCost,
  costCache,
}: Props) {
  const available = getAvailableItems(formData.serviceStyle, formData.season);
  const desserts = available.filter((item) => item.category === "dessert");
  const lateNight = available.filter((item) => item.category === "late-night");

  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Dessert, late-night bites, and bar service to round out the experience."
        title="Finishing touches"
      />

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          Desserts
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {desserts.map((item) => (
            <MenuItemCard
              cost={costCache?.[item.id]}
              item={item}
              key={item.id}
              onToggle={() => toggleMenuItem(item.id)}
              selected={formData.selectedItems.includes(item.id)}
              showCost={showCost}
              showPrice={showPrice}
            />
          ))}
        </div>
      </div>

      {lateNight.length > 0 && (
        <div>
          <label className="mb-3 block font-medium text-sm text-stone-700">
            Late Night Bites
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {lateNight.map((item) => (
              <MenuItemCard
                cost={costCache?.[item.id]}
                item={item}
                key={item.id}
                onToggle={() => toggleMenuItem(item.id)}
                selected={formData.selectedItems.includes(item.id)}
                showCost={showCost}
                showPrice={showPrice}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          Bar service
        </label>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
    </div>
  );
}
