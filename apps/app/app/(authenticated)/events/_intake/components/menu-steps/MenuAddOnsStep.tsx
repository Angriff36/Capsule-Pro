import type { MenuFormData, DishCost } from '../../types/menu';
import StepHeader from '../ui/StepHeader';
import SelectCard from '../ui/SelectCard';
import MenuItemCard from '../menu/MenuItemCard';
import { getAvailableItems } from '../../engine/menuConstraints';
import { Beer, Wine, Martini, GlassWater, CircleOff } from 'lucide-react';

const BAR_OPTIONS = [
  { value: 'none', label: 'No Bar', description: 'Food only', icon: <CircleOff className="w-4 h-4" /> },
  { value: 'beer-wine', label: 'Beer & Wine', description: 'Curated selection', icon: <Beer className="w-4 h-4" /> },
  { value: 'full-bar', label: 'Full Bar', description: 'Standard spirits, beer, wine', icon: <GlassWater className="w-4 h-4" /> },
  { value: 'premium-bar', label: 'Premium Bar', description: 'Top-shelf & craft cocktails', icon: <Martini className="w-4 h-4" /> },
  { value: 'byob-service', label: 'BYOB', description: 'You supply, we bartend', icon: <Wine className="w-4 h-4" /> },
];

interface Props {
  formData: MenuFormData;
  updateField: <K extends keyof MenuFormData>(field: K, value: MenuFormData[K]) => void;
  toggleMenuItem: (id: string) => void;
  showPrice?: boolean;
  showCost?: boolean;
  costCache?: Record<string, DishCost>;
}

export default function MenuAddOnsStep({ formData, updateField, toggleMenuItem, showPrice, showCost, costCache }: Props) {
  const available = getAvailableItems(formData.serviceStyle, formData.season);
  const desserts = available.filter(item => item.category === 'dessert');
  const lateNight = available.filter(item => item.category === 'late-night');

  return (
    <div className="space-y-8">
      <StepHeader
        title="Finishing touches"
        subtitle="Dessert, late-night bites, and bar service to round out the experience."
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Desserts
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {desserts.map(item => (
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

      {lateNight.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-3">
            Late Night Bites
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lateNight.map(item => (
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
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Bar service
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {BAR_OPTIONS.map(opt => (
            <SelectCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              icon={opt.icon}
              selected={formData.barService === opt.value}
              onClick={() => updateField('barService', opt.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
