/**
 * GET /api/logistics/vehicles/list — per-vehicle N+1 collapse regression guard.
 *
 * Pins item #19: the route previously ran one `driver.count` PER vehicle inside
 * a `Promise.all` map (N count queries scaling with page size). It now runs a
 * single `driver.groupBy({ by: ["vehicleId"], _count })` scoped to the page's
 * vehicle ids and looks up counts from a Map = 1 round-trip regardless of page
 * size.
 *
 * The guard asserts `driver.count` is NEVER called and `driver.groupBy` is
 * called exactly once — fails loudly if reverted to the per-vehicle map. Also
 * pins the assigned_drivers mapping (vehicle with drivers → count, vehicle with
 * none → 0 via Map miss), the empty-page no-op (groupBy skipped, no pointless
 * `in: []` round-trip), and the 401 auth guard before any DB read.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    vehicle: { findMany: vi.fn() },
    driver: { groupBy: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/logistics/vehicles/list/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/logistics/vehicles/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: "org_test",
      userId: "u1",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("batch-fetches driver counts via one groupBy (no per-vehicle N+1)", async () => {
    vi.mocked(database.vehicle.findMany).mockResolvedValue([
      {
        id: "vA",
        make: "Ford",
        model: "Transit",
        year: 2022,
        plateNumber: "ABC",
        vin: "v1",
        capacityWeight: 1000,
        capacityVolume: 6,
        fuelType: "diesel",
        mileage: 12_000,
        status: "active",
        notes: "",
        createdAt: new Date("2026-01-01"),
      },
      {
        id: "vB",
        make: "Ram",
        model: "ProMaster",
        year: 2021,
        plateNumber: "DEF",
        vin: "v2",
        capacityWeight: 1200,
        capacityVolume: 7,
        fuelType: "gas",
        mileage: 22_000,
        status: "active",
        notes: null,
        createdAt: new Date("2026-01-02"),
      },
      {
        id: "vC",
        make: "Mercedes",
        model: "Sprinter",
        year: 2023,
        plateNumber: "GHI",
        vin: "v3",
        capacityWeight: 1100,
        capacityVolume: 8,
        fuelType: "diesel",
        mileage: 5000,
        status: "maintenance",
        notes: "x",
        createdAt: new Date("2026-01-03"),
      },
    ] as never);
    // vA has 2 active drivers, vC has 1; vB has none → absent → defaults to 0.
    vi.mocked(database.driver.groupBy).mockResolvedValue([
      { vehicleId: "vA", _count: { vehicleId: 2 } },
      { vehicleId: "vC", _count: { vehicleId: 1 } },
    ] as never);

    const res = await GET(
      new NextRequest("http://x/api/logistics/vehicles/list")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    // Batched reads called once each.
    expect(database.vehicle.findMany).toHaveBeenCalledTimes(1);
    expect(database.driver.groupBy).toHaveBeenCalledTimes(1);
    // Per-vehicle N+1 method NEVER called (regression guard).
    expect(database.driver.count).not.toHaveBeenCalled();
    // The groupBy is scoped to the page's vehicle ids in one round-trip.
    expect(database.driver.groupBy).toHaveBeenCalledWith({
      by: ["vehicleId"],
      where: {
        tenantId: "tenant_test",
        deletedAt: null,
        status: { not: "inactive" },
        vehicleId: { in: ["vA", "vB", "vC"] },
      },
      _count: { vehicleId: true },
    });

    expect(body).toEqual({
      success: true,
      vehicles: [
        {
          id: "vA",
          make: "Ford",
          model: "Transit",
          year: 2022,
          plate_number: "ABC",
          vin: "v1",
          capacity_weight: 1000,
          capacity_volume: 6,
          fuel_type: "diesel",
          mileage: 12_000,
          status: "active",
          notes: "",
          created_at: expect.any(String),
          assigned_drivers: 2,
        },
        {
          id: "vB",
          make: "Ram",
          model: "ProMaster",
          year: 2021,
          plate_number: "DEF",
          vin: "v2",
          capacity_weight: 1200,
          capacity_volume: 7,
          fuel_type: "gas",
          mileage: 22_000,
          status: "active",
          notes: null,
          created_at: expect.any(String),
          assigned_drivers: 0,
        },
        {
          id: "vC",
          make: "Mercedes",
          model: "Sprinter",
          year: 2023,
          plate_number: "GHI",
          vin: "v3",
          capacity_weight: 1100,
          capacity_volume: 8,
          fuel_type: "diesel",
          mileage: 5000,
          status: "maintenance",
          notes: "x",
          created_at: expect.any(String),
          assigned_drivers: 1,
        },
      ],
      limit: expect.any(Number),
      offset: 0,
    });
  });

  it("skips the groupBy for an empty page (no pointless in:[] round-trip)", async () => {
    vi.mocked(database.vehicle.findMany).mockResolvedValue([] as never);

    const res = await GET(
      new NextRequest("http://x/api/logistics/vehicles/list")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      vehicles: [],
      limit: expect.any(Number),
      offset: 0,
    });
    expect(database.vehicle.findMany).toHaveBeenCalledTimes(1);
    // No vehicles on the page → no driver counts needed → groupBy skipped.
    expect(database.driver.groupBy).not.toHaveBeenCalled();
    expect(database.driver.count).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
    const res = await GET(
      new NextRequest("http://x/api/logistics/vehicles/list")
    );
    expect(res.status).toBe(401);
    expect(database.vehicle.findMany).not.toHaveBeenCalled();
    expect(database.driver.groupBy).not.toHaveBeenCalled();
  });
});
