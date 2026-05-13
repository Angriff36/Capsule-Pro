import type { WizardFormData } from '../../types/wizard';
import StepHeader from '../ui/StepHeader';
import ChipToggle from '../ui/ChipToggle';
import TextArea from '../ui/TextArea';

const CUISINE_OPTIONS = [
  'American', 'Italian', 'Mediterranean', 'French', 'Asian Fusion',
  'Mexican / Latin', 'Southern / BBQ', 'Seafood', 'Farm-to-Table',
  'Indian', 'Middle Eastern', 'Japanese', 'Open to Suggestions',
];

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut-Free', 'Kosher', 'Halal', 'Keto / Low-Carb',
];

const DIETARY_PERCENTAGES = [
  { value: 'few', label: 'A few guests (< 10%)' },
  { value: 'some', label: 'Some guests (10-25%)' },
  { value: 'many', label: 'Many guests (25-50%)' },
  { value: 'majority', label: 'Most or all guests (50%+)' },
];

interface Props {
  formData: WizardFormData;
  toggleArrayItem: (field: keyof WizardFormData, item: string) => void;
  updateField: <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => void;
}

export default function MenuPreferencesStep({ formData, toggleArrayItem, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        title="Cuisine & dietary needs"
        subtitle="Let us know what flavors excite you and any dietary considerations."
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          What cuisines interest you? Select all that apply.
        </label>
        <div className="flex flex-wrap gap-2">
          {CUISINE_OPTIONS.map(cuisine => (
            <ChipToggle
              key={cuisine}
              label={cuisine}
              selected={formData.cuisinePreferences.includes(cuisine)}
              onClick={() => toggleArrayItem('cuisinePreferences', cuisine)}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Any dietary restrictions to accommodate?
        </label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(diet => (
            <ChipToggle
              key={diet}
              label={diet}
              selected={formData.dietaryNeeds.includes(diet)}
              onClick={() => toggleArrayItem('dietaryNeeds', diet)}
            />
          ))}
        </div>
      </div>

      {formData.dietaryNeeds.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-3">
            What portion of your guests have dietary needs?
          </label>
          <div className="flex flex-wrap gap-3">
            {DIETARY_PERCENTAGES.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateField('dietaryPercentage', opt.value)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium border transition-all
                  ${formData.dietaryPercentage === opt.value
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <TextArea
        label="Menu notes or special requests"
        value={formData.menuNotes}
        onChange={v => updateField('menuNotes', v)}
        placeholder="Any must-have dishes, allergies, cultural considerations, or ideas you'd like us to consider..."
        rows={3}
      />
    </div>
  );
}
