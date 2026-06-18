import { database } from "@repo/database";

const UNIT_CODES = ["lb", "oz", "ea", "g", "kg", "ml", "l", "cup", "tbsp", "tsp"];

let unitCache: Map<string, number> | null = null;

async function loadUnitCache(): Promise<Map<string, number>> {
  if (unitCache) {
    return unitCache;
  }

  const rows = await database.$queryRaw<Array<{ id: number; code: string }>>`
    SELECT id, code
    FROM core.units
    WHERE code IN ('lb', 'oz', 'ea', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp')
  `;

  unitCache = new Map(rows.map((row) => [row.code.toLowerCase(), row.id]));
  return unitCache;
}

export async function resolveUnitId(
  unitCode: string | null | undefined,
  fallback = 1
): Promise<number> {
  const normalized = unitCode?.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  const cache = await loadUnitCache();
  const direct = cache.get(normalized);
  if (direct) {
    return direct;
  }

  const alias = normalized.replace(/\s+/g, "");
  for (const code of UNIT_CODES) {
    if (alias.includes(code)) {
      const id = cache.get(code);
      if (id) {
        return id;
      }
    }
  }

  const numeric = Number.parseInt(normalized, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  return fallback;
}
