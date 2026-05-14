import {
  Baby,
  Briefcase,
  Building2,
  Cake,
  GraduationCap,
  Heart,
  PartyPopper,
  Users,
} from "lucide-react";
import type { WizardFormData } from "../../types/wizard";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";
import TextArea from "../ui/TextArea";
import TextInput from "../ui/TextInput";

const OCCASION_TYPES = [
  {
    value: "wedding",
    label: "Wedding",
    description: "Ceremony, reception, or both",
    icon: <Heart className="w-4 h-4" />,
  },
  {
    value: "corporate",
    label: "Corporate Event",
    description: "Meetings, galas, retreats",
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    value: "social",
    label: "Social Gathering",
    description: "Dinner party, reunion, holiday",
    icon: <PartyPopper className="w-4 h-4" />,
  },
  {
    value: "milestone",
    label: "Milestone Celebration",
    description: "Birthday, anniversary, retirement",
    icon: <Cake className="w-4 h-4" />,
  },
  {
    value: "nonprofit",
    label: "Nonprofit / Fundraiser",
    description: "Galas, charity events",
    icon: <Users className="w-4 h-4" />,
  },
  {
    value: "graduation",
    label: "Graduation",
    description: "Commencement celebrations",
    icon: <GraduationCap className="w-4 h-4" />,
  },
  {
    value: "baby",
    label: "Baby Shower / Gender Reveal",
    description: "Intimate celebrations",
    icon: <Baby className="w-4 h-4" />,
  },
  {
    value: "other",
    label: "Something Else",
    description: "Tell us more below",
    icon: <Briefcase className="w-4 h-4" />,
  },
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => void;
}

export default function EventVisionStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="We would love to understand the occasion and the feeling you are going for."
        title="Tell us about your event"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {OCCASION_TYPES.map((type) => (
          <SelectCard
            description={type.description}
            icon={type.icon}
            key={type.value}
            label={type.label}
            onClick={() => updateField("occasionType", type.value)}
            selected={formData.occasionType === type.value}
          />
        ))}
      </div>

      <TextInput
        label="Give your event a name (optional)"
        onChange={(v) => updateField("eventName", v)}
        placeholder="e.g., The Anderson Wedding, Annual Team Retreat"
        value={formData.eventName}
      />

      <TextArea
        helpText="Think adjectives, references, or a mood. This helps us tailor our approach."
        label="Describe the vibe you are envisioning"
        onChange={(v) => updateField("vibeDescription", v)}
        placeholder="Rustic elegance with garden-to-table dining... Modern and sleek with craft cocktails... Casual backyard BBQ with a gourmet twist..."
        rows={4}
        value={formData.vibeDescription}
      />
    </div>
  );
}
