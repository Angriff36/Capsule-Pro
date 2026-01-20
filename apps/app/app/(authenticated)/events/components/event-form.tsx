import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Event } from "@repo/database";
import { eventStatuses } from "../constants";

type EventFormProps = {
  event?: Event | null;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

const formatDateValue = (value?: Date | null): string => {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
};

const formatDecimalValue = (
  value: Event["budget"] | null | undefined,
): string => {
  if (!value) {
    return "";
  }

  return value.toString();
};

export const EventForm = ({ event, action, submitLabel }: EventFormProps) => (
  <form action={action} className="flex flex-col gap-6">
    {event?.id ? <input name="eventId" type="hidden" value={event.id} /> : null}
    <div className="grid gap-6 md:grid-cols-2">
      <label className="flex flex-col gap-2 font-medium text-sm">
        Title
        <Input
          defaultValue={event?.title ?? ""}
          name="title"
          placeholder="Company holiday party"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Event type
        <Input
          defaultValue={event?.eventType ?? ""}
          name="eventType"
          placeholder="catering"
          required
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Event date
        <Input
          defaultValue={formatDateValue(event?.eventDate)}
          name="eventDate"
          type="date"
          required
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Status
        <select
          className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]"
          defaultValue={event?.status ?? "confirmed"}
          name="status"
        >
          {eventStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Guest count
        <Input
          defaultValue={event?.guestCount ?? 1}
          min={1}
          name="guestCount"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Budget
        <Input
          defaultValue={formatDecimalValue(event?.budget)}
          name="budget"
          placeholder="12000"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm md:col-span-2">
        Venue name
        <Input
          defaultValue={event?.venueName ?? ""}
          name="venueName"
          placeholder="The Archive Loft"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm md:col-span-2">
        Venue address
        <Input
          defaultValue={event?.venueAddress ?? ""}
          name="venueAddress"
          placeholder="123 Main St, Chicago"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm md:col-span-2">
        Tags (comma separated)
        <Input
          defaultValue={event?.tags?.join(", ") ?? ""}
          name="tags"
          placeholder="vip, offsite"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm md:col-span-2">
        Notes
        <Textarea
          defaultValue={event?.notes ?? ""}
          name="notes"
          placeholder="Add service notes, dietary constraints, and timeline reminders."
          rows={5}
        />
      </label>
    </div>
    <div className="flex justify-end">
      <Button type="submit">{submitLabel}</Button>
    </div>
  </form>
);
