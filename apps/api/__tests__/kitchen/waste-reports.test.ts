/**
 * GET /api/kitchen/waste/reports — parallelization regression guard.
 *
 * Pins item #17: the original GET ran two SERIAL round-trips —
 *   wasteEntry.findMany (filtered) → (totals/grouping/sort post-processing) →
 *   wasteReason.findMany({ isActive: true })
 * The two reads are fully data-independent (reasons feed only the label map +
 * the response field, never the entries post-processing), so they collapse to
 * one Promise.all batch.
 *
 * The concurrency proof holds wasteEntry.findMany pending via a controlled
 * resolver and asserts wasteReason.findMany fires in the SAME Promise.all burst
 * — impossible in the old serial layout, where wasteReason was only reached
 * after wasteEntry resolved and all its post-processing ran. Fails if reverted.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    wasteEntry: { findMany: vi.fn() },
    wasteReason: { findMany: vi.fn() },
  },
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/kitchen/waste/reports/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const wasteEntryFindMany = database.wasteEntry.findMany as ReturnType<
  typeof vi.fn
>;
const wasteReasonFindMany = database.wasteReason.findMany as ReturnType<
  typeof vi.fn
>;

const URL = "http://localhost/api/kitchen/waste/reports";

describe("GET /api/kitchen/waste/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    wasteEntryFindMany.mockResolvedValue([]);
    wasteReasonFindMany.mockResolvedValue([]);
  });

  it("runs wasteEntry + wasteReason concurrently in one Promise.all batch", async () => {
    // wasteEntry stays pending; assert wasteReason (the independent sibling read)
    // fires in the same Promise.all burst. The old serial layout reached
    // wasteReason only after wasteEntry resolved + all post-processing ran, so it
    // could not fire while wasteEntry was pending.
    let resolveEntries!: (v: unknown) => void;
    wasteEntryFindMany.mockReturnValue(
      new Promise((r) => {
        resolveEntries = r;
      }) as never
    );

    const p = GET(new Request(URL));

    await vi.waitFor(() => {
      expect(wasteEntryFindMany).toHaveBeenCalledTimes(1);
    });
    // CONCURRENCY: wasteReason fires while wasteEntry is still pending.
    expect(wasteReasonFindMany).toHaveBeenCalledTimes(1);

    resolveEntries([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("groups by reason, sorts by cost desc, labels from reasons, and trends by month", async () => {
    wasteEntryFindMany.mockResolvedValue([
      {
        reasonId: 1,
        totalCost: 100,
        quantity: 2,
        loggedAt: new Date("2026-01-15T10:00:00Z"),
        locationId: "loc-1",
        item: { id: "i1", name: "Flour", item_number: "F-1" },
      },
      {
        reasonId: 1,
        totalCost: 50,
        quantity: 1,
        loggedAt: new Date("2026-01-20T10:00:00Z"),
        locationId: null,
        item: { id: "i2", name: "Sugar", item_number: "S-1" },
      },
      {
        reasonId: 2,
        totalCost: 300,
        quantity: 4,
        loggedAt: new Date("2026-02-05T10:00:00Z"),
        locationId: "loc-2",
        item: { id: "i3", name: "Butter", item_number: "B-1" },
      },
    ]);
    wasteReasonFindMany.mockResolvedValue([
      { id: 1, name: "Spoilage", isActive: true },
      { id: 2, name: "Over-prep", isActive: true },
    ]);

    const res = await GET(new Request(URL));
    const body = await res.json();

    expect(res.status).toBe(200);
    // Both reads fire exactly once regardless of entry count.
    expect(wasteEntryFindMany).toHaveBeenCalledTimes(1);
    expect(wasteReasonFindMany).toHaveBeenCalledTimes(1);

    const { report } = body;
    expect(report.groupedBy).toBe("reason");
    expect(report.summary).toEqual({
      totalCost: 450,
      totalQuantity: 7,
      entryCount: 3,
      avgCostPerEntry: 150,
    });

    // Sorted by cost desc: reason 2 (300) before reason 1 (150); labels resolved
    // from the reason map.
    expect(report.data).toHaveLength(2);
    expect(report.data[0]).toMatchObject({
      key: "2",
      label: "Over-prep",
      totalCost: 300,
      totalQuantity: 4,
      count: 1,
      avgCostPerEntry: 300,
      avgQuantityPerEntry: 4,
    });
    expect(report.data[1]).toMatchObject({
      key: "1",
      label: "Spoilage",
      totalCost: 150,
      totalQuantity: 3,
      count: 2,
      avgCostPerEntry: 75,
      avgQuantityPerEntry: 1.5,
    });

    // Trends grouped by month, sorted ascending.
    expect(report.trends).toEqual([
      { month: "2026-01", totalCost: 150, totalQuantity: 3, count: 2 },
      { month: "2026-02", totalCost: 300, totalQuantity: 4, count: 1 },
    ]);

    // Raw reasons echoed in the response.
    expect(report.wasteReasons).toHaveLength(2);
  });

  it("returns empty data + zeroed summary when there are no entries", async () => {
    const res = await GET(new Request(URL));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.report.summary).toEqual({
      totalCost: 0,
      totalQuantity: 0,
      entryCount: 0,
      avgCostPerEntry: 0,
    });
    expect(body.report.data).toEqual([]);
    expect(body.report.trends).toEqual([]);
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request(URL));
    expect(res.status).toBe(401);
    expect(wasteEntryFindMany).not.toHaveBeenCalled();
    expect(wasteReasonFindMany).not.toHaveBeenCalled();
  });
});
