/**
 * Kitchen Stations API Test Suite
 *
 * Tests station endpoints:
 *   GET  /api/kitchen/stations       (list with filters + pagination)
 *   GET  /api/kitchen/stations/[id]   (detail)
 *   POST Station.create/activate/deactivate/assignTask/removeTask/updateCapacity/updateEquipment (dispatcher)
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  tenant: vi.fn(),
  captureException: vi.fn(),
  runManifestCommand: vi.fn(),
  stationFindMany: vi.fn(),
  stationCount: vi.fn(),
  stationFindFirst: vi.fn(),
  prepListItemCount: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@repo/database", () => ({
  database: {
    station: {
      findMany: mocks.stationFindMany,
      count: mocks.stationCount,
      findFirst: mocks.stationFindFirst,
    },
    prepListItem: {
      count: mocks.prepListItemCount,
    },
  },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException, addBreadcrumb: vi.fn() }));
vi.mock("@/lib/manifest/execute-command", () => ({ runManifestCommand: mocks.runManifestCommand }));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json({ success: true, ...(typeof data === "object" && data !== null ? data : { data }) }, { status }),
    manifestErrorResponse: (message: string | { error: string; diagnostics?: unknown[] }, status: number) => {
      const body = typeof message === "string" ? { success: false, message } : { success: false, ...message };
      return NextResponse.json(body, { status });
    },
  };
});
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error { name = "InvariantError" as const; constructor(m: string) { super(m); this.name = "InvariantError"; } }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({ dispatchWebhooks: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({ runManifestCommandCore: vi.fn() }));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

// Import routes
const { GET: getStationsList } = await import("@/app/api/kitchen/stations/route");
const { GET: getStationDetail } = await import("@/app/api/kitchen/stations/[id]/route");
const { POST: manifestDispatch } = await import("@/app/api/manifest/[entity]/commands/[command]/route");

const dispatch = (command: string) => (req: NextRequest) =>
  manifestDispatch(req, { params: Promise.resolve({ entity: "Station", command }) });

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user-001";
const TEST_ORG_ID = "org_test_station";
const TEST_STATION_ID = "s0000000-0000-4000-a000-000000000001";

function mockAuth() {
  mocks.auth.mockResolvedValue({ userId: TEST_USER_ID, orgId: TEST_ORG_ID });
  mocks.tenant.mockResolvedValue(TEST_TENANT_ID);
}

function makeGET(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function makePOST(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/station/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Kitchen Stations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Command routes via dispatcher ──────────────────────────────────

  describe("Command routes", () => {
    it("returns 401 when unauthenticated (create)", async () => {
      const { InvariantError } = await import("@/app/lib/invariant");
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockImplementation(() => { throw new InvariantError("Unauthorized"); });

      const res = await dispatch("create")(makePOST({ name: "Grill Station" }));
      expect(res.status).toBe(401);
    });

    it("creates a station via dispatcher and returns 200", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { id: TEST_STATION_ID, name: "Grill Station" }, events: [{ type: "StationCreated" }] }), { status: 200 })
      );

      const res = await dispatch("create")(makePOST({ name: "Grill Station", stationType: "cooking" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.name).toBe("Grill Station");
    });

    it("activates a station via dispatcher", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { id: TEST_STATION_ID, isActive: true } }), { status: 200 })
      );

      const res = await dispatch("activate")(makePOST({ id: TEST_STATION_ID }));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it("deactivates a station via dispatcher", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { id: TEST_STATION_ID, isActive: false } }), { status: 200 })
      );

      const res = await dispatch("deactivate")(makePOST({ id: TEST_STATION_ID }));
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it("returns 403 on policy denial", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: false, message: "Access denied: StationWritePolicy (role=admin)" }), { status: 403 })
      );

      const res = await dispatch("create")(makePOST({ name: "Test" }));
      expect(res.status).toBe(403);
      expect((await res.json()).message).toContain("StationWritePolicy");
    });

    it("returns 422 on guard failure", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: false, message: "Guard 0 failed: capacitySimultaneousTasks must be positive" }), { status: 422 })
      );

      const res = await dispatch("updateCapacity")(makePOST({ id: TEST_STATION_ID, capacitySimultaneousTasks: -1 }));
      expect(res.status).toBe(422);
      expect((await res.json()).message).toContain("Guard 0 failed");
    });

    it("returns 400 on generic command failure", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      vi.mocked(requireCurrentUser).mockResolvedValue({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" } as never);

      mocks.runManifestCommand.mockResolvedValue(
        new Response(JSON.stringify({ success: false, message: "Station name is required" }), { status: 400 })
      );

      const res = await dispatch("create")(makePOST({}));
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Station name is required");
    });
  });

  // ── GET /api/kitchen/stations (list) ───────────────────────────────

  describe("GET /api/kitchen/stations", () => {
    it("returns paginated stations with task counts", async () => {
      mockAuth();
      mocks.stationFindMany.mockResolvedValue([
        { id: "s-001", locationId: "loc-001", name: "Grill Station", stationType: "cooking", capacitySimultaneousTasks: 5, equipmentList: [], isActive: true, notes: null, createdAt: new Date(), updatedAt: new Date() },
        { id: "s-002", locationId: "loc-001", name: "Prep Station", stationType: "prep", capacitySimultaneousTasks: 3, equipmentList: [], isActive: true, notes: null, createdAt: new Date(), updatedAt: new Date() },
      ]);
      mocks.stationCount.mockResolvedValue(2);
      mocks.prepListItemCount.mockResolvedValue(3);

      const res = await getStationsList(makeGET("http://localhost:3000/api/kitchen/stations"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.data[0].currentTaskCount).toBe(3);
      expect(body.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
    });

    it("filters by stationType", async () => {
      mockAuth();
      mocks.stationFindMany.mockResolvedValue([]);
      mocks.stationCount.mockResolvedValue(0);

      await getStationsList(makeGET("http://localhost:3000/api/kitchen/stations?stationType=cooking"));
      expect(mocks.stationFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([expect.objectContaining({ stationType: "cooking" })]),
          }),
        })
      );
    });

    it("filters by isActive status", async () => {
      mockAuth();
      mocks.stationFindMany.mockResolvedValue([]);
      mocks.stationCount.mockResolvedValue(0);

      await getStationsList(makeGET("http://localhost:3000/api/kitchen/stations?isActive=true"));
      expect(mocks.stationFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([expect.objectContaining({ isActive: true })]),
          }),
        })
      );
    });

    it("filters by search term", async () => {
      mockAuth();
      mocks.stationFindMany.mockResolvedValue([]);
      mocks.stationCount.mockResolvedValue(0);

      await getStationsList(makeGET("http://localhost:3000/api/kitchen/stations?search=grill"));
      expect(mocks.stationFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([expect.objectContaining({ name: { contains: "grill", mode: "insensitive" } })]),
          }),
        })
      );
    });

    it("handles pagination", async () => {
      mockAuth();
      mocks.stationFindMany.mockResolvedValue([]);
      mocks.stationCount.mockResolvedValue(50);

      const res = await getStationsList(makeGET("http://localhost:3000/api/kitchen/stations?page=3&limit=10"));
      const body = await res.json();
      expect(body.pagination).toEqual({ page: 3, limit: 10, total: 50, totalPages: 5 });
      expect(mocks.stationFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10, skip: 20 }));
    });

    it("returns 401 for unauthenticated requests", async () => {
      mocks.auth.mockResolvedValue({ orgId: null });
      const res = await getStationsList(makeGET("http://localhost:3000/api/kitchen/stations"));
      expect(res.status).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      mocks.stationFindMany.mockRejectedValue(new Error("DB error"));
      const res = await getStationsList(makeGET("http://localhost:3000/api/kitchen/stations"));
      expect(res.status).toBe(500);
    });

    it("enforces tenant isolation", async () => {
      mockAuth();
      mocks.stationFindMany.mockResolvedValue([]);
      mocks.stationCount.mockResolvedValue(0);

      await getStationsList(makeGET("http://localhost:3000/api/kitchen/stations"));
      expect(mocks.stationFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([expect.objectContaining({ tenantId: TEST_TENANT_ID })]),
          }),
        })
      );
    });
  });

  // ── GET /api/kitchen/stations/[id] (detail) ────────────────────────

  describe("GET /api/kitchen/stations/[id]", () => {
    it("returns a station by ID", async () => {
      mockAuth();
      mocks.stationFindFirst.mockResolvedValue({
        id: TEST_STATION_ID, tenantId: TEST_TENANT_ID, name: "Grill Station",
        stationType: "cooking", capacitySimultaneousTasks: 5, isActive: true,
      });

      const res = await getStationDetail(
        makeGET(`http://localhost:3000/api/kitchen/stations/${TEST_STATION_ID}`),
        { params: Promise.resolve({ id: TEST_STATION_ID }) }
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.station.id).toBe(TEST_STATION_ID);
    });

    it("returns 404 when station does not exist", async () => {
      mockAuth();
      mocks.stationFindFirst.mockResolvedValue(null);

      const res = await getStationDetail(
        makeGET("http://localhost:3000/api/kitchen/stations/nonexistent-id"),
        { params: Promise.resolve({ id: "nonexistent-id" }) }
      );
      expect(res.status).toBe(404);
    });

    it("enforces tenant isolation on detail queries", async () => {
      mockAuth();
      mocks.stationFindFirst.mockResolvedValue(null);

      const otherId = "x0000000-0000-4000-a000-000000000099";
      await getStationDetail(
        makeGET(`http://localhost:3000/api/kitchen/stations/${otherId}`),
        { params: Promise.resolve({ id: otherId }) }
      );

      expect(mocks.stationFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: otherId, tenantId: TEST_TENANT_ID } })
      );
    });

    it("returns 401 when unauthenticated", async () => {
      mocks.auth.mockResolvedValue({ orgId: null, userId: null });

      const res = await getStationDetail(
        makeGET(`http://localhost:3000/api/kitchen/stations/${TEST_STATION_ID}`),
        { params: Promise.resolve({ id: TEST_STATION_ID }) }
      );
      expect(res.status).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      mocks.stationFindFirst.mockRejectedValue(new Error("Connection refused"));

      const res = await getStationDetail(
        makeGET(`http://localhost:3000/api/kitchen/stations/${TEST_STATION_ID}`),
        { params: Promise.resolve({ id: TEST_STATION_ID }) }
      );
      expect(res.status).toBe(500);
    });
  });
});
