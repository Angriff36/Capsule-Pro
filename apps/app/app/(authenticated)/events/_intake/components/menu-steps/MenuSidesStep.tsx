import { AlertTriangle } from "lucide-react";
import { getAvailableItems } from "../../engine/menuConstraints";
import type { DishCost, MenuFormData } from "../../types/menu";
import MenuItemCard from "../menu/MenuItemCard";
import StepHeader from "../ui/StepHeader";

interface Props {
  costCache?: Record<string, DishCost>;
  formData: MenuFormData;
  showCost?: boolean;
  showPrice?: boolean;
  toggleMenuItem: (id: string) => void;
}

export default function MenuSidesStep({
  formData,
  toggleMenuItem,
  showPrice,
  showCost,
  costCache,
}: Props) {
  const available = getAvailableItems(formData.serviceStyle, formData.season);
  const sides = available.filter((item) => item.category === "side");
  const selectedSides = sides.filter((s) =>
    formData.selectedItems.includes(s.id)
  );

  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Pair your mains with complementary sides. We recommend 2-3 options."
        title="Sides & accompaniments"
      />

      {selectedSides.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-amber-700 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          At least one side is required.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {sides.map((item) => (
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
  );
}
