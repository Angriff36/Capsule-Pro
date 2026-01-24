Object.defineProperty(exports, "__esModule", { value: true });
exports.EventForm = void 0;
const button_1 = require("@repo/design-system/components/ui/button");
const input_1 = require("@repo/design-system/components/ui/input");
const textarea_1 = require("@repo/design-system/components/ui/textarea");
const constants_1 = require("../constants");
const formatDateValue = (value) => {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 10);
};
const formatDecimalValue = (value) => {
  if (!value) {
    return "";
  }
  return value.toString();
};
const EventForm = ({ event, action, submitLabel }) => (
  <form action={action} className="flex flex-col gap-6">
    {event?.id ? <input name="eventId" type="hidden" value={event.id} /> : null}
    <div className="grid gap-6 md:grid-cols-2">
      <label className="flex flex-col gap-2 font-medium text-sm">
        Title
        <input_1.Input
          defaultValue={event?.title ?? ""}
          name="title"
          placeholder="Company holiday party"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Event type
        <input_1.Input
          defaultValue={event?.eventType ?? ""}
          name="eventType"
          placeholder="catering"
          required
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Event date
        <input_1.Input
          defaultValue={formatDateValue(event?.eventDate)}
          name="eventDate"
          required
          type="date"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Status
        <select
          className="rounded-md border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px]"
          defaultValue={event?.status ?? "confirmed"}
          name="status"
        >
          {constants_1.eventStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Guest count
        <input_1.Input
          defaultValue={event?.guestCount ?? 1}
          min={1}
          name="guestCount"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm">
        Budget
        <input_1.Input
          defaultValue={formatDecimalValue(event?.budget)}
          name="budget"
          placeholder="12000"
          type="number"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm md:col-span-2">
        Venue name
        <input_1.Input
          defaultValue={event?.venueName ?? ""}
          name="venueName"
          placeholder="The Archive Loft"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm md:col-span-2">
        Venue address
        <input_1.Input
          defaultValue={event?.venueAddress ?? ""}
          name="venueAddress"
          placeholder="123 Main St, Chicago"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm md:col-span-2">
        Tags (comma separated)
        <input_1.Input
          defaultValue={event?.tags?.join(", ") ?? ""}
          name="tags"
          placeholder="vip, offsite"
        />
      </label>
      <label className="flex flex-col gap-2 font-medium text-sm md:col-span-2">
        Notes
        <textarea_1.Textarea
          defaultValue={event?.notes ?? ""}
          name="notes"
          placeholder="Add service notes, dietary constraints, and timeline reminders."
          rows={5}
        />
      </label>
    </div>
    <div className="flex justify-end">
      <button_1.Button type="submit">{submitLabel}</button_1.Button>
    </div>
  </form>
);
exports.EventForm = EventForm;
