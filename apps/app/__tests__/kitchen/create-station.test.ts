/**
 * @vitest-environment node
 *
 * Pins Station.create to a complete Manifest body (locationId, type, capacity,
 * equipmentList[], notes). Success requires a persisted station id.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/manifest-client.generated", () => ({
  stationCreate: vi.fn(),
}));

import { stationCreate } from "@/app/lib/manifest-client.generated";
import { createStation } from "../../app/(authenticated)/(operations)/kitchen/stations/create-station";
import {
  stationStatusLabel,
  stationTypeLabel,
} from "../../app/(authenticated)/(operations)/kitchen/stations/station-catalog";

const createMock = stationCreate as ReturnType<typeof vi.fn>;

describe("createStation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls Station.create with a complete body and returns the persisted station", async () => {
    createMock.mockResolvedValue({
      id: "station-1",
      name: "Hot line A",
      locationId: "facility-1",
      stationType: "hot-line",
      capacitySimultaneousTasks: 2,
      isActive: true,
      inMaintenance: false,
      currentTaskCount: 0,
    });

    const result = await createStation({
      name: "  Hot line A  ",
      locationId: "facility-1",
      stationType: "hot-line",
      capacitySimultaneousTasks: 2,
      notes: "  primary  ",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.station.id).toBe("station-1");
      expect(stationTypeLabel(result.station.stationType)).toBe("Hot Line");
      expect(stationStatusLabel(result.station)).toBe("Active");
    }

    expect(createMock).toHaveBeenCalledWith({
      locationId: "facility-1",
      name: "Hot line A",
      stationType: "hot-line",
      capacitySimultaneousTasks: 2,
      equipmentList: [],
      notes: "primary",
    });
  });

  it("rejects missing location without calling the dispatcher", async () => {
    const result = await createStation({
      name: "Prep",
      locationId: "  ",
      stationType: "prep-station",
      capacitySimultaneousTasks: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/location/i);
    }
    expect(createMock).not.toHaveBeenCalled();
  });

  it("does not report success when create returns no id", async () => {
    createMock.mockResolvedValue({ name: "orphan" });

    const result = await createStation({
      name: "orphan",
      locationId: "facility-1",
      stationType: "bakery",
      capacitySimultaneousTasks: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/persisted id/i);
    }
  });
});
