"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { Field, StepHeader } from "../field";
import type { EventWizardData } from "../types";

interface BudgetStepProps {
  data: EventWizardData;
  setField: <K extends keyof EventWizardData>(
    field: K,
    value: EventWizardData[K]
  ) => void;
}

export function BudgetStep({ data, setField }: BudgetStepProps) {
  return (
    <div className="space-y-6">
      <StepHeader
        description="Set the target budget and any ticketing details. All amounts are optional for a draft."
        eyebrow="Step 3 of 6"
        title="Budget & ticketing"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          hint="Total target budget for the event."
          htmlFor="wiz-budget"
          label="Budget"
        >
          <Input
            id="wiz-budget"
            min={0}
            onChange={(e) => setField("budget", e.target.value)}
            placeholder="12000"
            type="number"
            value={data.budget}
          />
        </Field>

        <Field htmlFor="wiz-ticketTier" label="Ticket tier">
          <Input
            id="wiz-ticketTier"
            onChange={(e) => setField("ticketTier", e.target.value)}
            placeholder="General Admission"
            value={data.ticketTier}
          />
        </Field>

        <Field
          hint="Per-ticket price. Leave at 0 for non-ticketed events."
          htmlFor="wiz-ticketPrice"
          label="Ticket price"
        >
          <Input
            id="wiz-ticketPrice"
            min={0}
            onChange={(e) => setField("ticketPrice", e.target.value)}
            placeholder="0"
            type="number"
            value={data.ticketPrice}
          />
        </Field>
      </div>
    </div>
  );
}
