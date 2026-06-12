import { Crown, Star, Truck, UserCheck } from "lucide-react";
import type { WizardFormData } from "../../types/wizard";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";
import TextArea from "../ui/TextArea";

const STAFFING_LEVELS = [
  {
    value: "minimal",
    label: "Minimal",
    description: "Drop-off and setup only. Your team handles the rest.",
    icon: <Truck className="h-4 w-4" />,
  },
  {
    value: "standard",
    label: "Standard Service",
    description:
      "Setup, buffet attendants, and cleanup. The essentials covered.",
    icon: <UserCheck className="h-4 w-4" />,
  },
  {
    value: "elevated",
    label: "Elevated Service",
    description: "Dedicated servers, passed apps, and attentive table service.",
    icon: <Star className="h-4 w-4" />,
  },
  {
    value: "white-glove",
    label: "White Glove",
    description:
      "Full captain-led team. Synchronized courses, formal presentation, floor management.",
    icon: <Crown className="h-4 w-4" />,
  },
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => void;
}

export default function StaffingStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="The level of service defines the guest experience. What feels right for your event?"
        title="Your service team"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {STAFFING_LEVELS.map((level) => (
          <SelectCard
            description={level.description}
            icon={level.icon}
            key={level.value}
            label={level.label}
            onClick={() => updateField("staffingLevel", level.value)}
            selected={formData.staffingLevel === level.value}
          />
        ))}
      </div>

      <TextArea
        label="Any specific staffing needs?"
        onChange={(v) => updateField("staffingNotes", v)}
        placeholder="e.g., Need a captain for toasts, bartender for 4 hours, server who speaks Spanish..."
        rows={3}
        value={formData.staffingNotes}
      />
    </div>
  );
}
