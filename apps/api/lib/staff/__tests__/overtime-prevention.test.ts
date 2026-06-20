import { describe, expect, it } from "vitest";
import { computeShiftHours, getWeekStart } from "../overtime-prevention";

describe("overtime-prevention", () => {
  it("computes shift hours from start/end", () => {
    const start = new Date("2026-06-16T09:00:00Z");
    const end = new Date("2026-06-16T17:00:00Z");
    expect(computeShiftHours(start, end)).toBe(8);
  });

  it("returns zero for invalid intervals", () => {
    const t = new Date("2026-06-16T09:00:00Z");
    expect(computeShiftHours(t, t)).toBe(0);
  });

  it("returns Monday for week start", () => {
    // Wednesday June 17 2026
    const wed = new Date("2026-06-17T12:00:00");
    const monday = getWeekStart(wed);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(15);
  });
});
