/**
 * @vitest-environment node
 */

import { describe, expect, it } from "vitest";

// We need to import the module carefully since it uses Prisma.sql
// Test the pure functions that don't need DB
import {
  parseIngredientInput,
  parseIngredientLine,
  parseJsonArray,
} from "../ingredient-resolution";

// ============================================================
// parseJsonArray
// ============================================================
describe("parseJsonArray", () => {
  it("parses a valid JSON array", () => {
    const result = parseJsonArray('[{"name": "flour"}]');
    expect(result).toEqual([{ name: "flour" }]);
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonArray("not json")).toBeNull();
  });

  it("returns null for a JSON object (not array)", () => {
    expect(parseJsonArray('{"name": "flour"}')).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseJsonArray("")).toBeNull();
  });

  it("returns null for a JSON string", () => {
    expect(parseJsonArray('"hello"')).toBeNull();
  });

  it("returns null for a JSON number", () => {
    expect(parseJsonArray("42")).toBeNull();
  });

  it("returns empty array for empty JSON array", () => {
    expect(parseJsonArray("[]")).toEqual([]);
  });
});

// ============================================================
// parseIngredientLine
// ============================================================
describe("parseIngredientLine", () => {
  it("parses '2 cups flour'", () => {
    const result = parseIngredientLine("2 cups flour");
    expect(result).toEqual({ quantity: 2, unit: "cups", name: "flour" });
  });

  it("parses '1.5 kg sugar'", () => {
    const result = parseIngredientLine("1.5 kg sugar");
    expect(result).toEqual({ quantity: 1.5, unit: "kg", name: "sugar" });
  });

  it("parses '0.5 tsp vanilla'", () => {
    const result = parseIngredientLine("0.5 tsp vanilla");
    expect(result).toEqual({ quantity: 0.5, unit: "tsp", name: "vanilla" });
  });

  it("parses '3 eggs' — regex treats word after number as unit, name falls back to full line", () => {
    // The regex ([\d.]+)\s*([a-zA-Z]+)?\s*(.*) matches "eggs" as the unit
    // match[3] is "" (falsy), so name falls back to the full input line
    const result = parseIngredientLine("3 eggs");
    expect(result).toEqual({ quantity: 3, unit: "eggs", name: "3 eggs" });
  });

  it("handles just a name: 'salt'", () => {
    const result = parseIngredientLine("salt");
    expect(result).toEqual({ quantity: 1, unit: null, name: "salt" });
  });

  it("handles decimal with unit: '0.25 oz yeast'", () => {
    const result = parseIngredientLine("0.25 oz yeast");
    expect(result).toEqual({ quantity: 0.25, unit: "oz", name: "yeast" });
  });

  it("handles large quantity: '100 lbs flour'", () => {
    const result = parseIngredientLine("100 lbs flour");
    expect(result).toEqual({ quantity: 100, unit: "lbs", name: "flour" });
  });

  it("parses '0 flour' — regex captures flour as unit, quantity defaults to 1, name falls back", () => {
    // 0 fails the > 0 check, so quantity defaults to 1
    // match[3] is "" → name falls back to full line
    const result = parseIngredientLine("0 flour");
    expect(result).toEqual({ quantity: 1, unit: "flour", name: "0 flour" });
  });

  it("handles negative quantity by defaulting to 1", () => {
    const result = parseIngredientLine("-5 cups sugar");
    expect(result).toEqual({ quantity: 1, unit: null, name: "-5 cups sugar" });
  });

  it("handles NaN quantity by defaulting to 1", () => {
    const result = parseIngredientLine("abc cups sugar");
    expect(result).toEqual({ quantity: 1, unit: null, name: "abc cups sugar" });
  });

  it("handles ingredient name with spaces: '2 tbsp extra virgin olive oil'", () => {
    const result = parseIngredientLine("2 tbsp extra virgin olive oil");
    expect(result).toEqual({
      quantity: 2,
      unit: "tbsp",
      name: "extra virgin olive oil",
    });
  });

  it("handles unit-only input (no number): 'cups flour'", () => {
    // "cups" doesn't match [\d.]+ so the regex won't match
    const result = parseIngredientLine("cups flour");
    expect(result).toEqual({ quantity: 1, unit: null, name: "cups flour" });
  });

  it("handles empty string", () => {
    const result = parseIngredientLine("");
    expect(result).toEqual({ quantity: 1, unit: null, name: "" });
  });

  it("handles whitespace-only string", () => {
    const result = parseIngredientLine("   ");
    // Regex won't match, falls through
    expect(result).toEqual({ quantity: 1, unit: null, name: "   " });
  });

  it("handles ingredient with special characters: '2 cups all-purpose flour'", () => {
    const result = parseIngredientLine("2 cups all-purpose flour");
    expect(result).toEqual({
      quantity: 2,
      unit: "cups",
      name: "all-purpose flour",
    });
  });

  it("handles ingredient with parentheses: '2 cups flour (sifted)'", () => {
    const result = parseIngredientLine("2 cups flour (sifted)");
    expect(result).toEqual({
      quantity: 2,
      unit: "cups",
      name: "flour (sifted)",
    });
  });
});

// ============================================================
// parseIngredientInput
// ============================================================
describe("parseIngredientInput", () => {
  it("returns empty array for null", () => {
    expect(parseIngredientInput(null)).toEqual([]);
  });

  it("returns empty array for undefined (via FormDataEntryValue type)", () => {
    // FormDataEntryValue can be File | string, but parseIngredientInput checks typeof
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    expect(parseIngredientInput(file as unknown as string)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseIngredientInput("")).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    expect(parseIngredientInput("   \n\t  ")).toEqual([]);
  });

  // --- JSON format ---
  it("parses JSON array with name/quantity/unit", () => {
    const input = JSON.stringify([
      { name: "flour", quantity: 2, unit: "cups" },
      { name: "sugar", quantity: 1, unit: "cup" },
    ]);
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "flour",
      quantity: 2,
      unit: "cups",
      preparationNotes: null,
      isOptional: false,
    });
    expect(result[1]).toEqual({
      name: "sugar",
      quantity: 1,
      unit: "cup",
      preparationNotes: null,
      isOptional: false,
    });
  });

  it("parses JSON with notes field", () => {
    const input = JSON.stringify([
      { name: "onion", quantity: 2, unit: "each", notes: "diced" },
    ]);
    const result = parseIngredientInput(input);
    expect(result[0]).toEqual({
      name: "onion",
      quantity: 2,
      unit: "each",
      preparationNotes: "diced",
      isOptional: false,
    });
  });

  it("parses JSON with isOptional field", () => {
    const input = JSON.stringify([
      { name: "parsley", quantity: 1, unit: "bunch", isOptional: true },
    ]);
    const result = parseIngredientInput(input);
    expect(result[0]!.isOptional).toBe(true);
  });

  it("parses JSON with optional field (alias)", () => {
    const input = JSON.stringify([
      { name: "parsley", quantity: 1, unit: "bunch", optional: true },
    ]);
    const result = parseIngredientInput(input);
    expect(result[0]!.isOptional).toBe(true);
  });

  it("parses JSON with string quantity", () => {
    const input = JSON.stringify([
      { name: "flour", quantity: "2.5", unit: "cups" },
    ]);
    const result = parseIngredientInput(input);
    expect(result[0]!.quantity).toBe(2.5);
  });

  it("filters out JSON items with empty names", () => {
    const input = JSON.stringify([
      { name: "", quantity: 2, unit: "cups" },
      { name: "flour", quantity: 1, unit: "cup" },
    ]);
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("flour");
  });

  it("filters out JSON items with whitespace-only names", () => {
    const input = JSON.stringify([
      { name: "   ", quantity: 2, unit: "cups" },
      { name: "flour", quantity: 1, unit: "cup" },
    ]);
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(1);
  });

  it("filters out non-object JSON items", () => {
    const input = JSON.stringify([
      null,
      "string",
      42,
      { name: "flour", quantity: 1 },
    ]);
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("flour");
  });

  it("handles JSON with missing quantity (defaults to 1)", () => {
    const input = JSON.stringify([{ name: "salt" }]);
    const result = parseIngredientInput(input);
    expect(result[0]).toEqual({
      name: "salt",
      quantity: 1,
      unit: null,
      preparationNotes: null,
      isOptional: false,
    });
  });

  it("handles JSON with non-finite quantity (defaults to 1)", () => {
    const input = JSON.stringify([{ name: "salt", quantity: Number.NaN }]);
    const result = parseIngredientInput(input);
    expect(result[0]!.quantity).toBe(1);
  });

  it("handles JSON with Infinity quantity (defaults to 1)", () => {
    const input = JSON.stringify([
      { name: "salt", quantity: Number.POSITIVE_INFINITY },
    ]);
    const result = parseIngredientInput(input);
    expect(result[0]!.quantity).toBe(1);
  });

  it("handles JSON with empty unit string (treated as null)", () => {
    const input = JSON.stringify([{ name: "salt", quantity: 1, unit: "  " }]);
    const result = parseIngredientInput(input);
    expect(result[0]!.unit).toBeNull();
  });

  it("handles JSON with empty notes string (treated as null)", () => {
    const input = JSON.stringify([{ name: "salt", quantity: 1, notes: "  " }]);
    const result = parseIngredientInput(input);
    expect(result[0]!.preparationNotes).toBeNull();
  });

  // --- Text format ---
  it("parses multi-line text input", () => {
    const input = "2 cups flour\n1 tsp salt\n3 eggs";
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(3);
    expect(result[0]!.name).toBe("flour");
    expect(result[0]!.unit).toBe("cups");
    expect(result[0]!.quantity).toBe(2);
    expect(result[1]!.name).toBe("salt");
    expect(result[1]!.unit).toBe("tsp");
    expect(result[1]!.quantity).toBe(1);
    // "3 eggs" — regex treats "eggs" as unit, name falls back to full line
    expect(result[2]!.name).toBe("3 eggs");
    expect(result[2]!.unit).toBe("eggs");
    expect(result[2]!.quantity).toBe(3);
  });

  it("parses text with CRLF line endings", () => {
    const input = "2 cups flour\r\n1 tsp salt";
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(2);
  });

  it("skips blank lines in text input", () => {
    const input = "2 cups flour\n\n\n1 tsp salt\n";
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(2);
  });

  it("trims whitespace from lines in text input", () => {
    const input = "  2 cups flour  \n  1 tsp salt  ";
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe("flour");
    expect(result[1]!.name).toBe("salt");
  });

  it("sets preparationNotes to null for text format", () => {
    const input = "2 cups flour";
    const result = parseIngredientInput(input);
    expect(result[0]!.preparationNotes).toBeNull();
  });

  it("sets isOptional to false for text format", () => {
    const input = "2 cups flour";
    const result = parseIngredientInput(input);
    expect(result[0]!.isOptional).toBe(false);
  });

  // --- Edge cases ---
  it("handles JSON that looks like text (starts with [)", () => {
    const input = "[not valid json";
    // parseJsonArray returns null, so it falls through to text parsing
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("[not valid json");
  });

  it("handles single-line text input", () => {
    const input = "2 cups flour";
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(1);
  });

  it("handles ingredient with commas in name (text format)", () => {
    const input = "2 cups flour, all-purpose";
    const result = parseIngredientInput(input);
    expect(result[0]!.name).toBe("flour, all-purpose");
  });

  it("handles unicode characters in ingredient names", () => {
    const input = JSON.stringify([
      { name: "crème fraîche", quantity: 1, unit: "cup" },
    ]);
    const result = parseIngredientInput(input);
    expect(result[0]!.name).toBe("crème fraîche");
  });

  it("handles very long ingredient names", () => {
    const longName = "a".repeat(500);
    const input = JSON.stringify([{ name: longName, quantity: 1 }]);
    const result = parseIngredientInput(input);
    expect(result[0]!.name).toBe(longName);
  });

  it("handles JSON with extra unknown fields (ignores them)", () => {
    const input = JSON.stringify([
      { name: "salt", quantity: 1, unknownField: "ignored" },
    ]);
    const result = parseIngredientInput(input);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("salt");
  });

  // --- Regression: ensure no undefined values leak ---
  it("never produces undefined in output fields", () => {
    const testCases = [
      JSON.stringify([{ name: "test", quantity: 1 }]),
      "2 cups flour",
      JSON.stringify([{ name: "test", quantity: "abc", unit: "", notes: "" }]),
      JSON.stringify([
        null,
        undefined,
        { name: "" },
        { name: "ok", quantity: Number.NaN },
      ]),
    ];

    for (const input of testCases) {
      const result = parseIngredientInput(input);
      for (const item of result) {
        // Every field should be a concrete value, never undefined
        expect(item.name).toBeDefined();
        expect(typeof item.quantity).toBe("number");
        expect(typeof item.isOptional).toBe("boolean");
        // unit and preparationNotes can be null, which is fine
        expect(item.unit === null || typeof item.unit === "string").toBe(true);
        expect(
          item.preparationNotes === null ||
            typeof item.preparationNotes === "string"
        ).toBe(true);
      }
    }
  });
});
