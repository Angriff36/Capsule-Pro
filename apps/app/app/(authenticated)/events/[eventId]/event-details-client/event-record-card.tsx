"use client";

import type { Event } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { CopyIcon, PencilIcon } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { InlineEditField } from "@/app/components/inline-edit-field";

type EventRecord = Omit<Event, "budget" | "ticketPrice"> & {
  budget: number | null;
  ticketPrice: number | null;
};

interface EventRecordCardProps {
  event: EventRecord;
  onEditEvent: () => void;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) {
    return "Not set";
  }
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Not set";
  }
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatList(value: string[] | null | undefined): string {
  if (!value || value.length === 0) {
    return "None";
  }
  return value.join(", ");
}

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }
  return String(value);
}

async function copyValue(label: string, value: string | null | undefined) {
  if (!value) {
    toast.error(`${label} is not set`);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Unable to copy ${label.toLowerCase()}`);
  }
}

function DetailItem({
  label,
  value,
  valueNode,
  copyValue: copyableValue,
  className,
}: {
  label: string;
  value: string;
  /** When provided, renders instead of the plain `value` text (e.g. an inline editor). */
  valueNode?: ReactNode;
  copyValue?: string | null;
  className?: string;
}) {
  const isCopyable = copyableValue !== undefined;

  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border border-border/70 bg-muted/35 p-3",
        className
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="font-medium text-[11px] text-muted-foreground uppercase">
          {label}
        </div>
        {isCopyable && (
          <Button
            aria-label={`Copy ${label}`}
            className="size-7 shrink-0"
            onClick={() => copyValue(label, copyableValue)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <CopyIcon className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="break-words font-mono text-foreground text-xs">
        {valueNode ?? value}
      </div>
    </div>
  );
}

export function EventRecordCard({ event, onEditEvent }: EventRecordCardProps) {
  const detailRows = [
    {
      label: "Tenant ID",
      value: formatValue(event.tenantId),
      copyValue: event.tenantId,
    },
    {
      label: "Client ID",
      value: formatValue(event.clientId),
      copyValue: event.clientId,
    },
    {
      label: "Location ID",
      value: formatValue(event.locationId),
      copyValue: event.locationId,
    },
    {
      label: "Venue ID",
      value: formatValue(event.venueId),
      copyValue: event.venueId,
    },
    {
      label: "Venue Entity ID",
      value: formatValue(event.venueEntityId),
      copyValue: event.venueEntityId,
    },
    {
      label: "Assigned To",
      value: formatValue(event.assignedTo),
      copyValue: event.assignedTo,
    },
    {
      label: "Template ID",
      value: formatValue(event.templateId),
      copyValue: event.templateId,
    },
    { label: "Deleted At", value: formatDateTime(event.deletedAt) },
  ];

  return (
    <Card className="border-border/70 bg-card/80" tone="canvas">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize" variant="outline">
              {event.status}
            </Badge>
            <Badge variant="secondary">{event.eventType}</Badge>
          </div>
          <CardTitle className="text-xl">Event details</CardTitle>
        </div>
        <Button onClick={onEditEvent} type="button">
          <PencilIcon className="mr-2 size-4" />
          Edit details
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem
            className="md:col-span-2"
            copyValue={event.id}
            label="Event ID"
            value={event.id}
          />
          <DetailItem
            copyValue={event.eventNumber}
            label="Event Number"
            value={formatValue(event.eventNumber)}
          />
          <DetailItem
            label="Event Date"
            value={formatDate(event.eventDate)}
            valueNode={
              <InlineEditField
                command="updateDate"
                display={formatDate(event.eventDate)}
                entity="Event"
                field="newEventDate"
                id={event.id}
                label="Event Date"
                type="date"
                value={event.eventDate}
              />
            }
          />
          <DetailItem
            className="md:col-span-2"
            label="Title"
            value={event.title}
          />
          <DetailItem
            label="Guest Count"
            value={formatValue(event.guestCount)}
            valueNode={
              <InlineEditField
                command="updateGuestCount"
                display={formatValue(event.guestCount)}
                entity="Event"
                field="newGuestCount"
                id={event.id}
                label="Guest Count"
                type="number"
                value={event.guestCount}
              />
            }
          />
          <DetailItem
            label="Max Capacity"
            value={formatValue(event.maxCapacity)}
          />
          <DetailItem label="Budget" value={formatMoney(event.budget)} />
          <DetailItem
            label="Ticket Price"
            value={formatMoney(event.ticketPrice)}
          />
          <DetailItem
            label="Ticket Tier"
            value={formatValue(event.ticketTier)}
          />
          <DetailItem label="Format" value={formatValue(event.eventFormat)} />
          <DetailItem
            className="md:col-span-2"
            label="Venue Name"
            value={formatValue(event.venueName)}
          />
          <DetailItem
            className="md:col-span-2"
            label="Venue Address"
            value={formatValue(event.venueAddress)}
          />
          <DetailItem
            className="md:col-span-2"
            label="Accessibility Options"
            value={formatList(event.accessibilityOptions)}
          />
          <DetailItem
            className="md:col-span-2"
            label="Featured Media URL"
            value={formatValue(event.featuredMediaUrl)}
          />
          <DetailItem
            className="md:col-span-2"
            label="Notes"
            value={formatValue(event.notes)}
          />
          <DetailItem
            className="md:col-span-2"
            label="Tags"
            value={formatList(event.tags)}
          />
          <DetailItem
            label="Created At"
            value={formatDateTime(event.createdAt)}
          />
          <DetailItem
            label="Updated At"
            value={formatDateTime(event.updatedAt)}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {detailRows.map((row) => (
            <DetailItem
              copyValue={row.copyValue}
              key={row.label}
              label={row.label}
              value={row.value}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
