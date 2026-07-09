/**
 * Station.create via the Manifest dispatcher with a complete Zod body.
 * Does not invent locationId — callers must supply a real Facility id.
 */

import { stationCreate } from "@/app/lib/manifest-client.generated";
import type { Station } from "@/app/lib/manifest-types.generated";

export interface CreateStationInput {
  capacitySimultaneousTasks: number;
  equipmentList?: string[];
  locationId: string;
  name: string;
  notes?: string;
  stationType: string;
}

export type CreateStationResult =
  | { ok: true; station: Station }
  | { ok: false; error: string };

export async function createStation(
  input: CreateStationInput
): Promise<CreateStationResult> {
  const name = input.name.trim();
  const locationId = input.locationId.trim();
  if (!name) {
    return { ok: false, error: "Station name is required." };
  }
  if (!locationId) {
    return { ok: false, error: "Location is required." };
  }
  if (
    !(
      Number.isFinite(input.capacitySimultaneousTasks) &&
      input.capacitySimultaneousTasks > 0
    )
  ) {
    return { ok: false, error: "Capacity must be a positive number." };
  }

  try {
    const station = await stationCreate({
      locationId,
      name,
      stationType: input.stationType,
      capacitySimultaneousTasks: input.capacitySimultaneousTasks,
      equipmentList: input.equipmentList ?? [],
      notes: input.notes?.trim() ?? "",
    });

    if (!station?.id) {
      return {
        ok: false,
        error: "Station create did not return a persisted id.",
      };
    }

    return { ok: true, station };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to create station.",
    };
  }
}
