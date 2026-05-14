import { AlertTriangle } from "lucide-react";
import { getAvailableItems } from "../../engine/menuConstraints";
import type { DishCost, MenuFormData } from "../../types/menu";
import MenuItemCard from "../menu/MenuItemCard";
import StepHeader from "../ui/StepHeader";

interface Props {
  formData: MenuFormData;
  toggleMenuItem: (id: string) => void;
  showPrice?: boolean;
  showCost?: boolean;
  costCache?: Record<string, DishCost>;
}

export default function MenuMainsStep({
  formData,
  toggleMenuItem,
  showPrice,
  showCost,
  costCache,
}: Props) {
  const available = getAvailableItems(formData.serviceStyle, formData.season);
  const mains = available.filter((item) => item.category === "main");
  const appetizers = available.filter((item) => item.category === "appetizer");
  const selectedMains = mains.filter((m) =>
    formData.selectedItems.includes(m.id)
  );

  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Select one or more proteins and entrees. We recommend 2-3 options for variety."
        title="Choose your main courses"
      />

      {selectedMains.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg px-4 py-3 text-sm border border-amber-100">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          At least one main course is required.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Main Courses
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mains.map((item) => (
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

      {appetizers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-3">
            Appetizers
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {appetizers.map((item) => (
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
    </div>
  );
}
