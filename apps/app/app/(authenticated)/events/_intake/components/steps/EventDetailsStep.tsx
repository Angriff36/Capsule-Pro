import type { WizardFormData } from '../../types/wizard';
import StepHeader from '../ui/StepHeader';
import SelectCard from '../ui/SelectCard';
import GuestSlider from '../ui/GuestSlider';
import {
  Utensils, GlassWater, Sunset, Coffee,
  Music, Martini,
} from 'lucide-react';

const EVENT_FORMATS = [
  { value: 'seated-dinner', label: 'Seated Dinner', description: 'Formal plated or family-style meal', icon: <Utensils className="w-4 h-4" /> },
  { value: 'cocktail-reception', label: 'Cocktail Reception', description: 'Passed hors d\'oeuvres & stations', icon: <Martini className="w-4 h-4" /> },
  { value: 'brunch', label: 'Brunch / Lunch', description: 'Daytime gathering', icon: <Coffee className="w-4 h-4" /> },
  { value: 'bbq-cookout', label: 'BBQ / Cookout', description: 'Casual outdoor dining', icon: <Sunset className="w-4 h-4" /> },
  { value: 'buffet-party', label: 'Buffet Party', description: 'Self-serve with variety', icon: <GlassWater className="w-4 h-4" /> },
  { value: 'multi-event', label: 'Multi-Part Event', description: 'Ceremony + reception, etc.', icon: <Music className="w-4 h-4" /> },
];

const CERTAINTY_OPTIONS = [
  { value: 'exact', label: 'Pretty exact' },
  { value: 'estimate', label: 'Rough estimate' },
  { value: 'unsure', label: 'Still figuring it out' },
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => void;
}

export default function EventDetailsStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        title="Event format & guest count"
        subtitle="Help us understand the scale and style of your gathering."
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          What format fits your event?
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {EVENT_FORMATS.map(format => (
            <SelectCard
              key={format.value}
              label={format.label}
              description={format.description}
              icon={format.icon}
              selected={formData.eventFormat === format.value}
              onClick={() => updateField('eventFormat', format.value)}
            />
          ))}
        </div>
      </div>

      <GuestSlider
        value={formData.guestCount}
        onChange={v => updateField('guestCount', v)}
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          How confident are you in this number?
        </label>
        <div className="flex flex-wrap gap-3">
          {CERTAINTY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField('guestCountCertainty', opt.value)}
              className={`
                px-5 py-2.5 rounded-full text-sm font-medium border transition-all
                ${formData.guestCountCertainty === opt.value
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
    </div>
  );
}
