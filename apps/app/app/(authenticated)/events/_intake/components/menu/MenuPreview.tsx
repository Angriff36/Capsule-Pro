import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  MENU_DIRECTIONS,
} from "../../config/menuCatalog";
import {
  getDietaryLabel,
  getItemsByIds,
  groupByCategory,
} from "../../engine/menuConstraints";
import type { DishCost, MenuFormData } from "../../types/menu";
import { formatCurrency } from "../../utils/webhookPayload";

interface Props {
  costCache?: Record<string, DishCost>;
  formData: MenuFormData;
  menuStory?: string;
  perPersonTotal?: number;
  showCost?: boolean;
  showPrice?: boolean;
}

export default function MenuPreview({
  formData,
  menuStory,
  showPrice,
  showCost,
  costCache,
  perPersonTotal,
}: Props) {
  const items = getItemsByIds(formData.selectedItems);
  const grouped = groupByCategory(items);
  const direction = MENU_DIRECTIONS.find(
    (d) => d.value === formData.menuDirection
  );

  return (
    <div className="space-y-6">
      <div className="border-stone-200 border-b pb-4 text-center">
        <h3 className="font-light text-stone-800 text-xl tracking-tight">
          {direction ? direction.label : "Custom"} Menu
        </h3>
        <p className="mt-1 text-stone-400 text-xs">
          {formData.guestCount} guests | {formData.season} |{" "}
          {formData.serviceStyle?.replace(/-/g, " ")}
        </p>
      </div>

      {menuStory && (
        <div className="rounded-xl border border-stone-100 bg-stone-50 p-5">
          <p className="text-sm text-stone-600 italic leading-relaxed">
            {menuStory}
          </p>
        </div>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const catItems = grouped[cat];
        if (!catItems || catItems.length === 0) {
          return null;
        }
        return (
          <div key={cat}>
            <h4 className="mb-3 border-stone-100 border-b pb-2 font-medium text-stone-400 text-xs uppercase tracking-wider">
              {CATEGORY_LABELS[cat]}
            </h4>
            <div className="space-y-3">
              {catItems.map((item) => {
                const cost = costCache?.[item.id];
                const margin =
                  showCost && cost
                    ? item.pricePerPerson - cost.costPerPortion
                    : null;
                return (
                  <div
                    className="flex items-start justify-between gap-4"
                    key={item.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm text-stone-800">
                          {item.name}
                        </span>
                        {item.dietaryFlags.map((flag) => (
                          <span
                            className="rounded bg-stone-100 px-1.5 py-0.5 font-semibold text-[10px] text-stone-500"
                            key={flag}
                          >
                            {getDietaryLabel(flag)}
                          </span>
                        ))}
                      </div>
                      <p className="mt-0.5 text-stone-400 text-xs">
                        {item.description}
                      </p>
                      {showCost && cost && (
                        <p className="mt-1 text-stone-400 text-xs">
                          COGS: {formatCurrency(cost.costPerPortion)} | Margin:{" "}
                          {formatCurrency(margin!)} (
                          {Math.round((margin! / item.pricePerPerson) * 100)}%)
                        </p>
                      )}
                    </div>
                    {showPrice && (
                      <span className="whitespace-nowrap font-medium text-stone-500 text-xs">
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
        <div className="flex items-center justify-between border-stone-200 border-t pt-4">
          <span className="font-medium text-sm text-stone-700">
            Estimated per person
          </span>
          <span className="font-light text-lg text-stone-800">
            {formatCurrency(perPersonTotal)}
          </span>
        </div>
      )}

      {formData.barService && formData.barService !== "none" && (
        <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3 text-stone-400 text-xs">
          Bar service: {formData.barService.replace(/-/g, " ")}
        </div>
      )}
    </div>
  );
}
