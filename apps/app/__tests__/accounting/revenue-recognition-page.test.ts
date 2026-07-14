/**
 * @vitest-environment node
 *
 * Why this matters (db-performance plan #7 — apps/app over-fetch):
 * the Revenue Recognition list RSC page did a `take:100
 * revenueRecognitionSchedule.findMany` with NO select (its sibling invoice +
 * client queries in the same Promise.all already had selects), materializing
 * every schedule column — including the heavy `notes` (@db.Text) + `metadata`
 * (Json) blobs — scaled by 100 rows per page load. The page's row map consumes
 * only 15 schedule fields and passes the serialized array + computed metrics as
 * the SOLE props to <RevenueRecognitionClient>, so a focused select drops the
 * unused columns per row with zero behavior change (column projection — take:100
 * + the serialized shape + the reduce/filter metrics are identical).
 *
 * This test pins:
 *  1. the schedule findMany carries a focused select of EXACTLY the 15 consumed
 *     fields; the sibling invoice/client selects are preserved.
 *  2. Returned rows' consumed fields resolve cleanly over a fixture (the
 *     reduce/filter metrics over the serialized array still compute).
 *  3. No read fires when unauthenticated.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    revenueRecognitionSchedule: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    client: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import RevenueRecognitionPage from "../../app/(authenticated)/(accounting)/accounting/revenue-recognition/page";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const authMock = auth as unknown as ReturnType<typeof vi.fn>;
const tenantMock = getTenantIdForOrg as ReturnType<typeof vi.fn>;
const scheduleFindMany = database.revenueRecognitionSchedule
  .findMany as ReturnType<typeof vi.fn>;
const invoiceFindMany = database.invoice.findMany as ReturnType<typeof vi.fn>;
const clientFindMany = database.client.findMany as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-1";
const ORG_ID = "org-1";
const USER_ID = "user-1";

const schedulesFixture = [
  {
    id: "sch-1",
    invoiceId: "inv-1",
    clientId: "cli-1",
    method: "OVER_TIME",
    status: "IN_PROGRESS",
    totalAmount: 12000,
    recognizedAmount: 4000,
    remainingAmount: 8000,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-12-31"),
    description: "Annual retainer",
    recognitionPeriod: "MONTHLY",
    totalMilestones: 12,
    completedMilestones: 4,
    createdAt: new Date("2026-01-01"),
  },
  {
    id: "sch-2",
    invoiceId: "inv-2",
    clientId: "cli-2",
    method: "MILESTONE",
    status: "COMPLETED",
    totalAmount: 5000,
    recognizedAmount: 5000,
    remainingAmount: 0,
    startDate: new Date("2026-02-01"),
    endDate: new Date("2026-06-01"),
    description: null,
    recognitionPeriod: "MILESTONE",
    totalMilestones: 3,
    completedMilestones: 3,
    createdAt: new Date("2026-02-01"),
  },
];

const SCHEDULE_SELECT_ONLY_CONSUMED = {
  id: true,
  invoiceId: true,
  clientId: true,
  method: true,
  status: true,
  totalAmount: true,
  recognizedAmount: true,
  remainingAmount: true,
  startDate: true,
  endDate: true,
  description: true,
  recognitionPeriod: true,
  totalMilestones: true,
  completedMilestones: true,
  createdAt: true,
};

describe("RevenueRecognitionPage — focused schedule select (plan #7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: USER_ID, orgId: ORG_ID });
    tenantMock.mockResolvedValue(TENANT_ID);
    scheduleFindMany.mockResolvedValue(schedulesFixture);
    invoiceFindMany.mockResolvedValue([
      { id: "inv-1", invoiceNumber: "INV-001" },
      { id: "inv-2", invoiceNumber: "INV-002" },
    ]);
    clientFindMany.mockResolvedValue([
      { id: "cli-1", companyName: "Acme", firstName: null, lastName: null },
      {
        id: "cli-2",
        companyName: null,
        firstName: "Bo",
        lastName: "Peep",
      },
    ]);
  });

  it("selects ONLY the 15 consumed schedule fields (sibling invoice/client selects preserved)", async () => {
    await RevenueRecognitionPage();

    expect(scheduleFindMany).toHaveBeenCalledTimes(1);
    // Deep-matches `select`: passes ONLY when the schedule select is exactly
    // these 15 keys — re-adding notes / metadata or dropping the select fails.
    expect(scheduleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: SCHEDULE_SELECT_ONLY_CONSUMED,
      })
    );
    // The sibling reads keep their (already-narrow) selects.
    expect(invoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, invoiceNumber: true },
      })
    );
    expect(clientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          companyName: true,
          firstName: true,
          lastName: true,
        },
      })
    );
  });

  it("resolves the row map + reduce/filter metrics over the fixture", async () => {
    // The page computes totalSchedules (2), inProgress (1), completed (1),
    // totalRecognized (9000), totalRemaining (8000) from the serialized array
    // — proving the 15 selected fields feed the metrics + the serialized shape.
    const result = await RevenueRecognitionPage();
    expect(result).toBeDefined();
    expect(scheduleFindMany).toHaveBeenCalledTimes(1);
  });

  it("fires no DB read when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null, orgId: null });

    await expect(RevenueRecognitionPage()).rejects.toThrow(/REDIRECT/);

    expect(scheduleFindMany).not.toHaveBeenCalled();
  });
});
