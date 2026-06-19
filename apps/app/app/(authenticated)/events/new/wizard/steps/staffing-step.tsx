"use client";

import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Field, StepHeader } from "../field";
import type { EventWizardData } from "../types";

interface StaffingStepProps {
  data: EventWizardData;
  setField: <K extends keyof EventWizardData>(
    field: K,
    value: EventWizardData[K]
  ) => void;
}

export function StaffingStep({ data, setField }: StaffingStepProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        description="Note service style and staffing expectations. Detailed assignments are made from the event page."
        eyebrow="Step 4 of 6"
        title="Staffing & service"
      />

      <Field
        hint="Service style, ratio targets, bartender/chef needs, setup crew, anything the team should know."
        htmlFor="wiz-notes"
        label="Service & staffing notes"
      >
        <Textarea
          id="wiz-notes"
          onChange={(e) => setField("notes", e.target.value)}
          placeholder="e.g. Plated 3-course dinner, 1 server per 12 guests, 2 bartenders, chef on-site for carving station."
          rows={6}
          value={data.notes}
        />
      </Field>
    </div>
  );
}
