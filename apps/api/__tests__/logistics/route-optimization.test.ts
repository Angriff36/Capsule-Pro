/**
 * Route Optimization Test Suite
 *
 * Verifies POST /api/logistics/routes/commands/optimize correctly:
 *   - resequences stops via nearest-neighbor from the existing first stop
 *   - persists per-stop leg distance/time and route-level totals
 *   - records the algorithm name for auditability of future swaps
 *   - clamps the optimization score to [0, 100]
 *   - rejects routes in terminal states and routes with missing coordinates
 *
 * Why these tests matter:
 *   - The endpoint previously returned 501. Without these tests a future
 *     stub-revert would silently pass typecheck and break dispatchers.
 *   - The (routeId, stopNumber) unique constraint requires a two-phase
 *     renumber. A regression that inlines a single update loop would crash
 *     on any route where stop ordering changes.
 *   - Optimization score must NEVER go negative (would indicate the
 *     "optimizer" made things worse and silently shipped that order).
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const ROUTE_ID = "11111111-1111-1111-1111-111111111111";

const mocks = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  routeUpdateMock: vi.fn(),
  stopUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    deliveryRoute: {
      findFirst: mocks.findFirstMock,
      update: mocks.routeUpdateMock,
    },
    routeStop: {
      update: mocks.stopUpdateMock,
    },
    $transaction: mocks.transactionMock,
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { NextRequest } from "next/server";
import { POST } from "@/app/api/logistics/routes/commands/optimize/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    new URL("http://localhost/api/logistics/routes/commands/optimize"),
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

interface StopUpdateCall {
  where: { tenantId_id: { tenantId: string; id: string } };
  data: {
    stopNumber: number;
    distanceFromPrevious?: string;
    timeFromPrevious?: number;
  };
}

interface RouteUpdateCall {
  where: { tenantId_id: { tenantId: string; id: string } };
  data: {
    status: string;
    totalDistance?: string;
    totalDuration?: number;
    optimizationScore?: string;
    optimizationAlgorithm?: string;
  };
}

/**
 * Tx stub the route's $transaction callback receives. We capture every
 * stop update so the test can assert on the exact resequence calls.
 */
function makeTxStub(finalRoute: Record<string, unknown>) {
  const stopUpdateCalls: StopUpdateCall[] = [];
  const tx = {
    routeStop: {
      update: vi.fn((args: StopUpdateCall) => {
        stopUpdateCalls.push(args);
        return Promise.resolve({});
      }),
    },
    deliveryRoute: {
      update: vi.fn((_args: RouteUpdateCall) => Promise.resolve(finalRoute)),
    },
  };
  return { tx, stopUpdateCalls };
}

beforeEach(() => {
  mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
  mocks.findFirstMock.mockReset();
  mocks.routeUpdateMock.mockReset();
  mocks.stopUpdateMock.mockReset();
  mocks.transactionMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/logistics/routes/commands/optimize", () => {
  it("returns 400 when routeId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the route does not exist for this tenant", async () => {
    mocks.findFirstMock.mockResolvedValue(null);
    const res = await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when the route is completed", async () => {
    mocks.findFirstMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "completed",
      stops: [],
    });
    const res = await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(res.status).toBe(409);
  });

  it("returns 409 when the route is cancelled", async () => {
    mocks.findFirstMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "cancelled",
      stops: [],
    });
    const res = await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(res.status).toBe(409);
  });

  it("returns 422 when any stop is missing coordinates", async () => {
    mocks.findFirstMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "draft",
      stops: [
        { id: "s1", stopNumber: 1, latitude: 40.7, longitude: -74.0 },
        { id: "s2", stopNumber: 2, latitude: null, longitude: null },
      ],
    });

    const res = await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.stopIds).toEqual(["s2"]);
    // Must NOT have started a transaction when validation fails.
    expect(mocks.transactionMock).not.toHaveBeenCalled();
  });

  it("trivially 'optimizes' a 0-stop route with score 0 and algorithm name", async () => {
    mocks.findFirstMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "draft",
      stops: [],
    });
    mocks.routeUpdateMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "optimized",
      totalDistance: "0",
      totalDuration: 0,
      optimizationScore: "0",
      optimizationAlgorithm: "nearest-neighbor-v1",
      stops: [],
    });

    const res = await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(res.status).toBe(200);
    expect(mocks.routeUpdateMock).toHaveBeenCalledTimes(1);
    expect(mocks.routeUpdateMock.mock.calls[0][0].data).toMatchObject({
      status: "optimized",
      optimizationAlgorithm: "nearest-neighbor-v1",
    });
    // Trivial path must NOT enter the transaction (no stops to renumber).
    expect(mocks.transactionMock).not.toHaveBeenCalled();
  });

  it("trivially optimizes a single-stop route without entering the transaction", async () => {
    mocks.findFirstMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "draft",
      stops: [{ id: "s1", stopNumber: 1, latitude: 40.7, longitude: -74.0 }],
    });
    mocks.routeUpdateMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "optimized",
      optimizationAlgorithm: "nearest-neighbor-v1",
      stops: [],
    });

    const res = await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(res.status).toBe(200);
    expect(mocks.transactionMock).not.toHaveBeenCalled();
  });

  it("reorders a 4-stop route via nearest-neighbor and persists legs + totals", async () => {
    // Anchor (s1) at NYC. The remaining stops are placed so the optimal
    // nearest-neighbor sequence from NYC is s1 -> s4 -> s3 -> s2 (each
    // ~roughly 50km/100km/200km hops vs. the input order's long zig-zag).
    //
    //   s1 = NYC                          (40.7128, -74.0060)
    //   s2 = Far point west of Boston     (42.3601, -73.0589)  -- input #2
    //   s3 = Stamford, CT (close to NYC)  (41.0534, -73.5387)  -- input #3
    //   s4 = Newark, NJ (very close)      (40.7357, -74.1724)  -- input #4
    //
    // Expected NN from s1: s1 -> s4 (closest) -> s3 -> s2.
    const stops = [
      { id: "s1", stopNumber: 1, latitude: 40.7128, longitude: -74.006 },
      { id: "s2", stopNumber: 2, latitude: 42.3601, longitude: -73.0589 },
      { id: "s3", stopNumber: 3, latitude: 41.0534, longitude: -73.5387 },
      { id: "s4", stopNumber: 4, latitude: 40.7357, longitude: -74.1724 },
    ];

    mocks.findFirstMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "draft",
      stops,
    });

    const finalRoute = {
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "optimized",
      optimizationAlgorithm: "nearest-neighbor-v1",
      stops: [],
    };
    const { tx, stopUpdateCalls } = makeTxStub(finalRoute);
    mocks.transactionMock.mockImplementation(
      async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)
    );

    const res = await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(res.status).toBe(200);

    // Phase 1 (negative parking) + Phase 2 (final 1..N) = 8 stop updates.
    expect(stopUpdateCalls).toHaveLength(8);

    // Phase 1: first 4 calls park stops on negative numbers.
    const phase1 = stopUpdateCalls.slice(0, 4);
    expect(phase1.every((c) => c.data.stopNumber < 0)).toBe(true);

    // Phase 2: last 4 calls assign final 1..N in optimized order.
    const phase2 = stopUpdateCalls.slice(4, 8);
    const finalOrder = phase2.map((c) => ({
      id: c.where.tenantId_id.id,
      stopNumber: c.data.stopNumber,
    }));
    expect(finalOrder).toEqual([
      { id: "s1", stopNumber: 1 },
      { id: "s4", stopNumber: 2 },
      { id: "s3", stopNumber: 3 },
      { id: "s2", stopNumber: 4 },
    ]);

    // The anchor's leg distance must be exactly 0 (it's the start).
    const anchor = phase2[0];
    if (!anchor) {
      throw new Error("expected anchor in phase 2");
    }
    expect(Number(anchor.data.distanceFromPrevious)).toBe(0);
    expect(anchor.data.timeFromPrevious).toBe(0);

    // Subsequent legs must each have a positive distance.
    for (let i = 1; i < 4; i++) {
      const leg = phase2[i];
      if (!leg) {
        throw new Error(`expected leg ${i}`);
      }
      expect(Number(leg.data.distanceFromPrevious)).toBeGreaterThan(0);
      expect(leg.data.timeFromPrevious).toBeGreaterThanOrEqual(0);
    }

    // Route metadata: totals + algorithm + optimized status.
    expect(tx.deliveryRoute.update).toHaveBeenCalledTimes(1);
    const routeUpdate = tx.deliveryRoute.update.mock.calls[0]?.[0];
    if (!routeUpdate) {
      throw new Error("expected route update");
    }
    expect(routeUpdate.data.status).toBe("optimized");
    expect(routeUpdate.data.optimizationAlgorithm).toBe("nearest-neighbor-v1");
    expect(Number(routeUpdate.data.totalDistance)).toBeGreaterThan(0);
    expect(routeUpdate.data.totalDuration).toBeGreaterThanOrEqual(0);

    // Score must be in [0, 100] — never negative.
    const score = Number(routeUpdate.data.optimizationScore);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns score 0 (clamped, never negative) when input was already optimal", async () => {
    // 3 collinear stops along a north-south corridor in their input order.
    // Nearest-neighbor from s1 is the same sequence, so improvement = 0.
    const stops = [
      { id: "s1", stopNumber: 1, latitude: 40.0, longitude: -74.0 },
      { id: "s2", stopNumber: 2, latitude: 40.5, longitude: -74.0 },
      { id: "s3", stopNumber: 3, latitude: 41.0, longitude: -74.0 },
    ];

    mocks.findFirstMock.mockResolvedValue({
      tenantId: TENANT_ID,
      id: ROUTE_ID,
      status: "draft",
      stops,
    });

    const { tx } = makeTxStub({});
    mocks.transactionMock.mockImplementation(
      async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)
    );

    const res = await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(res.status).toBe(200);

    const routeUpdate = tx.deliveryRoute.update.mock.calls[0]?.[0];
    if (!routeUpdate) {
      throw new Error("expected route update");
    }
    expect(Number(routeUpdate.data.optimizationScore)).toBe(0);
  });

  it("scopes the route lookup to the caller's tenant", async () => {
    mocks.findFirstMock.mockResolvedValue(null);
    await POST(makeRequest({ routeId: ROUTE_ID }));
    expect(mocks.findFirstMock).toHaveBeenCalledTimes(1);
    expect(mocks.findFirstMock.mock.calls[0][0]).toMatchObject({
      where: { tenantId: TENANT_ID, id: ROUTE_ID, deletedAt: null },
    });
  });
});
