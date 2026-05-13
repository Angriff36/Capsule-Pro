import { Check } from 'lucide-react';
import type { MenuCatalogItem, DishCost } from '../../types/menu';
import { getDietaryLabel } from '../../engine/menuConstraints';
import { formatCurrency } from '../../utils/webhookPayload';

interface Props {
  item: MenuCatalogItem;
  selected: boolean;
  onToggle: () => void;
  showPrice?: boolean;
  cost?: DishCost;
  showCost?: boolean;
}

export default function MenuItemCard({ item, selected, onToggle, showPrice, cost, showCost }: Props) {
  const margin = showCost && cost
    ? item.pricePerPerson - cost.costPerPortion
    : null;
  const marginPct = margin !== null && item.pricePerPerson > 0
    ? Math.round((margin / item.pricePerPerson) * 100)
    : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        relative w-full text-left rounded-xl border-2 p-4 transition-all duration-200
        ${selected
          ? 'border-stone-800 bg-stone-800 text-white shadow-lg'
          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:shadow-md'
        }
      `}
    >
      {selected && (
        <span className="absolute top-3 right-3">
          <Check className="w-4 h-4" />
        </span>
      )}

      <div className="pr-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{item.name}</span>
          {showPrice && (
            <span className={`text-xs font-medium ${selected ? 'text-stone-300' : 'text-stone-400'}`}>
              {formatCurrency(item.pricePerPerson)}/pp
            </span>
          )}
        </div>
        <p className={`text-xs leading-relaxed ${selected ? 'text-stone-300' : 'text-stone-400'}`}>
          {item.description}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          {item.dietaryFlags.map(flag => (
            <span
              key={flag}
              className={`
                text-[10px] font-semibold px-1.5 py-0.5 rounded
                ${selected
                  ? 'bg-white/15 text-white/80'
                  : 'bg-stone-100 text-stone-500'
                }
              `}
            >
              {getDietaryLabel(flag)}
            </span>
          ))}
        </div>
      </div>

      {showCost && cost && (
        <div className={`
          mt-3 pt-3 border-t text-xs flex items-center gap-3
          ${selected ? 'border-white/20 text-stone-300' : 'border-stone-100 text-stone-400'}
        `}>
          <span>COGS: {formatCurrency(cost.costPerPortion)}</span>
          {margin !== null && (
            <span className={marginPct !== null && marginPct >= 60 ? 'text-emerald-400' : ''}>
              Margin: {formatCurrency(margin)} ({marginPct}%)
            </span>
          )}
        </div>
      )}
    </button>
  );
}
