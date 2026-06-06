"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { MapPinIcon, UsersIcon } from "lucide-react";
import { useTransition } from "react";

interface EventEditorModalProps {
  event?: {
    accessibilityOptions?: string[];
    budget?: number | null;
    clientId?: string;
    date?: string;
    description?: string;
    eventFormat?: string | null;
    eventNumber?: string;
    eventType?: string;
    featuredMediaUrl?: string | null;
    guestCount?: number;
    id?: string;
    status?: string;
    tags?: string[];
    ticketPrice?: number | null;
    ticketTier?: string | null;
    title?: string;
    venueAddress?: string;
    venueName?: string;
  };
  onOpenChange: (open: boolean) => void;
  onSave: (data: FormData) => Promise<void>;
  open: boolean;
}

function getSaveButtonLabel(isPending: boolean, hasEventId: boolean): string {
  if (isPending) {
    return "Saving...";
  }
  if (hasEventId) {
    return "Save changes";
  }
  return "Create Event";
}

export const EventEditorModal = ({
  open,
  onOpenChange,
  event,
  onSave,
}: EventEditorModalProps) => {
  const [isPending, startTransition] = useTransition();
  const saveButtonLabel = getSaveButtonLabel(isPending, !!event?.id);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await onSave(formData);
      onOpenChange(false);
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>
            Fill in the event details below. Required fields are marked with an
            asterisk.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-6">
          {event?.id && <input name="eventId" type="hidden" value={event.id} />}

          <div className="grid gap-4 md:grid-cols-2">
            {event?.id && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="eventIdDisplay">Event ID</Label>
                <Input id="eventIdDisplay" readOnly value={event.id} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="eventNumber">Event Number</Label>
              <Input
                defaultValue={event?.eventNumber ?? ""}
                id="eventNumber"
                name="eventNumber"
                placeholder="e.g., EVT-2026-001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                defaultValue={event?.clientId ?? ""}
                id="clientId"
                name="clientId"
                placeholder="Client UUID"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">
                Event Title <span className="text-destructive">*</span>
              </Label>
              <Input
                defaultValue={event?.title ?? ""}
                id="title"
                name="title"
                placeholder="e.g., Summer Cooking Workshop"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                defaultValue={event?.eventType ?? "catering"}
                name="eventType"
              >
                <SelectTrigger id="eventType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "catering",
                    "workshop",
                    "meetup",
                    "corporate",
                    "wedding",
                    "birthday",
                  ].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">
                Event Date <span className="text-destructive">*</span>
              </Label>
              <DatePicker
                defaultValue={event?.date ?? ""}
                id="eventDate"
                name="eventDate"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestCount">
                Guest Count <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <UsersIcon className="absolute top-3 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  defaultValue={event?.guestCount ?? ""}
                  id="guestCount"
                  min="1"
                  name="guestCount"
                  placeholder="e.g., 50"
                  required
                  type="number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select defaultValue={event?.status ?? "confirmed"} name="status">
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "draft",
                    "confirmed",
                    "tentative",
                    "postponed",
                    "completed",
                    "cancelled",
                  ].map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketTier">Ticket Tier</Label>
              <Input
                defaultValue={event?.ticketTier ?? ""}
                id="ticketTier"
                name="ticketTier"
                placeholder="General Admission"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketPrice">Ticket Price</Label>
              <Input
                defaultValue={event?.ticketPrice ?? ""}
                id="ticketPrice"
                min="0"
                name="ticketPrice"
                placeholder="0"
                type="number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                defaultValue={event?.budget ?? ""}
                id="budget"
                min="0"
                name="budget"
                placeholder="0"
                type="number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventFormat">Format</Label>
              <Select
                defaultValue={event?.eventFormat ?? "in_person"}
                name="eventFormat"
              >
                <SelectTrigger id="eventFormat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-person</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="venueName">Venue Name</Label>
              <div className="relative">
                <MapPinIcon className="absolute top-3 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  defaultValue={event?.venueName ?? ""}
                  id="venueName"
                  name="venueName"
                  placeholder="e.g., Grand Ballroom"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="venueAddress">Venue Address</Label>
              <div className="relative">
                <MapPinIcon className="absolute top-3 left-3 size-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  defaultValue={event?.venueAddress ?? ""}
                  id="venueAddress"
                  name="venueAddress"
                  placeholder="e.g., 123 Main St, City, State"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accessibilityOptions">
              Accessibility options (comma separated)
            </Label>
            <Input
              defaultValue={event?.accessibilityOptions?.join(", ") ?? ""}
              id="accessibilityOptions"
              name="accessibilityOptions"
              placeholder="Wheelchair access, ASL interpreter"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="featuredMediaUrl">Featured media URL</Label>
            <Input
              defaultValue={event?.featuredMediaUrl ?? ""}
              id="featuredMediaUrl"
              name="featuredMediaUrl"
              placeholder="https://"
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              defaultValue={event?.description ?? ""}
              id="notes"
              name="notes"
              placeholder="Additional notes for this event..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              defaultValue={
                event?.tags
                  ?.filter((tag) => !tag.startsWith("needs:"))
                  .join(", ") ?? ""
              }
              id="tags"
              name="tags"
              placeholder="e.g., outdoor, formal, lunch"
              type="text"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isPending} type="submit">
              {saveButtonLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
