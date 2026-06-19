"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { Field, StepHeader } from "../field";
import type { EventWizardData } from "../types";

interface LogisticsStepProps {
  data: EventWizardData;
  setField: <K extends keyof EventWizardData>(
    field: K,
    value: EventWizardData[K]
  ) => void;
}

export function LogisticsStep({ data, setField }: LogisticsStepProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        description="Where is the event and what does it look like? All fields are optional for a draft."
        eyebrow="Step 5 of 6"
        title="Logistics"
      />

      <div className="grid gap-5">
        <Field htmlFor="wiz-venueName" label="Venue name">
          <Input
            id="wiz-venueName"
            onChange={(e) => setField("venueName", e.target.value)}
            placeholder="The Archive Loft"
            value={data.venueName}
          />
        </Field>

        <Field htmlFor="wiz-venueAddress" label="Venue address">
          <Input
            id="wiz-venueAddress"
            onChange={(e) => setField("venueAddress", e.target.value)}
            placeholder="123 Main St, Chicago"
            value={data.venueAddress}
          />
        </Field>

        <Field htmlFor="wiz-featuredMediaUrl" label="Featured media URL">
          <Input
            id="wiz-featuredMediaUrl"
            onChange={(e) => setField("featuredMediaUrl", e.target.value)}
            placeholder="https://"
            type="url"
            value={data.featuredMediaUrl}
          />
        </Field>
      </div>
    </div>
  );
}
