import type { WizardFormData } from '../../types/wizard';
import StepHeader from '../ui/StepHeader';
import SelectCard from '../ui/SelectCard';
import TextArea from '../ui/TextArea';
import { Truck, UserCheck, Star, Crown } from 'lucide-react';

const STAFFING_LEVELS = [
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Drop-off and setup only. Your team handles the rest.',
    icon: <Truck className="w-4 h-4" />,
  },
  {
    value: 'standard',
    label: 'Standard Service',
    description: 'Setup, buffet attendants, and cleanup. The essentials covered.',
    icon: <UserCheck className="w-4 h-4" />,
  },
  {
    value: 'elevated',
    label: 'Elevated Service',
    description: 'Dedicated servers, passed apps, and attentive table service.',
    icon: <Star className="w-4 h-4" />,
  },
  {
    value: 'white-glove',
    label: 'White Glove',
    description: 'Full captain-led team. Synchronized courses, formal presentation, floor management.',
    icon: <Crown className="w-4 h-4" />,
  },
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => void;
}

export default function StaffingStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        title="Your service team"
        subtitle="The level of service defines the guest experience. What feels right for your event?"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STAFFING_LEVELS.map(level => (
          <SelectCard
            key={level.value}
            label={level.label}
            description={level.description}
            icon={level.icon}
            selected={formData.staffingLevel === level.value}
            onClick={() => updateField('staffingLevel', level.value)}
          />
        ))}
      </div>

      <TextArea
        label="Any specific staffing needs?"
        value={formData.staffingNotes}
        onChange={(v: string) => updateField('staffingNotes', v)}
        placeholder="e.g., Need a captain for toasts, bartender for 4 hours, server who speaks Spanish..."
        rows={3}
      />
    </div>
  );
}
