import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UpcomingMaintenanceWidget } from "../../app/(authenticated)/facilities/components/upcoming-maintenance-widget";

describe("UpcomingMaintenanceWidget", () => {
  it("renders schedules from the facilities API success shape", async () => {
    const now = new Date();
    const dueSoon = new Date(
      now.getTime() + 2 * 24 * 60 * 60 * 1000
    ).toISOString();

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          schedules: [
            {
              id: "schedule-1",
              schedule_number: "PM-001",
              title: "Inspect Oven",
              frequency: "weekly",
              next_due_at: dueSoon,
              equipment_id: "asset-1",
              estimated_hours: 2,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          assets: [{ id: "asset-1", name: "Main Oven" }],
        }),
      }) as unknown as typeof fetch;

    render(<UpcomingMaintenanceWidget />);

    await waitFor(() => {
      expect(screen.getByText("Inspect Oven")).toBeDefined();
    });

    expect(screen.getByText("Main Oven")).toBeDefined();
  });
});
