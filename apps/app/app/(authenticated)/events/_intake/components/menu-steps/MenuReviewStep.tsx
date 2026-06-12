import { AlertTriangle, Info } from "lucide-react";
import { validateMenuSelection } from "../../engine/menuConstraints";
import type {
  DishCost,
  MenuConstraintResult,
  MenuFormData,
} from "../../types/menu";
import MenuExport from "../menu/MenuExport";
import MenuPreview from "../menu/MenuPreview";
import StepHeader from "../ui/StepHeader";

interface Props {
  costCache?: Record<string, DishCost>;
  formData: MenuFormData;
  isGeneratingStory?: boolean;
  menuStory?: string;
  onGenerateStory?: () => void;
  perPersonTotal?: number;
  showCost?: boolean;
  showPrice?: boolean;
}

export default function MenuReviewStep({
  formData,
  menuStory,
  isGeneratingStory,
  showPrice,
  showCost,
  costCache,
  perPersonTotal,
  onGenerateStory,
}: Props) {
  const validation: MenuConstraintResult = validateMenuSelection(formData);

  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Here is the complete menu you have composed. Export or share it below."
        title="Review your menu"
      />

      {validation.errors.length > 0 && (
        <div className="space-y-2 rounded-xl border border-rose-100 bg-rose-50 p-4">
          {validation.errors.map((err, i) => (
            <div
              className="flex items-start gap-2 text-rose-700 text-sm"
              key={i}
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {err}
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-4">
          {validation.warnings.map((warn, i) => (
            <div
              className="flex items-start gap-2 text-amber-700 text-sm"
              key={i}
            >
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {warn}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <MenuPreview
          costCache={costCache}
          formData={formData}
          menuStory={menuStory}
          perPersonTotal={perPersonTotal}
          showCost={showCost}
          showPrice={showPrice}
        />
      </div>

      {onGenerateStory && (
        <div className="flex items-center gap-3">
          <button
            className={`rounded-lg px-4 py-2 font-medium text-sm transition-all ${
              isGeneratingStory
                ? "cursor-wait bg-stone-200 text-stone-400"
                : "border border-stone-200 text-stone-700 hover:bg-stone-50"
            }
            `}
            disabled={isGeneratingStory}
            onClick={onGenerateStory}
            type="button"
          >
            {isGeneratingStory
              ? "Generating..."
              : menuStory
                ? "Regenerate Menu Story"
                : "Generate Menu Story"}
          </button>
          <span className="text-stone-400 text-xs">
            AI-generated narrative for the selected menu
          </span>
        </div>
      )}

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          Export
        </label>
        <MenuExport formData={formData} menuStory={menuStory} />
      </div>
    </div>
  );
}
