/**
 * Tests for zod-from-ir.ts — IR parameter type → Zod schema conversion.
 *
 * Pure logic, zero external dependencies beyond zod itself.
 * Tests the invariant: "Every IR type maps to a correct Zod schema."
 */

import { describe, expect, it } from "vitest";
import { describeIrType, irParamsToZodSchema } from "./zod-from-ir.js";

// ---------------------------------------------------------------------------
// irParamsToZodSchema
// ---------------------------------------------------------------------------

describe("irParamsToZodSchema", () => {
  it("creates a schema from an empty parameter list", () => {
    const schema = irParamsToZodSchema([]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("maps string type correctly", () => {
    const schema = irParamsToZodSchema([
      { name: "title", type: { name: "string" }, modifiers: ["required"] },
    ]);
    expect(schema.safeParse({ title: "hello" }).success).toBe(true);
    expect(schema.safeParse({ title: 123 }).success).toBe(false);
  });

  it("maps number types correctly (number, integer, float, decimal)", () => {
    for (const typeName of ["number", "integer", "float", "decimal"]) {
      const schema = irParamsToZodSchema([
        { name: "value", type: { name: typeName }, modifiers: ["required"] },
      ]);
      expect(schema.safeParse({ value: 42 }).success).toBe(true);
      expect(schema.safeParse({ value: "not-a-number" }).success).toBe(false);
    }
  });

  it("maps boolean type correctly", () => {
    const schema = irParamsToZodSchema([
      { name: "active", type: { name: "boolean" }, modifiers: ["required"] },
    ]);
    expect(schema.safeParse({ active: true }).success).toBe(true);
    expect(schema.safeParse({ active: false }).success).toBe(true);
    expect(schema.safeParse({ active: "yes" }).success).toBe(false);
  });

  it("maps date/datetime types to string", () => {
    for (const typeName of ["date", "datetime"]) {
      const schema = irParamsToZodSchema([
        { name: "when", type: { name: typeName }, modifiers: ["required"] },
      ]);
      expect(schema.safeParse({ when: "2026-01-01T00:00:00Z" }).success).toBe(
        true
      );
      // Dates are strings in IR, so numbers should fail
      expect(schema.safeParse({ when: 12_345 }).success).toBe(false);
    }
  });

  it("maps json/object types to record", () => {
    for (const typeName of ["json", "object"]) {
      const schema = irParamsToZodSchema([
        { name: "data", type: { name: typeName }, modifiers: ["required"] },
      ]);
      expect(schema.safeParse({ data: { key: "value" } }).success).toBe(true);
    }
  });

  it("maps array type correctly", () => {
    const schema = irParamsToZodSchema([
      { name: "items", type: { name: "array" }, modifiers: ["required"] },
    ]);
    expect(schema.safeParse({ items: [1, 2, 3] }).success).toBe(true);
    expect(schema.safeParse({ items: "not-array" }).success).toBe(false);
  });

  it("maps unknown types to string with description", () => {
    const schema = irParamsToZodSchema([
      {
        name: "custom",
        type: { name: "CustomType" },
        modifiers: ["required"],
      },
    ]);
    // Unknown types fall back to string
    expect(schema.safeParse({ custom: "some-value" }).success).toBe(true);
  });

  it("handles nullable types", () => {
    const schema = irParamsToZodSchema([
      {
        name: "notes",
        type: { name: "string", nullable: true },
        modifiers: ["required"],
      },
    ]);
    expect(schema.safeParse({ notes: "hello" }).success).toBe(true);
    expect(schema.safeParse({ notes: null }).success).toBe(true);
  });

  it("makes non-required params optional", () => {
    const schema = irParamsToZodSchema([
      { name: "title", type: { name: "string" }, modifiers: ["required"] },
      { name: "notes", type: { name: "string" } },
    ]);
    // Both provided
    expect(schema.safeParse({ title: "hi", notes: "note" }).success).toBe(true);
    // Optional omitted
    expect(schema.safeParse({ title: "hi" }).success).toBe(true);
    // Required omitted
    expect(schema.safeParse({ notes: "note" }).success).toBe(false);
  });

  it("handles params with no modifiers as optional", () => {
    const schema = irParamsToZodSchema([
      { name: "optional", type: { name: "string" } },
    ]);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ optional: "value" }).success).toBe(true);
  });

  it("handles multiple params of different types", () => {
    const schema = irParamsToZodSchema([
      { name: "name", type: { name: "string" }, modifiers: ["required"] },
      { name: "count", type: { name: "number" }, modifiers: ["required"] },
      { name: "active", type: { name: "boolean" } },
      { name: "tags", type: { name: "array" } },
    ]);
    expect(
      schema.safeParse({ name: "test", count: 5, active: true, tags: ["a"] })
        .success
    ).toBe(true);
    expect(schema.safeParse({ name: "test", count: 5 }).success).toBe(true);
    expect(schema.safeParse({ count: 5 }).success).toBe(false); // missing required name
  });
});

// ---------------------------------------------------------------------------
// describeIrType
// ---------------------------------------------------------------------------

describe("describeIrType", () => {
  it("returns the type name for non-nullable types", () => {
    expect(describeIrType({ name: "string" })).toBe("string");
    expect(describeIrType({ name: "number" })).toBe("number");
    expect(describeIrType({ name: "boolean" })).toBe("boolean");
    expect(describeIrType({ name: "CustomType" })).toBe("CustomType");
  });

  it("appends ' | null' for nullable types", () => {
    expect(describeIrType({ name: "string", nullable: true })).toBe(
      "string | null"
    );
    expect(describeIrType({ name: "number", nullable: true })).toBe(
      "number | null"
    );
  });

  it("does not append ' | null' when nullable is false", () => {
    expect(describeIrType({ name: "string", nullable: false })).toBe("string");
  });
});
