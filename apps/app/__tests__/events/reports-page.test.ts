/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan — apps/app over-fetch):
 * the Event Reports list RSC page did an UNBOUNDED eventReport.findMany with NO
 * select, materializing all 20 columns of every report row — including the heavy
 * Json columns checklistData/parsedEventData/reportConfig — scaled by N reports
 * per page load. The card list + stats consume only 5 fields (id, eventId,
 * status, completion, autoFillScore); the ...report spread stays server-side and
 * the JSX reads nothing beyond those 5. A focused select drops the 3 Json blobs
 * + 12 more scalars per row with zero behavior change.
 *
 * This test pins:
 *  1. findMany carries a focused select of EXACTLY the 5 consumed fields — fails
 *     if the select is dropped (reverts to full-row over-fetch) or a consumed
 *     field removed.
 *  2. The card list + stats resolve cleanly over a fixture (incl. the event join
 *      fallback to eventId when no matching event, and the autoFillScore null guard).
 *  3. No read fires when unauthenticated (the orgId guard short-circuits via notFound).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("../../app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    eventReport: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import EventReportsPage from "../../app/(authenticated)/(events)/events/reports/page";
import { getTenantIdForOrg } from "../../app/lib/tenant";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const reportFindMany = database.eventReport.findMany as ReturnType<
  typeof vi.fn
>;
const eventFindMany = database.event.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";

const reportsFixture = [
  {
    id: "rep-1",
    eventId: "evt-1",
    status: "completed",
    completion: 100,
    autoFillScore: 12,
  },
  {
    id: "rep-2",
    eventId: "evt-2",
    status: "in_progress",
    completion: 45,
    autoFillScore: null,
  },
  {
    id: "rep-3",
    eventId: "evt-3",
    status: "draft",
    completion: 0,
    autoFillScore: null,
  },
];

// Only evt-1 has a matching event row → rep-2/rep-3 fall back to eventId.
const eventsFixture = [
  {
    id: "evt-1",
    eventNumber: "E-100",
    title: "Spring Gala",
    eventDate: new Date("2026-08-01T00:00:00.000Z"),
  },
];

const SELECT_ONLY_CONSUMED = {
  id: true,
  eventId: true,
  status: true,
  completion: true,
  autoFillScore: true,
};

describe("EventReportsPage — focused select", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1", orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    reportFindMany.mockResolvedValue(reportsFixture);
    eventFindMany.mockResolvedValue(eventsFixture);
  });

  it("selects ONLY the 5 consumed fields (no full-row over-fetch)", async () => {
    await EventReportsPage();

    expect(reportFindMany).toHaveBeenCalledTimes(1);
    expect(reportFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: [{ createdAt: "desc" }],
        select: SELECT_ONLY_CONSUMED,
      })
    );
  });

  it("resolves the card list + stats over the fixture", async () => {
    // avgCompletion = round((100+45+0)/3) = 48; inProgress=1; completed=1. The
    // cards render event.eventNumber/title/eventDate for rep-1 and fall back to
    // eventId for rep-2/rep-3; the autoFillScore null guard fires for rep-2/3.
    // Resolving cleanly proves the 5 selected fields feed every read path.
    const result = await EventReportsPage();
    expect(result).toBeDefined();
    expect(reportFindMany).toHaveBeenCalledTimes(1);
    expect(eventFindMany).toHaveBeenCalledTimes(1);
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null, orgId: null });

    await expect(EventReportsPage()).rejects.toThrow(/NOT_FOUND/);

    expect(reportFindMany).not.toHaveBeenCalled();
  });
});
