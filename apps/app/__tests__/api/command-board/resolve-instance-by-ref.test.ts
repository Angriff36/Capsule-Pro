// @vitest-environment node
import { describe, expect, it } from "vitest";
import { selectInstanceByRef } from "@/app/api/command-board/chat/tool-registry";

const events: Record<string, unknown>[] = [
  { id: "evt_1", title: "Smith Wedding", eventNumber: "EV-1001" },
  { id: "evt_2", title: "Jones Anniversary", eventNumber: "EV-1002" },
  { id: "evt_3", title: "Smith Corporate Retreat", eventNumber: "EV-1003" },
];

describe("selectInstanceByRef", () => {
  it("passes a bare id through without scanning rows", () => {
    expect(
      selectInstanceByRef("Event", "550e8400-e29b-41d4-a716-446655440000", [])
    ).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000", note: "" });
  });

  it("resolves an exact name match (case-insensitive)", () => {
    expect(selectInstanceByRef("Event", "smith wedding", events).id).toBe(
      "evt_1"
    );
  });

  it("prefers an exact match over partial matches of the same needle", () => {
    // "Smith Wedding" exact-matches one row even though "Smith" is a substring
    // of another — exact must win, not bail as ambiguous.
    expect(selectInstanceByRef("Event", "Smith Wedding", events).id).toBe(
      "evt_1"
    );
  });

  it("resolves a unique partial match", () => {
    expect(selectInstanceByRef("Event", "anniversary", events).id).toBe(
      "evt_2"
    );
  });

  it("refuses to guess when a partial reference is ambiguous", () => {
    const result = selectInstanceByRef("Event", "smith", events);
    expect(result.id).toBeNull();
    expect(result.note).toMatch(/multiple/i);
  });

  it("matches by a secondary name field (eventNumber)", () => {
    expect(selectInstanceByRef("Event", "EV-1003", events).id).toBe("evt_3");
  });

  it("returns null with a note when nothing matches", () => {
    const result = selectInstanceByRef("Event", "nonexistent gala", events);
    expect(result.id).toBeNull();
    expect(result.note).toMatch(/no event found/i);
  });

  it("treats an exact id field match as a direct hit", () => {
    expect(selectInstanceByRef("Event", "evt_2", events).id).toBe("evt_2");
  });
});
