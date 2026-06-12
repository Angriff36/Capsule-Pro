import { Check } from "lucide-react";
import { getDietaryLabel } from "../../engine/menuConstraints";
import type { DishCost, MenuCatalogItem } from "../../types/menu";
import { formatCurrency } from "../../utils/webhookPayload";

interface Props {
  cost?: DishCost;
  item: MenuCatalogItem;
  onToggle: () => void;
  selected: boolean;
  showCost?: boolean;
  showPrice?: boolean;
}

export default function MenuItemCard({
  item,
  selected,
  onToggle,
  showPrice,
  cost,
  showCost,
}: Props) {
  const margin =
    showCost && cost ? item.pricePerPerson - cost.costPerPortion : null;
  const marginPct =
    margin !== null && item.pricePerPerson > 0
      ? Math.round((margin / item.pricePerPerson) * 100)
      : null;

  return (
    <button
      className={`relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? "border-stone-800 bg-stone-800 text-white shadow-lg"
          : "border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:shadow-md"
      }
      `}
      onClick={onToggle}
      type="button"
    >
      {selected && (
        <span className="absolute top-3 right-3">
          <Check className="h-4 w-4" />
        </span>
      )}

      <div className="pr-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-medium text-sm">{item.name}</span>
          {showPrice && (
            <span
              className={`font-medium text-xs ${selected ? "text-stone-300" : "text-stone-400"}`}
            >
              {formatCurrency(item.pricePerPerson)}/pp
            </span>
          )}
        </div>
        <p
          className={`text-xs leading-relaxed ${selected ? "text-stone-300" : "text-stone-400"}`}
        >
          {item.description}
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          {item.dietaryFlags.map((flag) => (
            <span
              className={`rounded px-1.5 py-0.5 font-semibold text-[10px] ${
                selected
                  ? "bg-white/15 text-white/80"
                  : "bg-stone-100 text-stone-500"
              }
              `}
              key={flag}
            >
              {getDietaryLabel(flag)}
            </span>
          ))}
        </div>
      </div>

      {showCost && cost && (
        <div
          className={`mt-3 flex items-center gap-3 border-t pt-3 text-xs ${selected ? "border-white/20 text-stone-300" : "border-stone-100 text-stone-400"}
        `}
        >
          <span>COGS: {formatCurrency(cost.costPerPortion)}</span>
          {margin !== null && (
            <span
              className={
                marginPct !== null && marginPct >= 60 ? "text-emerald-400" : ""
              }
            >
              Margin: {formatCurrency(margin)} ({marginPct}%)
            </span>
          )}
        </div>
      )}
    </button>
  );
}
