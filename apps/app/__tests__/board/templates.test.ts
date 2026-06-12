import { describe, expect, it } from "vitest";
import {
  computeBranchStatus,
  resolveTemplate,
} from "@/app/(authenticated)/events/[eventId]/board/templates";

describe("resolveTemplate", () => {
  it("returns the plated_dinner template for its eventType", () => {
    const t = resolveTemplate("plated_dinner");
    expect(t.key).toBe("plated_dinner");
    expect(t.branches.find((b) => b.key === "staff")?.requirement).toBe(
      "required"
    );
  });

  it("falls back to the general template for unknown eventTypes", () => {
    expect(resolveTemplate("zombie_party").key).toBe("general");
  });

  it("drop_off excludes equipment", () => {
    const t = resolveTemplate("drop_off");
    expect(t.branches.find((b) => b.key === "equipment")?.requirement).toBe(
      "excluded"
    );
  });
});

describe("computeBranchStatus", () => {
  it("staff requirement scales with guest count (1 per 20, min 1)", () => {
    const t = resolveTemplate("plated_dinner");
    const s = computeBranchStatus(t, {
      guestCount: 120,
      counts: { staff: 4, menu: 0, vehicles: 0, equipment: 0, battleboard: 0 },
    });
    const staff = s.branches.find((b) => b.key === "staff");
    expect(staff?.needed).toBe(6);
    expect(staff?.have).toBe(4);
    expect(staff?.state).toBe("partial");
  });

  it("excluded branches don't count toward readiness", () => {
    const t = resolveTemplate("drop_off");
    const s = computeBranchStatus(t, {
      guestCount: 40,
      counts: { staff: 2, menu: 1, vehicles: 1, equipment: 0, battleboard: 0 },
    });
    expect(s.branches.find((b) => b.key === "equipment")?.state).toBe(
      "excluded"
    );
    expect(s.readyPercent).toBeGreaterThan(0);
  });

  it("readyPercent is 100 when all required branches are satisfied", () => {
    const t = resolveTemplate("general");
    const s = computeBranchStatus(t, {
      guestCount: 10,
      counts: { staff: 1, menu: 1, vehicles: 1, equipment: 1, battleboard: 1 },
    });
    expect(s.readyPercent).toBe(100);
  });
});
