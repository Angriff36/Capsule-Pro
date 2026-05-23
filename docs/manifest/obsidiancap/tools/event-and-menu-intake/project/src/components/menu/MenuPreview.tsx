import type { MenuFormData, DishCost } from '../../types/menu';
import { getItemsByIds, groupByCategory, getDietaryLabel } from '../../engine/menuConstraints';
import { CATEGORY_LABELS, CATEGORY_ORDER, MENU_DIRECTIONS } from '../../config/menuCatalog';
import { formatCurrency } from '../../utils/webhookPayload';

interface Props {
  formData: MenuFormData;
  menuStory?: string;
  showPrice?: boolean;
  showCost?: boolean;
  costCache?: Record<string, DishCost>;
  perPersonTotal?: number;
}

export default function MenuPreview({ formData, menuStory, showPrice, showCost, costCache, perPersonTotal }: Props) {
  const items = getItemsByIds(formData.selectedItems);
  const grouped = groupByCategory(items);
  const direction = MENU_DIRECTIONS.find((d: MenuDirection) => d.value === formData.menuDirection);

  return (
    <div className="space-y-6">
      <div className="text-center pb-4 border-b border-stone-200">
        <h3 className="text-xl font-light text-stone-800 tracking-tight">
          {direction ? direction.label : 'Custom'} Menu
        </h3>
        <p className="text-xs text-stone-400 mt-1">
          {formData.guestCount} guests | {formData.season} | {formData.serviceStyle?.replace(/-/g, ' ')}
        </p>
      </div>

      {menuStory && (
        <div className="bg-stone-50 rounded-xl p-5 border border-stone-100">
          <p className="text-sm text-stone-600 leading-relaxed italic">{menuStory}</p>
        </div>
      )}

      {CATEGORY_ORDER.map((cat: string) => {
        const catItems = grouped[cat];
        if (!catItems || catItems.length === 0) return null;
        return (
          <div key={cat}>
            <h4 className="text-xs uppercase tracking-wider text-stone-400 font-medium mb-3 border-b border-stone-100 pb-2">
              {CATEGORY_LABELS[cat]}
            </h4>
            <div className="space-y-3">
              {catItems.map((item: MenuItem) => {
                const cost = costCache?.[item.id];
                const margin = showCost && cost ? item.pricePerPerson - cost.costPerPortion : null;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-stone-800">{item.name}</span>
                        {item.dietaryFlags.map((flag: DietaryFlag) => (
                          <span key={flag} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                            {getDietaryLabel(flag)}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">{item.description}</p>
                      {showCost && cost && (
                        <p className="text-xs text-stone-400 mt-1">
                          COGS: {formatCurrency(cost.costPerPortion)} | Margin: {formatCurrency(margin!)} ({Math.round((margin! / item.pricePerPerson) * 100)}%)
                        </p>
                      )}
                    </div>
                    {showPrice && (
                      <span className="text-xs font-medium text-stone-500 whitespace-nowrap">
                        {formatCurrency(item.pricePerPerson)}/pp
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {showPrice && perPersonTotal !== undefined && (
        <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700">Estimated per person</span>
          <span className="text-lg font-light text-stone-800">{formatCurrency(perPersonTotal)}</span>
        </div>
      )}

      {formData.barService && formData.barService !== 'none' && (
        <div className="text-xs text-stone-400 bg-stone-50 rounded-lg px-4 py-3 border border-stone-100">
          Bar service: {formData.barService.replace(/-/g, ' ')}
        </div>
      )}
    </div>
  );
}
