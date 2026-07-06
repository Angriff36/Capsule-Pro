import { database } from "@repo/database";

/**
 * Irregular shorthand that doesn't match a core.units code, name, or
 * name_plural. Values are core.units codes.
 */
const UNIT_ALIASES: Record<string, string> = {
  lbs: "lb",
  "#": "lb",
  ozs: "oz",
  tbs: "tbsp",
  tbsps: "tbsp",
  tsps: "tsp",
  litre: "l",
  litres: "l",
  liter: "l",
  liters: "l",
  qts: "qt",
  pts: "pt",
  gals: "gal",
  pc: "pcs",
  count: "ea",
  unit: "ea",
  units: "ea",
};

let unitCache: Map<string, number> | null = null;

async function loadUnitCache(): Promise<Map<string, number>> {
  if (unitCache) {
    return unitCache;
  }

  const rows = await database.$queryRaw<
    Array<{ id: number; code: string; name: string; name_plural: string }>
  >`
    SELECT id, code, name, name_plural
    FROM core.units
  `;

  const cache = new Map<string, number>();
  // Insert names first so codes win on collision (e.g. code "t" = ton).
  for (const row of rows) {
    cache.set(row.name.toLowerCase(), row.id);
    cache.set(row.name_plural.toLowerCase(), row.id);
  }
  for (const row of rows) {
    cache.set(row.code.toLowerCase(), row.id);
  }
  unitCache = cache;
  return cache;
}

function lookupCandidate(
  cache: Map<string, number>,
  candidate: string
): number | undefined {
  const direct = cache.get(candidate);
  if (direct) {
    return direct;
  }

  const alias = UNIT_ALIASES[candidate];
  if (alias) {
    const aliased = cache.get(alias);
    if (aliased) {
      return aliased;
    }
  }

  // Singular fallback for plurals the table doesn't list.
  return candidate.endsWith("s")
    ? cache.get(candidate.slice(0, -1))
    : undefined;
}

/**
 * Map a user-entered unit string ("lb", "POUNDS", "fluid ounces", "5")
 * to a core.units id. Matches code, full name, and plural name from the
 * units table, plus common shorthand aliases. Purely numeric strings are
 * treated as literal unit ids (CSV unit_id columns).
 */
export async function resolveUnitId(
  unitCode: string | null | undefined,
  fallback = 1
): Promise<number> {
  const normalized = unitCode?.trim().toLowerCase().replaceAll(/\s+/g, " ");
  if (!normalized) {
    return fallback;
  }

  const cache = await loadUnitCache();

  // Some imports embed the quantity in the unit string ("5 pounds").
  const withoutLeadingNumber = normalized.replace(/^[\d.,/\s]+/, "").trim();
  const candidates = [
    normalized,
    normalized.replaceAll(/\s+/g, ""),
    withoutLeadingNumber,
    withoutLeadingNumber.replaceAll(/\s+/g, ""),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const match = lookupCandidate(cache, candidate);
    if (match) {
      return match;
    }
  }

  if (/^\d+$/.test(normalized)) {
    const numeric = Number.parseInt(normalized, 10);
    if (numeric > 0) {
      return numeric;
    }
  }

  return fallback;
}

export function resetUnitCacheForTests(): void {
  unitCache = null;
}
