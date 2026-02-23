/**
 * Shared ingredient resolution utilities.
 * Used by composite routes to resolve free-text ingredients to database IDs.
 */

import { randomUUID } from "node:crypto";
import { Prisma as PrismaNamespace } from "@prisma/client";

/** Regex for parsing ingredient lines like "2 cups flour" */
const INGREDIENT_LINE_REGEX = /^([\d.]+)\s*([a-zA-Z]+)?\s*(.*)$/;

/** Regex for splitting text into lines */
const LINE_SPLIT_REGEX = /\r?\n/;

/**
 * Parsed ingredient input from form data.
 */
export interface IngredientInput {
  name: string;
  quantity: number;
  unit: string | null;
  preparationNotes: string | null;
  isOptional: boolean;
}

/**
 * Resolved ingredient ready for RecipeIngredient creation.
 */
export interface ResolvedIngredient {
  ingredientId: string;
  quantity: number;
  unitId: number;
  preparationNotes: string | null;
  isOptional: boolean;
}

/**
 * Transaction client interface compatible with Prisma.
 */
interface TxClient {
  $queryRaw: typeof PrismaNamespace.prototype.$queryRaw;
  $executeRaw: typeof PrismaNamespace.prototype.$executeRaw;
}

/**
 * Parse a JSON array from a string, returning null if invalid.
 */
export const parseJsonArray = (value: string): unknown[] | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Parse a single ingredient line like "2 cups flour" into structured data.
 */
export const parseIngredientLine = (line: string) => {
  const match = line.match(INGREDIENT_LINE_REGEX);
  if (!match) {
    return { quantity: 1, unit: null, name: line };
  }
  const quantity = Number(match[1]);
  const unit = match[2] ? match[2].toLowerCase() : null;
  const name = match[3]?.trim() || line;
  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    unit,
    name,
  };
};

/**
 * Split text into non-empty lines.
 */
const parseLines = (text: string): string[] => {
  return text
    .split(LINE_SPLIT_REGEX)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

/**
 * Extract optional boolean from record fields.
 */
const extractOptionalBoolean = (record: Record<string, unknown>): boolean => {
  if (typeof record.isOptional === "boolean") {
    return record.isOptional;
  }
  if (typeof record.optional === "boolean") {
    return record.optional;
  }
  return false;
};

/**
 * Parse a single JSON item into IngredientInput.
 */
const parseJsonItem = (item: unknown): IngredientInput | null => {
  if (!item || typeof item !== "object") {
    return null;
  }
  const record = item as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!name) {
    return null;
  }
  const unit =
    typeof record.unit === "string" && record.unit.trim().length > 0
      ? record.unit.trim()
      : null;
  const quantityRaw = record.quantity;
  let quantity = 1;
  if (typeof quantityRaw === "number" && Number.isFinite(quantityRaw)) {
    quantity = quantityRaw;
  } else if (typeof quantityRaw === "string") {
    const parsed = Number(quantityRaw);
    if (Number.isFinite(parsed)) {
      quantity = parsed;
    }
  }
  const preparationNotes =
    typeof record.notes === "string" && record.notes.trim().length > 0
      ? record.notes.trim()
      : null;
  const isOptional = extractOptionalBoolean(record);
  return { name, quantity, unit, preparationNotes, isOptional };
};

/**
 * Parse ingredient input from FormData value.
 * Accepts either JSON array format or free-text lines.
 *
 * JSON format: [{"name": "flour", "quantity": 2, "unit": "cups", "notes": "sifted"}]
 * Text format: "2 cups flour\n1 tsp salt"
 */
export const parseIngredientInput = (
  value: FormDataEntryValue | null | string
): IngredientInput[] => {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  const jsonItems = parseJsonArray(trimmed);
  if (jsonItems) {
    return jsonItems
      .map(parseJsonItem)
      .filter((item): item is IngredientInput => item !== null);
  }

  return parseLines(trimmed).map((line) => {
    const parsed = parseIngredientLine(line);
    return {
      name: parsed.name || line,
      quantity: parsed.quantity,
      unit: parsed.unit,
      preparationNotes: null,
      isOptional: false,
    };
  });
};

/**
 * Load a map of unit codes to database IDs.
 */
export const loadUnitMap = async (
  tx: TxClient,
  codes: string[]
): Promise<Map<string, number>> => {
  if (codes.length === 0) {
    return new Map<string, number>();
  }
  const rows = await tx.$queryRaw<{ id: number; code: string }[]>(
    PrismaNamespace.sql`
      SELECT id, code
      FROM core.units
      WHERE code IN (${PrismaNamespace.join(codes)})
    `
  );
  return new Map(rows.map((row) => [row.code.toLowerCase(), row.id]));
};

/**
 * Ensure an ingredient exists for the given name, creating it if needed.
 * Returns the ingredient ID.
 */
export const ensureIngredientId = async (
  tx: TxClient,
  tenantId: string,
  name: string,
  defaultUnitId: number
): Promise<string> => {
  const [existing] = await tx.$queryRaw<{ id: string }[]>(
    PrismaNamespace.sql`
      SELECT id
      FROM tenant_kitchen.ingredients
      WHERE tenant_id = ${tenantId}
        AND name = ${name}
        AND deleted_at IS NULL
      LIMIT 1
    `
  );

  if (existing?.id) {
    return existing.id;
  }

  const id = randomUUID();
  await tx.$executeRaw(
    PrismaNamespace.sql`
      INSERT INTO tenant_kitchen.ingredients (
        tenant_id,
        id,
        name,
        default_unit_id,
        is_active
      )
      VALUES (${tenantId}, ${id}, ${name}, ${defaultUnitId}, true)
    `
  );
  return id;
};

/**
 * Get the default "each" unit ID for ingredients without a specified unit.
 * Caches the result in memory for performance.
 */
let cachedEachUnitId: number | null = null;

export const getEachUnitId = async (tx: TxClient): Promise<number> => {
  if (cachedEachUnitId !== null) {
    return cachedEachUnitId;
  }

  const [row] = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM core.units WHERE code = 'each' LIMIT 1
  `;

  if (!row) {
    throw new Error("Default 'each' unit not found in database");
  }

  cachedEachUnitId = row.id;
  return cachedEachUnitId;
};

/**
 * Resolve a list of IngredientInput to ResolvedIngredient with database IDs.
 * This is the main entry point for ingredient resolution in composite routes.
 *
 * @param tx - Transaction client
 * @param tenantId - Tenant ID for ingredient creation
 * @param inputs - Parsed ingredient inputs
 * @returns Array of resolved ingredients with database IDs
 */
export const resolveIngredients = async (
  tx: TxClient,
  tenantId: string,
  inputs: IngredientInput[]
): Promise<ResolvedIngredient[]> => {
  if (inputs.length === 0) {
    return [];
  }

  // Collect all unique unit codes
  const unitCodes = new Set<string>();
  for (const input of inputs) {
    if (input.unit) {
      unitCodes.add(input.unit.toLowerCase());
    }
  }

  // Load unit map and default unit
  const [unitMap, defaultUnitId] = await Promise.all([
    loadUnitMap(tx, Array.from(unitCodes)),
    getEachUnitId(tx),
  ]);

  // Resolve each ingredient
  const results: ResolvedIngredient[] = [];
  for (const input of inputs) {
    const unitId = input.unit
      ? (unitMap.get(input.unit.toLowerCase()) ?? defaultUnitId)
      : defaultUnitId;

    const ingredientId = await ensureIngredientId(
      tx,
      tenantId,
      input.name,
      unitId
    );

    results.push({
      ingredientId,
      quantity: input.quantity,
      unitId,
      preparationNotes: input.preparationNotes,
      isOptional: input.isOptional,
    });
  }

  return results;
};
