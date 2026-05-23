import type { WizardFormData } from '../../types/wizard';
import StepHeader from '../ui/StepHeader';
import TextInput from '../ui/TextInput';
import TextArea from '../ui/TextArea';

const BUDGET_RANGES = [
  'Under $5,000',
  '$5,000 – $10,000',
  '$10,000 – $25,000',
  '$25,000 – $50,000',
  '$50,000 – $100,000',
  '$100,000+',
  'Not sure yet',
];

const REFERRAL_SOURCES = [
  'Google Search',
  'Instagram',
  'Friend / Colleague',
  'Wedding Planner',
  'Venue Recommendation',
  'Past Client',
  'Other',
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => void;
}

export default function FinalDetailsStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        title="Final details"
        subtitle="Just a few more things to help us prepare the best possible experience for you."
      />

      <div className="bg-stone-50 rounded-xl p-6 border border-stone-100 space-y-4">
        <h3 className="text-sm font-medium text-stone-700">Your contact info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextInput
            label="Full name"
            value={formData.contactName}
            onChange={(v: string) => updateField('contactName', v)}
            placeholder="Jane Smith"
            required
          />
          <TextInput
            label="Email"
            value={formData.email}
            onChange={(v: string) => updateField('email', v)}
            placeholder="jane@example.com"
            type="email"
            required
          />
          <TextInput
            label="Phone (optional)"
            value={formData.phone}
            onChange={(v: string) => updateField('phone', v)}
            placeholder="(555) 123-4567"
            type="tel"
          />
          <TextInput
            label="Company / Organization (optional)"
            value={formData.company}
            onChange={(v: string) => updateField('company', v)}
            placeholder="Acme Corp"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Approximate budget range
        </label>
        <div className="flex flex-wrap gap-2">
          {BUDGET_RANGES.map(range => (
            <button
              key={range}
              type="button"
              onClick={() => updateField('budgetRange', range)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium border transition-all
                ${formData.budgetRange === range
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }
              `}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          How did you hear about us?
        </label>
        <div className="flex flex-wrap gap-2">
          {REFERRAL_SOURCES.map(source => (
            <button
              key={source}
              type="button"
              onClick={() => updateField('referralSource', source)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium border transition-all
                ${formData.referralSource === source
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }
              `}
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      <TextArea
        label="Anything else we should know?"
        value={formData.additionalNotes}
        onChange={(v: string) => updateField('additionalNotes', v)}
        placeholder="Special requests, timing constraints, accessibility needs, must-haves, things you've seen at other events you loved..."
        rows={4}
      />
    </div>
  );
}
