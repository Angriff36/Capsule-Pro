import type { WizardFormData } from "../../types/wizard";
import StepHeader from "../ui/StepHeader";
import TextArea from "../ui/TextArea";
import TextInput from "../ui/TextInput";

const BUDGET_RANGES = [
  "Under $5,000",
  "$5,000 – $10,000",
  "$10,000 – $25,000",
  "$25,000 – $50,000",
  "$50,000 – $100,000",
  "$100,000+",
  "Not sure yet",
];

const REFERRAL_SOURCES = [
  "Google Search",
  "Instagram",
  "Friend / Colleague",
  "Wedding Planner",
  "Venue Recommendation",
  "Past Client",
  "Other",
];

interface Props {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(
    field: K,
    value: WizardFormData[K]
  ) => void;
}

export default function FinalDetailsStep({ formData, updateField }: Props) {
  return (
    <div className="space-y-8">
      <StepHeader
        subtitle="Just a few more things to help us prepare the best possible experience for you."
        title="Final details"
      />

      <div className="space-y-4 rounded-xl border border-stone-100 bg-stone-50 p-6">
        <h3 className="font-medium text-sm text-stone-700">
          Your contact info
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextInput
            label="Full name"
            onChange={(v) => updateField("contactName", v)}
            placeholder="Jane Smith"
            required
            value={formData.contactName}
          />
          <TextInput
            label="Email"
            onChange={(v) => updateField("email", v)}
            placeholder="jane@example.com"
            required
            type="email"
            value={formData.email}
          />
          <TextInput
            label="Phone (optional)"
            onChange={(v) => updateField("phone", v)}
            placeholder="(555) 123-4567"
            type="tel"
            value={formData.phone}
          />
          <TextInput
            label="Company / Organization (optional)"
            onChange={(v) => updateField("company", v)}
            placeholder="Acme Corp"
            value={formData.company}
          />
        </div>
      </div>

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          Approximate budget range
        </label>
        <div className="flex flex-wrap gap-2">
          {BUDGET_RANGES.map((range) => (
            <button
              className={`rounded-full border px-4 py-2 font-medium text-sm transition-all ${
                formData.budgetRange === range
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
              }
              `}
              key={range}
              onClick={() => updateField("budgetRange", range)}
              type="button"
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-3 block font-medium text-sm text-stone-700">
          How did you hear about us?
        </label>
        <div className="flex flex-wrap gap-2">
          {REFERRAL_SOURCES.map((source) => (
            <button
              className={`rounded-full border px-4 py-2 font-medium text-sm transition-all ${
                formData.referralSource === source
                  ? "border-stone-800 bg-stone-800 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"
              }
              `}
              key={source}
              onClick={() => updateField("referralSource", source)}
              type="button"
            >
              {source}
            </button>
          ))}
        </div>
      </div>

      <TextArea
        label="Anything else we should know?"
        onChange={(v) => updateField("additionalNotes", v)}
        placeholder="Special requests, timing constraints, accessibility needs, must-haves, things you've seen at other events you loved..."
        rows={4}
        value={formData.additionalNotes}
      />
    </div>
  );
}
