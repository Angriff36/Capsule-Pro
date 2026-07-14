/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * the Scheduling Requests RSC page ran two un-`select`ed `findMany`s —
 * `timeOffRequest.findMany` (take:50) returning all ~14 columns/row while the
 * row map consumes only 8, and `timecardEditRequest.findMany` (take:50) returning
 * all ~9 columns/row while the map consumes only 5. The sibling `user.findMany`
 * employee lookups already carried a select. Adding focused selects to the two
 * main reads drops the unused columns/row with zero behavior change (column
 * projection — take:50 + the unified serialized shape are identical).
 *
 * This test pins:
 *  1. timeOffRequest.findMany selects EXACTLY the 8 consumed fields.
 *  2. timecardEditRequest.findMany selects EXACTLY the 5 consumed fields.
 *  3. No reads fire when unauthenticated (the orgId guard short-circuits).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    timeOffRequest: { findMany: vi.fn() },
    timecardEditRequest: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import SchedulingRequestsPage from "../../app/(authenticated)/(tenant-team)/scheduling/requests/page";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const timeOffFindMany = database.timeOffRequest.findMany as ReturnType<
  typeof vi.fn
>;
const timecardFindMany = database.timecardEditRequest
  .findMany as ReturnType<typeof vi.fn>;
const userFindMany = database.user.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";

const timeOffFixture = [
  {
    id: "tor-1",
    employeeId: "emp-1",
    requestType: "VACATION",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-05"),
    reason: "Summer break",
    status: "PENDING",
    submittedAt: new Date("2026-07-01"),
  },
];
const timecardFixture = [
  {
    id: "tce-1",
    employeeId: "emp-2",
    reason: "Missed punch",
    status: "PENDING",
    createdAt: new Date("2026-07-10"),
  },
];
const employeesFixture = [
  { id: "emp-1", firstName: "Ada", lastName: "Lovelace", role: "Manager" },
  { id: "emp-2", firstName: null, lastName: null, role: null },
];

const TIME_OFF_SELECT = {
  id: true,
  employeeId: true,
  requestType: true,
  startDate: true,
  endDate: true,
  reason: true,
  status: true,
  submittedAt: true,
};
const TIMECARD_SELECT = {
  id: true,
  employeeId: true,
  reason: true,
  status: true,
  createdAt: true,
};

describe("SchedulingRequestsPage — focused selects (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    timeOffFindMany.mockResolvedValue(timeOffFixture);
    timecardFindMany.mockResolvedValue(timecardFixture);
    userFindMany.mockResolvedValue(employeesFixture);
  });

  it("selects ONLY the 8 consumed time-off fields", async () => {
    await SchedulingRequestsPage();

    expect(timeOffFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: { submittedAt: "desc" },
        take: 50,
        select: TIME_OFF_SELECT,
      })
    );
  });

  it("selects ONLY the 5 consumed timecard-edit fields", async () => {
    await SchedulingRequestsPage();

    expect(timecardFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: TIMECARD_SELECT,
      })
    );
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ orgId: null });

    // The page returns an "Unauthorized" element (no throw) and reads nothing.
    const result = await SchedulingRequestsPage();
    expect(result).toBeDefined();

    expect(timeOffFindMany).not.toHaveBeenCalled();
    expect(timecardFindMany).not.toHaveBeenCalled();
  });
});
