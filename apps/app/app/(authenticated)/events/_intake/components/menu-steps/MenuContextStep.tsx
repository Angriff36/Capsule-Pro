import {
  Briefcase,
  Building2,
  Cake,
  Flower2,
  Heart,
  Leaf,
  PartyPopper,
  Snowflake,
  Sun,
  Users,
} from "lucide-react";
import type { MenuFormData, Season } from "../../types/menu";
import GuestSlider from "../ui/GuestSlider";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";

const OCCASION_TYPES = [
  { value: "wedding", label: "Wedding", icon: <Heart className="w-4 h-4" /> },
  {
    value: "corporate",
    label: "Corporate",
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    value: "social",
    label: "Social",
    icon: <PartyPopper className="w-4 h-4" />,
  },
  {
    value: "milestone",
    label: "Milestone",
    icon: <Cake className="w-4 h-4" />,
  },
  {
    value: "nonprofit",
    label: "Nonprofit",
    icon: <Users className="w-4 h-4" />,
  },
  { value: "other", label: "Other", icon: <Briefcase className="w-4 h-4" /> },
];

const SEASONS: { value: Season; label: string; icon: React.ReactNode }[] = [
  { value: "spring", label: "Spring", icon: <Flower2 className="w-4 h-4" /> },
  { value: "summer", label: "Summer", icon: <Sun className="w-4 h-4" /> },
  { value: "fall", label: "Fall", icon: <Leaf className="w-4 h-4" /> },
  { value: "winter", label: "Winter", icon: <Snowflake className="w-4 h-4" /> },
];

interface Props {
  formData: MenuFormData;
  updateField: <K extends keyof MenuFormData>(
    field: K,
    value: MenuFormData[K]
  ) => void;
}

export default function MenuContextStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Help us understand the event so we can shape a menu that fits."
        title="Set the scene"
      />

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          What is the occasion?
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {OCCASION_TYPES.map((t) => (
            <SelectCard
              icon={t.icon}
              key={t.value}
              label={t.label}
              onClick={() => updateField("occasionType", t.value)}
              selected={formData.occasionType === t.value}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          What season is the event?
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SEASONS.map((s) => (
            <SelectCard
              icon={s.icon}
              key={s.value}
              label={s.label}
              onClick={() => updateField("season", s.value)}
              selected={formData.season === s.value}
            />
          ))}
        </div>
      </div>

      <GuestSlider
        onChange={(v) => updateField("guestCount", v)}
        value={formData.guestCount}
      />
    </div>
  );
}
