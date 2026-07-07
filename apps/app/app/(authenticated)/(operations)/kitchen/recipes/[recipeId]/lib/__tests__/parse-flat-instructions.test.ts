import { describe, expect, it } from "vitest";
import { parseFlatInstructions } from "../parse-flat-instructions";

describe("parseFlatInstructions", () => {
  it("parses numbered lines into renumbered steps", () => {
    const text = "1. Mix the flour\n2) Add water\nStep 3: Knead the dough";
    expect(parseFlatInstructions(text)).toEqual([
      { instruction: "Mix the flour", stepNumber: 1 },
      { instruction: "Add water", stepNumber: 2 },
      { instruction: "Knead the dough", stepNumber: 3 },
    ]);
  });

  it("appends continuation lines to the current numbered step", () => {
    const text = "1. Sear the beef\nuntil deeply browned\n2. Rest 10 minutes";
    expect(parseFlatInstructions(text)).toEqual([
      { instruction: "Sear the beef until deeply browned", stepNumber: 1 },
      { instruction: "Rest 10 minutes", stepNumber: 2 },
    ]);
  });

  it("renumbers out-of-sequence numbers 1..N", () => {
    const text = "3. First thing\n7. Second thing";
    expect(parseFlatInstructions(text)).toEqual([
      { instruction: "First thing", stepNumber: 1 },
      { instruction: "Second thing", stepNumber: 2 },
    ]);
  });

  it("keeps preamble before the first numbered line as its own step", () => {
    const text = "Preheat the oven to 400F\n1. Roast the squash\n2. Blend";
    expect(parseFlatInstructions(text)).toEqual([
      { instruction: "Preheat the oven to 400F", stepNumber: 1 },
      { instruction: "Roast the squash", stepNumber: 2 },
      { instruction: "Blend", stepNumber: 3 },
    ]);
  });

  it("treats each non-empty line as a step when fewer than 2 numbered lines", () => {
    const text = "Mix everything together\n\nBake until golden\nCool on a rack";
    expect(parseFlatInstructions(text)).toEqual([
      { instruction: "Mix everything together", stepNumber: 1 },
      { instruction: "Bake until golden", stepNumber: 2 },
      { instruction: "Cool on a rack", stepNumber: 3 },
    ]);
  });

  it("keeps a lone numbered line verbatim in line mode", () => {
    const text = "1. Mix everything\nServe warm";
    expect(parseFlatInstructions(text)).toEqual([
      { instruction: "1. Mix everything", stepNumber: 1 },
      { instruction: "Serve warm", stepNumber: 2 },
    ]);
  });

  it("drops steps whose instruction ends up empty", () => {
    const text = "1.\n2. Add water\n3. Simmer";
    expect(parseFlatInstructions(text)).toEqual([
      { instruction: "Add water", stepNumber: 1 },
      { instruction: "Simmer", stepNumber: 2 },
    ]);
  });

  it("returns an empty array for empty or whitespace-only text", () => {
    expect(parseFlatInstructions("")).toEqual([]);
    expect(parseFlatInstructions("  \n\n\t")).toEqual([]);
  });

  it("handles CRLF line endings", () => {
    const text = "1. Chop onions\r\n2. Sweat in butter";
    expect(parseFlatInstructions(text)).toEqual([
      { instruction: "Chop onions", stepNumber: 1 },
      { instruction: "Sweat in butter", stepNumber: 2 },
    ]);
  });
});
