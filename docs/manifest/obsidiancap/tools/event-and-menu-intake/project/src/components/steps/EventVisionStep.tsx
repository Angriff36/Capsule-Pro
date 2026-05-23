import type { WizardFormData } from '../../types/wizard';
import StepHeader from '../ui/StepHeader';
import TextInput from '../ui/TextInput';
import TextArea from '../ui/TextArea';
import SelectCard from '../ui/SelectCard';
import {
  Heart, Building2, GraduationCap, PartyPopper,
  Baby, Cake, Users, Briefcase,
} from 'lucide-react';

const OCCASION_TYPES = [
  { value: 'wedding', label: 'Wedding', description: 'Ceremony, reception, or both', icon: <Heart className="w-4 h-4" /> },
  { value: 'corporate', label: 'Corporate Event', description: 'Meetings, galas, retreats', icon: <Building2 className="w-4 h-4" /> },
  { value: 'social', label: 'Social Gathering', description: 'Dinner party, reunion, holiday', icon: <PartyPopper className="w-4 h-4" /> },
  { value: 'milestone', label: 'Milestone Celebration', description: 'Birthday, anniversary, retirement', icon: <Cake className="w-4 h-4" /> },
  { value: 'nonprofit', label: 'Nonprofit / Fundraiser', description: 'Galas, charity events', icon: <Users className="w-4 h-4" /> },
  { value: 'graduation', label: 'Graduation', description: 'Commencement celebrations', icon: <GraduationCap className="w-4 h-4" /> },
  { value: 'baby', label: 'Baby Shower / Gender Reveal', description: 'Intimate celebrations', icon: <Baby className="w-4 h-4" /> },
  { value: 'other', label: 'Something Else', description: 'Tell us more below', icon: <Briefcase className="w-4 h-4" /> },
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => void;
}

export default function EventVisionStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        title="Tell us about your event"
        subtitle="We would love to understand the occasion and the feeling you are going for."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {OCCASION_TYPES.map(type => (
          <SelectCard
            key={type.value}
            label={type.label}
            description={type.description}
            icon={type.icon}
            selected={formData.occasionType === type.value}
            onClick={() => updateField('occasionType', type.value)}
          />
        ))}
      </div>

      <TextInput
        label="Give your event a name (optional)"
        value={formData.eventName}
        onChange={(v: string) => updateField('eventName', v)}
        placeholder="e.g., The Anderson Wedding, Annual Team Retreat"
      />

      <TextArea
        label="Describe the vibe you are envisioning"
        value={formData.vibeDescription}
        onChange={(v: string) => updateField('vibeDescription', v)}
        placeholder="Rustic elegance with garden-to-table dining... Modern and sleek with craft cocktails... Casual backyard BBQ with a gourmet twist..."
        rows={4}
        helpText="Think adjectives, references, or a mood. This helps us tailor our approach."
      />
    </div>
  );
}
