import { describe, expect, it } from "vitest";
import { computeStaffImpact } from "@/app/(authenticated)/events/[eventId]/board/impact";

const drafts = [
  {
    cardId: "c1",
    staffMemberId: "u1",
    shiftStart: "2026-06-28T16:00:00.000Z",
    shiftEnd: "2026-06-28T23:00:00.000Z",
  },
  {
    cardId: "c2",
    staffMemberId: "u2",
    shiftStart: "2026-06-28T16:00:00.000Z",
    shiftEnd: "2026-06-28T22:00:00.000Z",
  },
];

describe("computeStaffImpact", () => {
  it("sums labor cost from hourly rates without float artifacts", () => {
    const r = computeStaffImpact({
      drafts,
      rates: { u1: "28.50", u2: "21.10" }, // 7h*28.50 + 6h*21.10 = 199.50 + 126.60 = 326.10
      busyIntervals: {},
    });
    expect(r.laborCost).toBe("326.10");
    expect(r.totalHours).toBe(13);
  });

  it("treats missing rates as 0 and reports them", () => {
    const r = computeStaffImpact({
      drafts,
      rates: { u1: "28.50" },
      busyIntervals: {},
    });
    expect(r.laborCost).toBe("199.50");
    expect(r.missingRateStaffIds).toEqual(["u2"]);
  });

  it("flags overlapping busy intervals as conflicts", () => {
    const r = computeStaffImpact({
      drafts,
      rates: {},
      busyIntervals: {
        u1: [
          {
            start: "2026-06-28T18:00:00.000Z",
            end: "2026-06-28T20:00:00.000Z",
            label: "Henderson wedding",
          },
        ],
        u2: [
          {
            start: "2026-06-29T18:00:00.000Z",
            end: "2026-06-29T20:00:00.000Z",
            label: "next day",
          },
        ],
      },
    });
    expect(r.conflicts).toEqual([
      { cardId: "c1", staffMemberId: "u1", with: "Henderson wedding" },
    ]);
  });

  it("does not flag back-to-back (touching, non-overlapping) intervals", () => {
    const r = computeStaffImpact({
      drafts: drafts.slice(0, 1),
      rates: {},
      busyIntervals: {
        u1: [
          {
            start: "2026-06-28T23:00:00.000Z",
            end: "2026-06-29T02:00:00.000Z",
            label: "late gig",
          },
        ],
      },
    });
    expect(r.conflicts).toEqual([]);
  });
});
