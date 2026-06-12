import {
  Building,
  Church,
  Home,
  Hotel,
  TreePine,
  Warehouse,
} from "lucide-react";
import type { WizardFormData } from "../../types/wizard";
import SelectCard from "../ui/SelectCard";
import StepHeader from "../ui/StepHeader";
import TextInput from "../ui/TextInput";

const VENUE_TYPES = [
  {
    value: "banquet-hall",
    label: "Banquet Hall",
    icon: <Building className="h-4 w-4" />,
  },
  {
    value: "private-home",
    label: "Private Home",
    icon: <Home className="h-4 w-4" />,
  },
  {
    value: "outdoor",
    label: "Outdoor / Garden",
    icon: <TreePine className="h-4 w-4" />,
  },
  {
    value: "warehouse-loft",
    label: "Warehouse / Loft",
    icon: <Warehouse className="h-4 w-4" />,
  },
  {
    value: "religious",
    label: "Religious Venue",
    icon: <Church className="h-4 w-4" />,
  },
  {
    value: "hotel",
    label: "Hotel / Resort",
    icon: <Hotel className="h-4 w-4" />,
  },
];

const FLEXIBILITY_OPTIONS = [
  { value: "firm", label: "Date is set" },
  { value: "flexible", label: "Slightly flexible" },
  { value: "open", label: "Wide open" },
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => void;
}

export default function LogisticsStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Date, venue, and location help us confirm availability and plan for your event."
        title="Logistics"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block font-medium text-sm text-stone-700">
            Event date
          </label>
          <input
            className="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 transition-all focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-100"
            onChange={(e) => updateField("eventDate", e.target.value)}
            type="date"
            value={formData.eventDate}
          />
        </div>
        <div>
          <label className="mb-1.5 block font-medium text-sm text-stone-700">
            Date flexibility
          </label>
          <div className="mt-1 flex gap-2">
            {FLEXIBILITY_OPTIONS.map((opt) => (
              <button
                className={`flex-1 rounded-lg border px-3 py-3 font-medium text-sm transition-all ${
                  formData.dateFlexibility === opt.value
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
                }
                `}
                key={opt.value}
                onClick={() => updateField("dateFlexibility", opt.value)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          Venue type
        </label>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {VENUE_TYPES.map((venue) => (
            <SelectCard
              icon={venue.icon}
              key={venue.value}
              label={venue.label}
              onClick={() => updateField("venueType", venue.value)}
              selected={formData.venueType === venue.value}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextInput
          label="Venue name (if known)"
          onChange={(v) => updateField("venueName", v)}
          placeholder="e.g., The Grand Ballroom"
          value={formData.venueName}
        />
        <TextInput
          label="City or area"
          onChange={(v) => updateField("city", v)}
          placeholder="e.g., Austin, TX"
          value={formData.city}
        />
      </div>
    </div>
  );
}
