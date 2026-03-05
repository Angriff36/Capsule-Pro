import type { IRExpression } from "@angriff36/manifest/ir";
import { describe, expect, it } from "vitest";
import { expressionToString } from "./ir-introspection.js";

describe("expressionToString", () => {
  it("renders null literal from nested IR value", () => {
    const expr = {
      kind: "literal",
      value: { kind: "null" },
    } as unknown as IRExpression;

    expect(expressionToString(expr)).toBe("null");
  });

  it("renders empty string literal with quotes", () => {
    const expr = {
      kind: "literal",
      value: { kind: "string", value: "" },
    } as unknown as IRExpression;

    expect(expressionToString(expr)).toBe('""');
  });

  it("renders non-empty string literal with quotes", () => {
    const expr = {
      kind: "literal",
      value: { kind: "string", value: "open" },
    } as unknown as IRExpression;

    expect(expressionToString(expr)).toBe('"open"');
  });

  it("renders number literal from nested IR value", () => {
    const expr = {
      kind: "literal",
      value: { kind: "number", value: 42 },
    } as unknown as IRExpression;

    expect(expressionToString(expr)).toBe("42");
  });

  it("renders boolean literal from nested IR value", () => {
    const expr = {
      kind: "literal",
      value: { kind: "boolean", value: false },
    } as unknown as IRExpression;

    expect(expressionToString(expr)).toBe("false");
  });

  it("renders nested binary expression for PrepTask claim guard", () => {
    const expr = {
      kind: "binary",
      operator: "and",
      left: {
        kind: "binary",
        operator: "!=",
        left: { kind: "identifier", name: "userId" },
        right: { kind: "literal", value: { kind: "string", value: "" } },
      },
      right: {
        kind: "binary",
        operator: "!=",
        left: { kind: "identifier", name: "userId" },
        right: { kind: "literal", value: { kind: "null" } },
      },
    } as unknown as IRExpression;

    expect(expressionToString(expr)).toBe('userId != "" and userId != null');
  });

  it("renders member expressions with nested binary expression", () => {
    const expr = {
      kind: "binary",
      operator: "or",
      left: {
        kind: "binary",
        operator: "==",
        left: {
          kind: "member",
          object: { kind: "identifier", name: "self" },
          property: "status",
        },
        right: { kind: "literal", value: { kind: "string", value: "open" } },
      },
      right: {
        kind: "binary",
        operator: "==",
        left: {
          kind: "member",
          object: { kind: "identifier", name: "self" },
          property: "status",
        },
        right: {
          kind: "literal",
          value: { kind: "string", value: "pending" },
        },
      },
    } as unknown as IRExpression;

    expect(expressionToString(expr)).toBe(
      'self.status == "open" or self.status == "pending"'
    );
  });

  it("renders member comparison to empty string literal", () => {
    const expr = {
      kind: "binary",
      operator: "==",
      left: {
        kind: "member",
        object: { kind: "identifier", name: "self" },
        property: "claimedBy",
      },
      right: { kind: "literal", value: { kind: "string", value: "" } },
    } as unknown as IRExpression;

    expect(expressionToString(expr)).toBe('self.claimedBy == ""');
  });
});
