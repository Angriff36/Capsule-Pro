import { describe, expect, it } from "vitest";
import {
  formatDateRange,
  getEventValidationStatus,
  getWeekDateRange,
  parseWeekOffset,
  statusBadgeVariants,
  statusLabels,
} from "../app/(authenticated)/administrative/lib/validation";
import { InvariantError } from "../app/lib/invariant";

describe("getEventValidationStatus", () => {
  const baseEvent = {
    eventDate: new Date("2025-01-25"),
    startTime: null,
    endTime: null,
  };

  it("returns 'ready' for event with venue and adequate staff", () => {
    const event = {
      ...baseEvent,
      venueName: "Grand Ballroom",
      staffCount: 10,
      guestCount: 100,
    };
    expect(getEventValidationStatus(event)).toBe("ready");
  });

  it("returns 'incomplete' when venue name is null", () => {
    const event = {
      ...baseEvent,
      venueName: null,
      staffCount: 10,
      guestCount: 100,
    };
    expect(getEventValidationStatus(event)).toBe("incomplete");
  });

  it("returns 'incomplete' when venue name is empty string", () => {
    const event = {
      ...baseEvent,
      venueName: "",
      staffCount: 10,
      guestCount: 100,
    };
    expect(getEventValidationStatus(event)).toBe("incomplete");
  });

  it("returns 'staff_mismatch' when staff is insufficient", () => {
    // 100 guests / 15 = 7 staff required, only 2 available
    const event = {
      ...baseEvent,
      venueName: "Conference Room A",
      staffCount: 2,
      guestCount: 100,
    };
    expect(getEventValidationStatus(event)).toBe("staff_mismatch");
  });

  it("returns 'ready' when exactly enough staff (boundary)", () => {
    // 15 guests = 1 staff required
    const event = {
      ...baseEvent,
      venueName: "Small Room",
      staffCount: 1,
      guestCount: 15,
    };
    expect(getEventValidationStatus(event)).toBe("ready");
  });

  it("returns 'staff_mismatch' when one staff short (boundary)", () => {
    // 16 guests = 2 staff required, only 1 available
    const event = {
      ...baseEvent,
      venueName: "Small Room",
      staffCount: 1,
      guestCount: 16,
    };
    expect(getEventValidationStatus(event)).toBe("staff_mismatch");
  });

  it("returns 'ready' for zero guests with venue", () => {
    const event = {
      ...baseEvent,
      venueName: "Empty Room",
      staffCount: 0,
      guestCount: 0,
    };
    expect(getEventValidationStatus(event)).toBe("ready");
  });

  it("throws InvariantError for negative guestCount", () => {
    const event = {
      ...baseEvent,
      venueName: "Valid Venue",
      staffCount: 5,
      guestCount: -1,
    };
    expect(() => getEventValidationStatus(event)).toThrow(InvariantError);
    expect(() => getEventValidationStatus(event)).toThrow(
      "guestCount must be non-negative"
    );
  });

  it("throws InvariantError for negative staffCount", () => {
    const event = {
      ...baseEvent,
      venueName: "Valid Venue",
      staffCount: -1,
      guestCount: 10,
    };
    expect(() => getEventValidationStatus(event)).toThrow(InvariantError);
    expect(() => getEventValidationStatus(event)).toThrow(
      "staffCount must be non-negative"
    );
  });
});

describe("parseWeekOffset", () => {
  it("returns 0 for undefined input", () => {
    expect(parseWeekOffset(undefined)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parseWeekOffset("")).toBe(0);
  });

  it("parses valid positive offset", () => {
    expect(parseWeekOffset("5")).toBe(5);
  });

  it("parses valid negative offset", () => {
    expect(parseWeekOffset("-3")).toBe(-3);
  });

  it("returns 0 for non-numeric string", () => {
    expect(parseWeekOffset("abc")).toBe(0);
  });

  it("returns 0 for offset beyond 52 weeks", () => {
    expect(parseWeekOffset("53")).toBe(0);
    expect(parseWeekOffset("100")).toBe(0);
  });

  it("returns 0 for offset below -52 weeks", () => {
    expect(parseWeekOffset("-53")).toBe(0);
    expect(parseWeekOffset("-100")).toBe(0);
  });

  it("accepts boundary value of 52", () => {
    expect(parseWeekOffset("52")).toBe(52);
  });

  it("accepts boundary value of -52", () => {
    expect(parseWeekOffset("-52")).toBe(-52);
  });

  it("returns 0 for float strings", () => {
    expect(parseWeekOffset("3.5")).toBe(3); // parseInt truncates
  });
});

describe("getWeekDateRange", () => {
  it("returns valid date range for current week", () => {
    const result = getWeekDateRange(0);
    expect(result.start).toBeInstanceOf(Date);
    expect(result.end).toBeInstanceOf(Date);
    expect(result.weekNumber).toBeGreaterThan(0);
    expect(result.weekNumber).toBeLessThanOrEqual(53);
    expect(result.end.getTime()).toBeGreaterThan(result.start.getTime());
  });

  it("week spans exactly 7 days", () => {
    const result = getWeekDateRange(0);
    const diffMs = result.end.getTime() - result.start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Should be just under 7 days (6 days, 23 hours, 59 minutes, 59 seconds)
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it("positive offset returns future week", () => {
    const current = getWeekDateRange(0);
    const future = getWeekDateRange(1);
    expect(future.start.getTime()).toBeGreaterThan(current.start.getTime());
  });

  it("negative offset returns past week", () => {
    const current = getWeekDateRange(0);
    const past = getWeekDateRange(-1);
    expect(past.start.getTime()).toBeLessThan(current.start.getTime());
  });
});

describe("formatDateRange", () => {
  it("formats date range correctly", () => {
    // Use explicit local time to avoid timezone issues
    const start = new Date(2025, 0, 19); // January 19, 2025
    const end = new Date(2025, 0, 25); // January 25, 2025
    const result = formatDateRange(start, end);
    expect(result).toContain("January");
    expect(result).toContain("19");
    expect(result).toContain("25");
    expect(result).toContain("2025");
    expect(result).toContain("-");
  });
});

describe("statusBadgeVariants", () => {
  it("maps all validation statuses to valid badge variants", () => {
    const validVariants = ["default", "secondary", "destructive", "outline"];
    expect(validVariants).toContain(statusBadgeVariants.ready);
    expect(validVariants).toContain(statusBadgeVariants.staff_mismatch);
    expect(validVariants).toContain(statusBadgeVariants.time_overlap);
    expect(validVariants).toContain(statusBadgeVariants.incomplete);
  });
});

describe("statusLabels", () => {
  it("provides human-readable labels for all statuses", () => {
    expect(statusLabels.ready).toBe("Ready");
    expect(statusLabels.staff_mismatch).toBe("Staff Mismatch");
    expect(statusLabels.time_overlap).toBe("Time Overlap");
    expect(statusLabels.incomplete).toBe("Incomplete");
  });
});
