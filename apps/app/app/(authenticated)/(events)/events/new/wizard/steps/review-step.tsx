"use client";

import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  CalendarDaysIcon,
  DollarSignIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react";
import { parseISODateToLocal } from "../../../../../../lib/format";
import { StepHeader } from "../field";
import type { EventWizardData } from "../types";

interface ReviewStepProps {
  completionPercent: number;
  data: EventWizardData;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right font-medium text-foreground text-sm">
        {value || "—"}
      </span>
    </div>
  );
}

export function ReviewStep({ completionPercent, data }: ReviewStepProps) {
  const date = data.eventDate ? parseISODateToLocal(data.eventDate) : null;

  return (
    <div className="space-y-6">
      <StepHeader
        description="Confirm the details below. Your draft is already saved — confirming transitions it onto the active roster."
        eyebrow="Step 6 of 6"
        title="Review & confirm"
      />

      <Card className="bg-muted/30" tone="canvas">
        <CardContent className="space-y-1 p-5">
          <Row label="Title" value={data.title} />
          <Row label="Type" value={data.eventType} />
          <Row
            label="Date"
            value={
              date
                ? date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : null
            }
          />
          <Row
            label="Guests"
            value={
              Number(data.guestCount) > 0 ? `${data.guestCount} guests` : null
            }
          />
          <Row
            label="Format"
            value={data.eventFormat ? data.eventFormat.replace("_", " ") : null}
          />
          <Row
            label="Cuisine tags"
            value={data.tags.length > 0 ? data.tags.join(", ") : null}
          />
          <Row
            label="Dietary"
            value={
              data.accessibilityOptions.length > 0
                ? data.accessibilityOptions.join(", ")
                : null
            }
          />
          <Row
            label="Budget"
            value={
              data.budget ? `$${Number(data.budget).toLocaleString()}` : null
            }
          />
          <Row
            label="Ticket price"
            value={
              data.ticketPrice
                ? `$${Number(data.ticketPrice).toLocaleString()}`
                : null
            }
          />
          <Row label="Venue" value={data.venueName} />
          <Row label="Address" value={data.venueAddress} />
        </CardContent>
      </Card>

      <div className="border-border border-t pt-4">
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          {data.venueName ? (
            <MapPinIcon className="size-4 shrink-0" />
          ) : (
            <CalendarDaysIcon className="size-4 shrink-0" />
          )}
          <UsersIcon className="size-4 shrink-0" />
          <DollarSignIcon className="size-4 shrink-0" />
          <span>
            Setup completion:{" "}
            <strong className="text-foreground">{completionPercent}%</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
