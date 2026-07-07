import type { Event } from "@repo/database";
import { DatePicker } from "@repo/design-system/components/ui/date-picker";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, type Mock, vi } from "vitest";
import type { CreateEventState } from "../../app/(authenticated)/(events)/events/actions";
import { EventForm } from "../../app/(authenticated)/(events)/events/components/event-form";

function ControlledDatePickerForm({
  initialValue,
  onSubmit,
}: {
  initialValue: string;
  onSubmit: (formData: FormData) => void;
}) {
  const [eventDate, setEventDate] = useState(initialValue);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
    >
      <label htmlFor="eventDate">Event date</label>
      <DatePicker
        id="eventDate"
        name="eventDate"
        onChange={(event) => setEventDate(event.target.value)}
        value={eventDate}
      />
      <button type="submit">Save</button>
    </form>
  );
}

describe("DatePicker form submission", () => {
  it("submits the controlled ISO date after editing and blurring the display input", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();

    render(
      <ControlledDatePickerForm initialValue="2026-06-10" onSubmit={submit} />
    );

    const input = screen.getByLabelText("Event date");
    await user.clear(input);
    await user.type(input, "2026-06-12");
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[0].get("eventDate")).toBe("2026-06-12");
  });

  it("does not log the React value/defaultValue warning when defaultValue is used", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    render(
      <form>
        <DatePicker defaultValue="2026-06-10" id="eventDate" name="eventDate" />
      </form>
    );

    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).includes("both value and defaultValue")
      )
    ).toBe(false);
  });
});

describe("EventForm event date submission", () => {
  it("passes the edited eventDate to the update action as an ISO date string", async () => {
    const user = userEvent.setup();
    const action = vi.fn(
      async (_prevState: CreateEventState, _formData: FormData) => null
    );

    render(
      <EventForm
        action={action}
        event={
          {
            id: "event-1",
            eventDate: new Date("2026-06-10T12:00:00.000Z"),
            eventNumber: "EVT-1",
            title: "Initial title",
            eventType: "catering",
            status: "confirmed",
            guestCount: 50,
          } as Event
        }
        submitLabel="Save event"
      />
    );

    const input = screen.getByLabelText("Event date");
    await user.clear(input);
    await user.type(input, "2026-06-12");
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Save event" }));

    expect(action).toHaveBeenCalledTimes(1);
    const formData = (action as Mock).mock.calls[0]?.[1] as FormData;
    expect(formData.get("eventDate")).toBe("2026-06-12");
  });
});
