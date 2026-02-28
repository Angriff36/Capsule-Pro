import type { Event } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { eventStatuses } from "../constants";

interface EventFormProps {
  event?: Event | null;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}

const formatDateValue = (value?: Date | null): string => {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
};

const formatDecimalValue = (
  value: Event["budget"] | Event["ticketPrice"] | null | undefined
): string => {
  if (!value) {
    return "";
  }

  return value.toString();
};

export const EventForm = ({ event, action, submitLabel }: EventFormProps) => {
  const isEdit = Boolean(event?.id);

  return (
    <form action={action} className="flex flex-col gap-6">
      {isEdit ? <input name="eventId" type="hidden" value={event?.id} /> : null}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="eventNumber">
            Event number
          </label>
          <Input
            className={
              isEdit ? "" : "cursor-not-allowed bg-muted text-muted-foreground"
            }
            defaultValue={event?.eventNumber ?? ""}
            id="eventNumber"
            name="eventNumber"
            placeholder={
              isEdit ? "e.g. EVT-2026-0001" : "Auto-generated on save"
            }
            readOnly={!isEdit}
          />
          {!isEdit && (
            <span className="text-xs font-normal text-muted-foreground">
              Assigned automatically when the event is created
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="title">
            Title
          </label>
          <Input
            defaultValue={event?.title ?? ""}
            id="title"
            name="title"
            placeholder="Company holiday party"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="eventType">
            Event type
          </label>
          <Input
            defaultValue={event?.eventType ?? ""}
            id="eventType"
            name="eventType"
            placeholder="catering"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="eventDate">
            Event date
          </label>
          <Input
            defaultValue={formatDateValue(event?.eventDate)}
            id="eventDate"
            name="eventDate"
            required
            type="date"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="status">
            Status
          </label>
          <select
            className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]"
            defaultValue={event?.status ?? "confirmed"}
            id="status"
            name="status"
          >
            {eventStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="guestCount">
            Guest count
          </label>
          <Input
            defaultValue={event?.guestCount ?? 1}
            id="guestCount"
            min={1}
            name="guestCount"
            type="number"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="budget">
            Budget
          </label>
          <Input
            defaultValue={formatDecimalValue(event?.budget)}
            id="budget"
            name="budget"
            placeholder="12000"
            type="number"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="ticketTier">
            Ticket tier
          </label>
          <Input
            defaultValue={event?.ticketTier ?? ""}
            id="ticketTier"
            name="ticketTier"
            placeholder="General Admission"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="ticketPrice">
            Ticket price
          </label>
          <Input
            defaultValue={formatDecimalValue(event?.ticketPrice)}
            id="ticketPrice"
            min={0}
            name="ticketPrice"
            placeholder="0"
            type="number"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium text-sm" htmlFor="eventFormat">
            Format
          </label>
          <select
            className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]"
            defaultValue={event?.eventFormat ?? "in_person"}
            id="eventFormat"
            name="eventFormat"
          >
            <option value="in_person">In-person</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="font-medium text-sm" htmlFor="venueName">
            Venue name
          </label>
          <Input
            defaultValue={event?.venueName ?? ""}
            id="venueName"
            name="venueName"
            placeholder="The Archive Loft"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="font-medium text-sm" htmlFor="venueAddress">
            Venue address
          </label>
          <Input
            defaultValue={event?.venueAddress ?? ""}
            id="venueAddress"
            name="venueAddress"
            placeholder="123 Main St, Chicago"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="font-medium text-sm" htmlFor="tags">
            Tags (comma separated)
          </label>
          <Input
            defaultValue={event?.tags?.join(", ") ?? ""}
            id="tags"
            name="tags"
            placeholder="vip, offsite"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="font-medium text-sm" htmlFor="accessibilityOptions">
            Accessibility options (comma separated)
          </label>
          <Input
            defaultValue={event?.accessibilityOptions?.join(", ") ?? ""}
            id="accessibilityOptions"
            name="accessibilityOptions"
            placeholder="wheelchair access, ASL interpreter"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="font-medium text-sm" htmlFor="featuredMediaUrl">
            Featured media URL
          </label>
          <Input
            defaultValue={event?.featuredMediaUrl ?? ""}
            id="featuredMediaUrl"
            name="featuredMediaUrl"
            placeholder="https://"
            type="url"
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="font-medium text-sm" htmlFor="notes">
            Notes
          </label>
          <Textarea
            defaultValue={event?.notes ?? ""}
            id="notes"
            name="notes"
            placeholder="Add service notes, dietary constraints, and timeline reminders."
            rows={5}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};
