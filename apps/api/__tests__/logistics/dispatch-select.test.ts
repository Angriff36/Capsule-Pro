/**
 * GET /api/logistics/dispatch — select-narrowing regression guard.
 *
 * The dispatch board previously ran `deliveryRoute.findMany` with a bare
 * `include: { routeStops }` and NO `select`, materializing every column of each
 * route + each stop (description/eventId/timestamps on routes; address/city/
 * notes/postal/arrival-times/timestamps on stops) — scaled by up to 5 stops × N
 * routes per board load. It now projects exactly the fields the response map
 * consumes (9 route scalars + routeStops, 4 stop scalars).
 *
 * The guard pins the exact `select` shape (fails loudly if reverted to the bare
 * `include`, or if a dropped column is re-added), proves the narrowed rows still
 * feed every response field (dispatchStatus logic, driver/vehicle map lookups,
 * stops subset, stopCount, stats), and pins the tenant guard before any DB read.
 *
 * `select` projects columns, never rows — so `stopCount` (routeStops.length) and
 * the `.filter().length` stats are byte-identical with or without it (only `take`
 * would truncate rows, and the preview `take: 5` is unchanged).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/lib/tenant", () => ({ requireTenantId: vi.fn() }));
vi.mock("@/lib/database", () => ({
  database: {
    deliveryRoute: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { error: vi.fn() } }));

import { GET } from "@/app/api/logistics/dispatch/route";
import { requireTenantId } from "@/app/lib/tenant";
import { database } from "@/lib/database";

const availableDriversFixture = [
  {
    id: "drv-avail",
    name: "Alice",
    phone: "555-0000",
    vehicle_id: null,
    vehicle_name: null,
  },
];

describe("GET /api/logistics/dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTenantId).mockResolvedValue("tenant_test");
  });

  it("projects a strict subset (select) — no bare include, no dropped-consumed column", async () => {
    vi.mocked(database.deliveryRoute.findMany).mockResolvedValue([
      {
        id: "rA",
        routeNumber: "RT-001",
        name: "Morning run",
        status: "planned",
        scheduledDate: new Date("2026-07-15"),
        totalDistance: 42.5,
        totalDuration: 90,
        driverId: null,
        vehicleId: null,
        routeStops: [
          { id: "s1", stopNumber: 1, name: "Pickup", status: "pending" },
          { id: "s2", stopNumber: 2, name: "Dropoff", status: "pending" },
        ],
      },
    ] as never);
    vi.mocked(database.$queryRaw).mockResolvedValue(
      availableDriversFixture as never
    );

    const res = await GET(new NextRequest("http://x/api/logistics/dispatch"));
    const body = await res.json();

    expect(res.status).toBe(200);

    // Core regression guard: the read carries the exact narrowed select.
    // toEqual (not objectContaining) fails if select is dropped (undefined),
    // if a dropped column is re-added, or if the include shape returns.
    const findManyArg = vi.mocked(database.deliveryRoute.findMany).mock.calls.at(
      0
    )?.[0];
    expect(findManyArg?.select).toEqual({
      id: true,
      routeNumber: true,
      name: true,
      status: true,
      scheduledDate: true,
      totalDistance: true,
      totalDuration: true,
      driverId: true,
      vehicleId: true,
      routeStops: {
        select: { id: true, stopNumber: true, name: true, status: true },
        orderBy: { stopNumber: "asc" },
        take: 5,
      },
    });
    // No bare top-level include (Prisma forbids select + include together).
    expect(findManyArg?.include).toBeUndefined();

    // The narrowed rows still feed every response field.
    expect(body).toEqual({
      success: true,
      routes: [
        {
          id: "rA",
          routeNumber: "RT-001",
          name: "Morning run",
          status: "planned",
          dispatchStatus: "unassigned",
          scheduledDate: expect.any(String),
          totalDistance: "42.5",
          totalDuration: 90,
          driverId: null,
          driverName: null,
          driverPhone: null,
          vehicleId: null,
          vehicleName: null,
          stops: [
            { id: "s1", stopNumber: 1, name: "Pickup", status: "pending" },
            { id: "s2", stopNumber: 2, name: "Dropoff", status: "pending" },
          ],
          stopCount: 2,
        },
      ],
      availableDrivers: availableDriversFixture,
      stats: { unassigned: 1, assigned: 0, inProgress: 0, completed: 0 },
    });

    // No driver/vehicle ids on the routes → only the availableDrivers read fires.
    expect(database.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("maps driver/vehicle lookups + dispatchStatus when routes are assigned", async () => {
    vi.mocked(database.deliveryRoute.findMany).mockResolvedValue([
      {
        id: "rB",
        routeNumber: "RT-002",
        name: "Active run",
        status: "in_progress",
        scheduledDate: new Date("2026-07-15"),
        totalDistance: null,
        totalDuration: 45,
        driverId: "drv-1",
        vehicleId: "veh-1",
        routeStops: [
          { id: "s3", stopNumber: 1, name: "Warehouse", status: "completed" },
        ],
      },
    ] as never);
    // Serial $queryRaw order: availableDrivers → drivers → vehicles.
    vi.mocked(database.$queryRaw)
      .mockResolvedValueOnce(availableDriversFixture as never)
      .mockResolvedValueOnce([
        { id: "drv-1", name: "Bob", phone: "111-222" },
      ] as never)
      .mockResolvedValueOnce([
        { id: "veh-1", make: "Ford", model: "Transit" },
      ] as never);

    const res = await GET(new NextRequest("http://x/api/logistics/dispatch"));
    const body = await res.json();

    expect(res.status).toBe(200);
    // Three reads fire: available drivers + the two id-scoped lookups.
    expect(database.$queryRaw).toHaveBeenCalledTimes(3);
    expect(body.routes[0]).toEqual({
      id: "rB",
      routeNumber: "RT-002",
      name: "Active run",
      status: "in_progress",
      dispatchStatus: "in_progress",
      scheduledDate: expect.any(String),
      totalDistance: null, // null totalDistance → null (not "null")
      totalDuration: 45,
      driverId: "drv-1",
      driverName: "Bob",
      driverPhone: "111-222",
      vehicleId: "veh-1",
      vehicleName: "Ford Transit",
      stops: [
        { id: "s3", stopNumber: 1, name: "Warehouse", status: "completed" },
      ],
      stopCount: 1,
    });
    expect(body.stats).toEqual({
      unassigned: 0,
      assigned: 0,
      inProgress: 1,
      completed: 0,
    });
  });

  it("rejects unauthenticated requests before any DB read (requireTenantId throws)", async () => {
    vi.mocked(requireTenantId).mockRejectedValue(
      new Error("auth.orgId must exist")
    );

    const res = await GET(new NextRequest("http://x/api/logistics/dispatch"));

    // requireTenantId throws → caught → 500, no route/stop read fires.
    expect(res.status).toBe(500);
    expect(database.deliveryRoute.findMany).not.toHaveBeenCalled();
    expect(database.$queryRaw).not.toHaveBeenCalled();
  });
});
