/**
 * Unit resolver tests — user-entered unit strings must map to the canonical
 * core.units row, because a wrong unit id silently corrupts every imported
 * recipe quantity (e.g. "5 POUNDS" landing as grams).
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const UNIT_ROWS = [
  { id: 1, code: "g", name: "gram", name_plural: "grams" },
  { id: 2, code: "kg", name: "kilogram", name_plural: "kilograms" },
  { id: 4, code: "oz", name: "ounce", name_plural: "ounces" },
  { id: 5, code: "lb", name: "pound", name_plural: "pounds" },
  { id: 6, code: "t", name: "ton", name_plural: "tons" },
  { id: 10, code: "ml", name: "milliliter", name_plural: "milliliters" },
  { id: 11, code: "l", name: "liter", name_plural: "liters" },
  { id: 12, code: "floz", name: "fluid ounce", name_plural: "fluid ounces" },
  { id: 13, code: "cup", name: "cup", name_plural: "cups" },
  { id: 15, code: "qt", name: "quart", name_plural: "quarts" },
  { id: 16, code: "gal", name: "gallon", name_plural: "gallons" },
  { id: 17, code: "tbsp", name: "tablespoon", name_plural: "tablespoons" },
  { id: 18, code: "tsp", name: "teaspoon", name_plural: "teaspoons" },
  { id: 20, code: "ea", name: "each", name_plural: "each" },
  { id: 22, code: "pcs", name: "piece", name_plural: "pieces" },
];

vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: vi.fn(async () => UNIT_ROWS),
  },
}));

const { resolveUnitId, resetUnitCacheForTests } = await import(
  "@/app/api/kitchen/import/lib/unit-resolver"
);

describe("resolveUnitId", () => {
  beforeEach(() => {
    resetUnitCacheForTests();
  });

  it("matches canonical codes", async () => {
    expect(await resolveUnitId("lb")).toBe(5);
    expect(await resolveUnitId("tbsp")).toBe(17);
  });

  it("matches full unit names and plurals regardless of case", async () => {
    expect(await resolveUnitId("POUNDS")).toBe(5);
    expect(await resolveUnitId("Pound")).toBe(5);
    expect(await resolveUnitId("quarts")).toBe(15);
    expect(await resolveUnitId("Tablespoons")).toBe(17);
    expect(await resolveUnitId("fluid ounces")).toBe(12);
  });

  it("matches common shorthand aliases", async () => {
    expect(await resolveUnitId("lbs")).toBe(5);
    expect(await resolveUnitId("Tbs")).toBe(17);
    expect(await resolveUnitId("qts")).toBe(15);
    expect(await resolveUnitId("count")).toBe(20);
  });

  it("strips a leading quantity embedded in the unit string", async () => {
    expect(await resolveUnitId("5 POUNDS")).toBe(5);
    expect(await resolveUnitId("2 cups")).toBe(13);
  });

  it("does not let the ton code 't' shadow name lookups", async () => {
    expect(await resolveUnitId("t")).toBe(6);
    expect(await resolveUnitId("tons")).toBe(6);
  });

  it("treats pure numbers as literal unit ids", async () => {
    expect(await resolveUnitId("13")).toBe(13);
  });

  it("falls back for unknown strings", async () => {
    expect(await resolveUnitId("bunch", 20)).toBe(20);
    expect(await resolveUnitId(null, 1)).toBe(1);
  });
});
