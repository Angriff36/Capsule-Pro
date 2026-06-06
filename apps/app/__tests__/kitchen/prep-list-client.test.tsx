import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/app/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock(
  "../app/(authenticated)/kitchen/prep-lists/components/prep-list-form-with-constraints",
  () => ({
    PrepListSaveButton: () => <button type="button">Save to Database</button>,
  })
);

import { PrepListClient } from "../../app/(authenticated)/kitchen/prep-lists/prep-list-client";

test("prep list page exposes generate controls before a list exists", () => {
  render(
    <PrepListClient
      availableEvents={[
        {
          id: "event-1",
          title: "Spring Tasting",
          eventDate: new Date("2026-06-20T18:00:00Z"),
          guestCount: 42,
        },
      ]}
      eventId="event-1"
      initialPrepList={null}
    />
  );

  expect(
    screen
      .getByRole("button", { name: /generate prep list/i })
      .hasAttribute("disabled")
  ).toBe(false);
  expect(screen.getByText(/choose an event/i)).toBeTruthy();
});
