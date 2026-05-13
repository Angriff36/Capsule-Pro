import type { MenuFormData, DishCost } from '../../types/menu';
import StepHeader from '../ui/StepHeader';
import MenuItemCard from '../menu/MenuItemCard';
import { getAvailableItems } from '../../engine/menuConstraints';
import { AlertTriangle } from 'lucide-react';

interface Props {
  formData: MenuFormData;
  toggleMenuItem: (id: string) => void;
  showPrice?: boolean;
  showCost?: boolean;
  costCache?: Record<string, DishCost>;
}

export default function MenuSidesStep({ formData, toggleMenuItem, showPrice, showCost, costCache }: Props) {
  const available = getAvailableItems(formData.serviceStyle, formData.season);
  const sides = available.filter(item => item.category === 'side');
  const selectedSides = sides.filter(s => formData.selectedItems.includes(s.id));

  return (
    <div className="space-y-8">
      <StepHeader
        title="Sides & accompaniments"
        subtitle="Pair your mains with complementary sides. We recommend 2-3 options."
      />

      {selectedSides.length === 0 && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg px-4 py-3 text-sm border border-amber-100">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          At least one side is required.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sides.map(item => (
          <MenuItemCard
            key={item.id}
            item={item}
            selected={formData.selectedItems.includes(item.id)}
            onToggle={() => toggleMenuItem(item.id)}
            showPrice={showPrice}
            showCost={showCost}
            cost={costCache?.[item.id]}
          />
        ))}
      </div>
    </div>
  );
}
