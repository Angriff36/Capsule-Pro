/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan item #7): getAvailableEmployees backs
 * the available-staff list on the shift create/edit form
 * (`scheduling/shifts/components/shift-form.tsx`). It previously ran 1 + 2N
 * queries — one user.findMany to load employees, then a scheduleShift.findMany
 * + a location.findMany PER employee (2 round-trips × headcount). A
 * 100-employee tenant paid ~201 queries every time the form opened. The two
 * per-employee fan-out reads collapse to two batched queries keyed on the whole
 * employee set: 1 + 2N → 3 round-trips, independent of headcount.
 *
 * This test pins:
 *  1. scheduleShift.findMany + location.findMany each fire ONCE regardless of
 *     employee count, with the conflict query scoped via `employeeId: { in: [...] }`
 *     (the N+1 is gone).
 *  2. Conflicts group back to the correct employee, each slice shiftStart-sorted.
 *  3. locationName maps via the batched location set; a null locationId → "".
 *  4. The location query is skipped when no conflicts exist.
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
    user: { findMany: vi.fn() },
    scheduleShift: { findMany: vi.fn() },
    location: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { getAvailableEmployees } from "../../app/(authenticated)/(tenant-team)/scheduling/shifts/actions";

// `auth`'s real type (AuthFn) doesn't structurally overlap Mock; bridge via
// unknown — at runtime the vi.mock factory replaces it with a vi.fn().
const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const userFindMany = database.user.findMany as ReturnType<typeof vi.fn>;
const shiftFindMany = database.scheduleShift.findMany as ReturnType<
  typeof vi.fn
>;
const locationFindMany = database.location.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";

const employee = (id: string, lastName: string) => ({
  id,
  firstName: "x",
  lastName,
  email: `${id}@x`,
  role: "cook",
  isActive: true,
});

describe("getAvailableEmployees — batched conflict lookup (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID, userId: "u1" });
    tenantMock.mockResolvedValue(TENANT_ID);
  });

  it("fires scheduleShift + location findMany once each regardless of headcount (N+1 gone)", async () => {
    userFindMany.mockResolvedValue([
      employee("e1", "Lovelace"),
      employee("e2", "Nini"),
      employee("e3", "Ohta"),
    ]);
    // Global orderBy is [employeeId asc, shiftStart asc] → provide data in that
    // order. e1 has two conflicts (must stay shiftStart-sorted), e2 one (null
    // locationId → ""), e3 none.
    shiftFindMany.mockResolvedValue([
      {
        id: "s1a",
        employeeId: "e1",
        shiftStart: 1,
        shiftEnd: 2,
        locationId: "loc-b",
      },
      {
        id: "s1b",
        employeeId: "e1",
        shiftStart: 2,
        shiftEnd: 3,
        locationId: "loc-a",
      },
      {
        id: "s2",
        employeeId: "e2",
        shiftStart: 1,
        shiftEnd: 2,
        locationId: null,
      },
    ]);
    locationFindMany.mockResolvedValue([
      { id: "loc-a", name: "Kitchen A" },
      { id: "loc-b", name: "Kitchen B" },
    ]);

    const result = await getAvailableEmployees({
      shiftStart: "2026-01-01T00:00:00Z",
      shiftEnd: "2026-01-01T08:00:00Z",
    });

    // N+1 collapse proof: ONE scheduleShift.findMany scoped to the whole set,
    // ONE location.findMany — not 3 + 3.
    expect(shiftFindMany).toHaveBeenCalledTimes(1);
    expect(shiftFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employeeId: { in: ["e1", "e2", "e3"] },
        }),
        orderBy: [{ employeeId: "asc" }, { shiftStart: "asc" }],
      })
    );
    expect(locationFindMany).toHaveBeenCalledTimes(1);

    // Employee order preserved (lastName asc from user.findMany).
    expect(result.employees.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);

    // e1: two conflicts, shiftStart-sorted, locationName mapped per shift.
    const e1 = result.employees.find((e) => e.id === "e1");
    expect(e1?.hasConflictingShift).toBe(true);
    expect(e1?.conflictingShifts.map((s) => s.id)).toEqual(["s1a", "s1b"]);
    expect(e1?.conflictingShifts.map((s) => s.locationName)).toEqual([
      "Kitchen B",
      "Kitchen A",
    ]);

    // e2: null locationId degrades to "" (the prior `[...null]` spread was a
    // latent runtime bug; the batched filter drops nulls before the query).
    const e2 = result.employees.find((e) => e.id === "e2");
    expect(e2?.conflictingShifts[0]?.locationName).toBe("");

    // e3: no conflicts.
    const e3 = result.employees.find((e) => e.id === "e3");
    expect(e3?.hasConflictingShift).toBe(false);
    expect(e3?.conflictingShifts).toEqual([]);
  });

  it("skips the location query when no conflicts exist", async () => {
    userFindMany.mockResolvedValue([employee("e1", "Lovelace")]);
    shiftFindMany.mockResolvedValue([]);

    const result = await getAvailableEmployees({
      shiftStart: "2026-01-01T00:00:00Z",
      shiftEnd: "2026-01-01T08:00:00Z",
    });

    expect(shiftFindMany).toHaveBeenCalledTimes(1);
    expect(locationFindMany).not.toHaveBeenCalled();
    expect(result.employees[0]?.hasConflictingShift).toBe(false);
  });

  it("returns an empty list and skips conflict/location queries when no employees match", async () => {
    userFindMany.mockResolvedValue([]);

    const result = await getAvailableEmployees({
      shiftStart: "2026-01-01T00:00:00Z",
      shiftEnd: "2026-01-01T08:00:00Z",
    });

    expect(result).toEqual({ employees: [] });
    expect(shiftFindMany).not.toHaveBeenCalled();
    expect(locationFindMany).not.toHaveBeenCalled();
  });

  it("throws before any DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ orgId: null });

    await expect(
      getAvailableEmployees({
        shiftStart: "2026-01-01T00:00:00Z",
        shiftEnd: "2026-01-01T08:00:00Z",
      })
    ).rejects.toThrow("Not authenticated");

    expect(userFindMany).not.toHaveBeenCalled();
    expect(shiftFindMany).not.toHaveBeenCalled();
  });
});
