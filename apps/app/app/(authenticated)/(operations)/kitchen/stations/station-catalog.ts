/**
 * Station type labels and status helpers for the Station product surface.
 * Distinct from KitchenTask tag rollups.
 */

export const STATION_TYPES = [
  "hot-line",
  "cold-prep",
  "bakery",
  "garnish",
  "prep-station",
] as const;

export type StationType = (typeof STATION_TYPES)[number];

const STATION_TYPE_LABELS: Record<StationType, string> = {
  "hot-line": "Hot Line",
  "cold-prep": "Cold Prep",
  bakery: "Bakery",
  garnish: "Garnish",
  "prep-station": "Prep Station",
};

export function stationTypeLabel(
  stationType: string | null | undefined
): string {
  if (stationType && stationType in STATION_TYPE_LABELS) {
    return STATION_TYPE_LABELS[stationType as StationType];
  }
  return stationType?.trim() || "Unknown type";
}

export function stationStatusLabel(station: {
  inMaintenance?: boolean | null;
  isActive?: boolean | null;
}): string {
  if (station.isActive === false) {
    return "Inactive";
  }
  if (station.inMaintenance) {
    return "Maintenance";
  }
  return "Active";
}
