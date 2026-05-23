import type { MenuFormData, DietaryFlag } from '../../types/menu';
import StepHeader from '../ui/StepHeader';
import ChipToggle from '../ui/ChipToggle';
import { getItemsByIds, getDietaryFullLabel } from '../../engine/menuConstraints';
import { AlertTriangle, Check } from 'lucide-react';
import { Minus, Plus } from 'lucide-react';

const DIETARY_FLAGS: DietaryFlag[] = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free'];

interface Props {
  formData: MenuFormData;
  toggleDietaryNeed: (flag: DietaryFlag) => void;
  updateDietaryCount: (flag: DietaryFlag, count: number) => void;
}

export default function MenuDietaryStep({ formData, toggleDietaryNeed, updateDietaryCount }: Props) {
  const selectedItems = getItemsByIds(formData.selectedItems);
  const selectedMains = selectedItems.filter((item: MenuItem) => item.category === 'main');

  const coverageStatus = DIETARY_FLAGS.map((flag: string) => {
    const needed = formData.dietaryCoverageNeeds.includes(flag);
    const coveredByMain = selectedMains.some((item: MenuItem) => item.dietaryFlags.includes(flag));
    return { flag, needed, coveredByMain };
  });

  const unmetNeeds = coverageStatus.filter(s => s.needed && !s.coveredByMain);

  return (
    <div className="space-y-8">
      <StepHeader
        title="Dietary needs"
        subtitle="Select the dietary requirements your guests have. We will check your menu covers them."
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Which dietary needs should your menu cover?
        </label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_FLAGS.map(flag => (
            <ChipToggle
              key={flag}
              label={getDietaryFullLabel(flag)}
              selected={formData.dietaryCoverageNeeds.includes(flag)}
              onClick={() => toggleDietaryNeed(flag)}
            />
          ))}
        </div>
      </div>

      {formData.dietaryCoverageNeeds.length > 0 && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-stone-700">
            Approximate guest counts per dietary need
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {formData.dietaryCoverageNeeds.map((flag: DietaryFlag) => (
              <div
                key={flag}
                className="flex items-center justify-between bg-stone-50 rounded-lg px-4 py-3 border border-stone-100"
              >
                <span className="text-sm text-stone-700">{getDietaryFullLabel(flag)}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateDietaryCount(flag, formData.dietaryCounts[flag] - 5)}
                    className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium text-stone-800 w-8 text-center">
                    {formData.dietaryCounts[flag]}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDietaryCount(flag, formData.dietaryCounts[flag] + 5)}
                    className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {formData.dietaryCoverageNeeds.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-medium text-stone-700 mb-3">Coverage check</h3>
          <div className="space-y-2">
            {coverageStatus.filter(s => s.needed).map(({ flag, coveredByMain }) => (
              <div key={flag} className="flex items-center gap-2">
                {coveredByMain ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-600" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                  </div>
                )}
                <span className={`text-sm ${coveredByMain ? 'text-stone-600' : 'text-amber-700'}`}>
                  {getDietaryFullLabel(flag)} {coveredByMain ? 'covered by main course' : 'not covered by any main course'}
                </span>
              </div>
            ))}
          </div>

          {unmetNeeds.length > 0 && (
            <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
              Go back and add a main course that is {unmetNeeds.map(n => getDietaryFullLabel(n.flag).toLowerCase()).join(', ')} to ensure all guests are covered.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
