/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan item #7): getSchedules backs the
 * schedule list on the shift create/edit form
 * (`scheduling/shifts/components/shift-form.tsx`). It previously ran a
 * `Promise.all` over the page of schedules calling `scheduleShift.count()`
 * PER schedule — N count queries scaling with the page size (take: 50 → up to
 * 50 round-trips every time the form opened). The fan-out collapses to ONE
 * `scheduleShift.groupBy({ by: ["scheduleId"], _count })` scoped to the whole
 * page: N → 1 round-trip, regardless of how many schedules load. Same shape as
 * the shipped `logistics/vehicles/list` `driver.count`→`groupBy` fix.
 *
 * This test pins:
 *  1. scheduleShift.groupBy fires ONCE with `scheduleId: { in: [...] }` +
 *     `_count: { scheduleId: true }`; the per-schedule `count` is NEVER called.
 *  2. Counts map back to the right schedule; a schedule with zero shifts
 *     (absent from the groupBy result) → 0 via Map miss.
 *  3. The groupBy is skipped when there are no schedules (no `in: []` query).
 *  4. shift_count is a BigInt, matching the prior `BigInt(count)` shape.
 *  5. Auth guard throws before any DB read.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest-command", () => ({ runManifestCommand: vi.fn() }));

vi.mock("@repo/database", () => ({
  database: {
    schedule: { findMany: vi.fn() },
    location: { findMany: vi.fn() },
    scheduleShift: { groupBy: vi.fn(), count: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { getSchedules } from "../../app/(authenticated)/(tenant-team)/scheduling/shifts/actions";

// `auth`'s real type (AuthFn) doesn't structurally overlap Mock; bridge via
// unknown — at runtime the vi.mock factory replaces it with a vi.fn().
const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const scheduleFindMany = database.schedule.findMany as ReturnType<typeof vi.fn>;
const locationFindMany = database.location.findMany as ReturnType<typeof vi.fn>;
const shiftGroupBy = database.scheduleShift.groupBy as ReturnType<typeof vi.fn>;
const shiftCount = database.scheduleShift.count as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";

describe("getSchedules — batched shift-count lookup (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID, userId: "u1" });
    tenantMock.mockResolvedValue(TENANT_ID);
  });

  it("fires scheduleShift.groupBy once scoped to all schedule ids; per-schedule count never called (N+1 gone)", async () => {
    scheduleFindMany.mockResolvedValue([
      {
        id: "sch-1",
        scheduleDate: new Date("2026-01-02T00:00:00Z"),
        status: "DRAFT",
        locationId: "loc-1",
      },
      {
        id: "sch-2",
        scheduleDate: new Date("2026-01-03T00:00:00Z"),
        status: "PUBLISHED",
        locationId: null,
      },
      {
        id: "sch-3",
        scheduleDate: new Date("2026-01-04T00:00:00Z"),
        status: "DRAFT",
        locationId: "loc-2",
      },
    ]);
    locationFindMany.mockResolvedValue([
      { id: "loc-1", name: "Kitchen" },
      { id: "loc-2", name: "Bar" },
    ]);
    // sch-2 absent → 0 shifts (Map miss); sch-1 has 5, sch-3 has 2.
    shiftGroupBy.mockResolvedValue([
      { scheduleId: "sch-1", _count: { scheduleId: 5 } },
      { scheduleId: "sch-3", _count: { scheduleId: 2 } },
    ]);

    const result = await getSchedules();

    // N+1 collapse proof: ONE groupBy scoped to the whole page, count NEVER.
    expect(shiftGroupBy).toHaveBeenCalledTimes(1);
    expect(shiftGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["scheduleId"],
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          scheduleId: { in: ["sch-1", "sch-2", "sch-3"] },
          deletedAt: null,
        }),
        _count: { scheduleId: true },
      })
    );
    expect(shiftCount).not.toHaveBeenCalled();

    // Schedule order preserved; counts + location_name mapped correctly.
    expect(result.schedules.map((s) => s.id)).toEqual([
      "sch-1",
      "sch-2",
      "sch-3",
    ]);
    const sch1 = result.schedules.find((s) => s.id === "sch-1");
    const sch2 = result.schedules.find((s) => s.id === "sch-2");
    const sch3 = result.schedules.find((s) => s.id === "sch-3");
    expect(sch1?.shift_count).toBe(BigInt(5));
    expect(sch1?.location_name).toBe("Kitchen");
    // sch-2: zero shifts (Map miss → 0) + null locationId → "".
    expect(sch2?.shift_count).toBe(BigInt(0));
    expect(sch2?.location_id).toBe("");
    expect(sch2?.location_name).toBe("");
    expect(sch3?.shift_count).toBe(BigInt(2));
    expect(sch3?.location_name).toBe("Bar");

    // shift_count stays a BigInt (matches the prior BigInt(count) shape).
    expect(typeof sch1?.shift_count).toBe("bigint");
  });

  it("skips the groupBy when no schedules match (no in:[] round-trip)", async () => {
    scheduleFindMany.mockResolvedValue([]);

    const result = await getSchedules();

    expect(result).toEqual({ schedules: [] });
    expect(shiftGroupBy).not.toHaveBeenCalled();
    expect(shiftCount).not.toHaveBeenCalled();
  });

  it("throws before any DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(getSchedules()).rejects.toThrow("Not authenticated");

    expect(scheduleFindMany).not.toHaveBeenCalled();
    expect(shiftGroupBy).not.toHaveBeenCalled();
  });
});
