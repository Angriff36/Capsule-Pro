import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => children,
  DragOverlay: ({ children }: { children: React.ReactNode }) => children,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    isDragging: false,
  }),
  useDroppable: () => ({
    setNodeRef: () => undefined,
    isOver: false,
  }),
  PointerSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { UnifiedCalendar } from "../../app/(authenticated)/calendar/components/unified-calendar";

describe("UnifiedCalendar", () => {
  const eventDate = new Date("2026-04-15T10:00:00.000Z");

  beforeEach(() => {
    push.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("navigates to event details from the popup", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [
          {
            id: "evt-1",
            title: "Spring Gala",
            start: eventDate.toISOString(),
            type: "event",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();

    render(
      <UnifiedCalendar
        initialEvents={[
          {
            id: "evt-1",
            title: "Spring Gala",
            start: eventDate,
            type: "event",
          },
        ]}
        tenantId="tenant-1"
      />
    );

    await user.click(await screen.findByText(/Spring Gala/i));
    await user.click(screen.getByRole("button", { name: /View Details/i }));

    expect(push).toHaveBeenCalledWith("/events/evt-1");
  });

  it("switches into day view when Day is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events: [] }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();

    render(<UnifiedCalendar initialEvents={[]} tenantId="tenant-1" />);

    expect(screen.getAllByText("Sun").length).toBeGreaterThan(0);
    const [dayTab] = screen.getAllByRole("tab", { name: "Day" });
    expect(dayTab).toBeDefined();
    if (!dayTab) {
      throw new Error("Expected Day tab to be rendered");
    }

    await user.click(dayTab);

    expect(dayTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.queryAllByText("Sun")).toHaveLength(0);
    expect(
      screen.getByText(/^[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4}$/)
    ).toBeDefined();
  });

  it("advances by month when next is clicked in month view", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events: [] }),
    }) as unknown as typeof fetch;

    const user = userEvent.setup();

    render(<UnifiedCalendar initialEvents={[]} tenantId="tenant-1" />);

    const initialHeading = screen.getByRole("heading", {
      level: 2,
    }).textContent;
    const [, nextButton] = screen.getAllByRole("button");
    expect(nextButton).toBeDefined();

    if (!nextButton) {
      throw new Error("Expected next-period button to be rendered");
    }

    await user.click(nextButton);

    expect(screen.getByRole("heading", { level: 2 }).textContent).not.toBe(
      initialHeading
    );
  });
});
