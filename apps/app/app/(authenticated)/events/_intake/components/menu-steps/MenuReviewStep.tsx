import type { MenuFormData, DishCost, MenuConstraintResult } from '../../types/menu';
import StepHeader from '../ui/StepHeader';
import MenuPreview from '../menu/MenuPreview';
import MenuExport from '../menu/MenuExport';
import { validateMenuSelection } from '../../engine/menuConstraints';
import { AlertTriangle, Info } from 'lucide-react';

interface Props {
  formData: MenuFormData;
  menuStory?: string;
  isGeneratingStory?: boolean;
  showPrice?: boolean;
  showCost?: boolean;
  costCache?: Record<string, DishCost>;
  perPersonTotal?: number;
  onGenerateStory?: () => void;
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
        title="Review your menu"
        subtitle="Here is the complete menu you have composed. Export or share it below."
      />

      {validation.errors.length > 0 && (
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 space-y-2">
          {validation.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-rose-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {err}
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 space-y-2">
          {validation.warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {warn}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <MenuPreview
          formData={formData}
          menuStory={menuStory}
          showPrice={showPrice}
          showCost={showCost}
          costCache={costCache}
          perPersonTotal={perPersonTotal}
        />
      </div>

      {onGenerateStory && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGenerateStory}
            disabled={isGeneratingStory}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${isGeneratingStory
                ? 'bg-stone-200 text-stone-400 cursor-wait'
                : 'border border-stone-200 text-stone-700 hover:bg-stone-50'
              }
            `}
          >
            {isGeneratingStory ? 'Generating...' : menuStory ? 'Regenerate Menu Story' : 'Generate Menu Story'}
          </button>
          <span className="text-xs text-stone-400">
            AI-generated narrative for the selected menu
          </span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">Export</label>
        <MenuExport formData={formData} menuStory={menuStory} />
      </div>
    </div>
  );
}
