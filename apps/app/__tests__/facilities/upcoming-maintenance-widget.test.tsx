import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UpcomingMaintenanceWidget } from "../../app/(authenticated)/facilities/components/upcoming-maintenance-widget";

vi.mock("@/app/lib/manifest-client.generated", () => ({
  listPreventiveMaintenanceSchedules: vi.fn().mockResolvedValue({
    data: [
      {
        id: "schedule-1",
        title: "Inspect Oven",
        frequency: "weekly",
        nextDueAt: new Date(
          new Date().getTime() + 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        equipmentId: "asset-1",
      },
    ],
  }),
  listFacilityAssets: vi.fn().mockResolvedValue({
    data: [{ id: "asset-1", name: "Main Oven" }],
  }),
}));

describe("UpcomingMaintenanceWidget", () => {
  it("renders schedules from the generated client", async () => {
    render(<UpcomingMaintenanceWidget />);

    await waitFor(() => {
      expect(screen.getByText("Inspect Oven")).toBeDefined();
    });

    expect(screen.getByText("Main Oven")).toBeDefined();
  });
});
