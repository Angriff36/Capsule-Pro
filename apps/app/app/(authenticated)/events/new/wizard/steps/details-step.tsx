"use client";

import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { Input } from "@repo/design-system/components/ui/input";
import { Field, StepHeader } from "../field";
import type { EventWizardData } from "../types";

interface DetailsStepProps {
  data: EventWizardData;
  setField: <K extends keyof EventWizardData>(
    field: K,
    value: EventWizardData[K]
  ) => void;
}

const EVENT_TYPES = [
  "catering",
  "wedding",
  "corporate",
  "social",
  "birthday",
  "holiday",
  "conference",
  "tasting",
  "vip",
  "general",
];

export function DetailsStep({ data, setField }: DetailsStepProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        description="Tell us the basics. You can refine every field later."
        eyebrow="Step 1 of 6"
        title="Event details"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field htmlFor="wiz-title" label="Title" required>
          <Input
            id="wiz-title"
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Company holiday party"
            value={data.title}
          />
        </Field>

        <Field htmlFor="wiz-eventType" label="Event type" required>
          <select
            className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]"
            id="wiz-eventType"
            onChange={(e) => setField("eventType", e.target.value)}
            value={data.eventType}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </Field>

        <Field htmlFor="wiz-eventDate" label="Event date" required>
          <DatePicker
            id="wiz-eventDate"
            onChange={(e) => setField("eventDate", e.target.value)}
            required
            value={data.eventDate}
          />
        </Field>

        <Field htmlFor="wiz-guestCount" label="Guest count" required>
          <Input
            id="wiz-guestCount"
            min={1}
            onChange={(e) => setField("guestCount", e.target.value)}
            type="number"
            value={data.guestCount}
          />
        </Field>

        <Field htmlFor="wiz-eventFormat" label="Format">
          <select
            className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]"
            id="wiz-eventFormat"
            onChange={(e) => setField("eventFormat", e.target.value)}
            value={data.eventFormat}
          >
            <option value="in_person">In-person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </Field>
      </div>

      <p className="text-muted-foreground text-xs">
        This event starts as a <strong>draft</strong> and stays hidden from the
        active roster until you confirm it in the final step.
      </p>
    </div>
  );
}
