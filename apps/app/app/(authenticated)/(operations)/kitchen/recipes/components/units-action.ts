"use server";

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";

export interface UnitOption {
  code: string;
  id: number;
  name: string;
}

// Yield-appropriate units in priority order (mirrors the /new recipe page)
const YIELD_UNIT_PRIORITY = [
  "servings",
  "each",
  "portions",
  "pieces",
  "items",
  "dozen",
  "batch",
  "pan",
  "sheet",
];

/**
 * Loads core.units for the recipe edit modal selects, with
 * yield-appropriate units first (same ordering as the /new recipe page).
 */
export const getUnitOptions = async (): Promise<UnitOption[]> => {
  const { orgId } = await auth();
  if (!orgId) {
    return [];
  }

  const allUnits = await database.$queryRaw<UnitOption[]>(
    Prisma.sql`
      SELECT id, code, name
      FROM core.units
      ORDER BY code ASC
    `
  );

  return allUnits.sort((a, b) => {
    const aPriority = YIELD_UNIT_PRIORITY.indexOf(a.code.toLowerCase());
    const bPriority = YIELD_UNIT_PRIORITY.indexOf(b.code.toLowerCase());
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }
    if (aPriority !== -1) {
      return -1;
    }
    if (bPriority !== -1) {
      return 1;
    }
    return a.code.localeCompare(b.code);
  });
};
