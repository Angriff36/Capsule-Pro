"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  Calendar,
  DollarSign,
  ExternalLink,
  MapPin,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { toast } from "sonner";
import type { ResolvedEvent } from "../../types/entities";
import { EditableField, EditableSelectField } from "./editable-field";

// ============================================================================
// Event Detail View — With inline editing
// ============================================================================

interface EventDetailProps {
  data: ResolvedEvent;
  onFieldChange?: (field: string, value: string) => Promise<void>;
}

/** Status options for the select field */
const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "tentative", label: "Tentative" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/** Status → Badge variant mapping */
const statusVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  confirmed: "default",
  tentative: "secondary",
  cancelled: "destructive",
  completed: "secondary",
  draft: "outline",
};

/** Format a date for display using Intl */
function formatDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

/** Format a date for the date input (YYYY-MM-DD) */
function formatDateForInput(date: Date | null): string {
  if (!date) {
    return "";
  }
  const d = new Date(date);
  return d.toISOString().split("T")[0] ?? "";
}

/** Format a time for display using Intl */
function formatTime(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Format currency using Intl */
function formatCurrency(amount: number | null): string | null {
  if (amount == null) {
    return null;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function EventDetail({ data, onFieldChange }: EventDetailProps) {
  const variant = statusVariantMap[data.status] ?? "outline";

  // Handler for field updates
  const handleFieldSave = useCallback(
    async (field: string, value: string) => {
      if (!onFieldChange) {
        toast.error("Editing not available");
        return;
      }

      try {
        await onFieldChange(field, value);
        toast.success("Updated successfully");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update"
        );
        throw error; // Re-throw to let the editable field show the error
      }
    },
    [onFieldChange]
  );

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-2">
        {onFieldChange ? (
          <EditableSelectField
            label="Status"
            onSave={(value) => handleFieldSave("status", value)}
            options={STATUS_OPTIONS}
            value={data.status}
          />
        ) : (
          <Badge variant={variant}>{data.status}</Badge>
        )}
      </div>

      <Separator />

      {/* Date & Time */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="size-4 text-muted-foreground" />
          Date & Time
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          {onFieldChange ? (
            <EditableField
              displayFormatter={() => formatDate(data.eventDate) ?? "Not set"}
              label="Date"
              onSave={(value) => handleFieldSave("eventDate", value)}
              placeholder="Not set"
              type="date"
              value={formatDateForInput(data.eventDate)}
            />
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">
                {formatDate(data.eventDate) ?? "Not set"}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">
              {formatTime(data.eventDate) ?? "Not set"}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Guest & Budget */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <Users className="size-4 text-muted-foreground" />
          Event Details
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          {onFieldChange ? (
            <EditableField
              label="Guests"
              onSave={(value) => handleFieldSave("guestCount", value)}
              placeholder="Not set"
              type="number"
              value={data.guestCount ?? ""}
            />
          ) : (
            data.guestCount != null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Guests</span>
                <span className="font-medium">{data.guestCount}</span>
              </div>
            )
          )}
          {onFieldChange ? (
            <EditableField
              displayFormatter={(v) =>
                v != null && v !== ""
                  ? (formatCurrency(Number(v)) ?? "Not set")
                  : "Not set"
              }
              label="Budget"
              onSave={(value) => handleFieldSave("budget", value)}
              placeholder="Not set"
              type="number"
              value={data.budget ?? ""}
            />
          ) : (
            data.budget != null && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  <DollarSign className="mr-1 inline size-3" />
                  Budget
                </span>
                <span className="font-medium">
                  {formatCurrency(data.budget)}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      <Separator />

      {/* People & Venue */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-medium">
          <User className="size-4 text-muted-foreground" />
          People & Venue
        </h4>
        <div className="grid gap-2 pl-6 text-sm">
          {data.clientName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{data.clientName}</span>
            </div>
          )}
          {data.venueName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                <MapPin className="mr-1 inline size-3" />
                Venue
              </span>
              <span className="font-medium">{data.venueName}</span>
            </div>
          )}
          {data.assignedTo && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assigned To</span>
              <span className="font-medium">{data.assignedTo}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Open Full Page */}
      <Button asChild className="w-full" variant="outline">
        <Link href={`/events/${data.id}`}>
          <ExternalLink className="mr-2 size-4" />
          Open in Events
        </Link>
      </Button>
    </div>
  );
}
