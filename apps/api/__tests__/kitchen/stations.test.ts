/**
 * Kitchen Stations API Test Suite
 *
 * Tests all station endpoints: command routes (create, activate, deactivate,
 * assign-task, remove-task, update-capacity, update-equipment) and read routes
 * (GET list with filters/pagination, GET detail by ID).
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// Manifest runtime must be mocked so command routes can call runCommand.
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// manifest-response is a thin wrapper — use the real implementation so that
// `manifestSuccessResponse` / `manifestErrorResponse` produce actual JSON
// responses we can assert against.
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        { success: true, ...(typeof data === "object" && data !== null ? data : { data }) },
        { status },
      ),
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});

// The list route under kitchen/stations/route.ts imports `@/lib/database`.
// We alias it to the same `database` mock from @repo/database so both import
// paths resolve to the same object.
vi.mock("@/lib/database", async () => {
  const mod = await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// --- Route imports ---

import { POST as createStation } from "@/app/api/station/create/route";
import { POST as activateStation } from "@/app/api/station/activate/route";
import { POST as deactivateStation } from "@/app/api/station/deactivate/route";
import { POST as assignTask } from "@/app/api/station/assign-task/route";
import { POST as removeTask } from "@/app/api/station/remove-task/route";
import { POST as updateCapacity } from "@/app/api/station/update-capacity/route";
import { POST as updateEquipment } from "@/app/api/station/update-equipment/route";
import { GET as getStationsList } from "@/app/api/kitchen/stations/route";
import { GET as getStationDetail } from "@/app/api/kitchen/stations/[id]/route";

// --- Constants ---

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_test_station";
const TEST_ORG_ID = "org_test_station";
const TEST_STATION_ID = "s0000000-0000-4000-a000-000000000001";

// --- Helpers ---

function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1],
  );
}

function mockAuth() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as Awaited<ReturnType<typeof auth>>);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function mockSuccessfulRunCommand(result: unknown = { id: TEST_STATION_ID }, emittedEvents: unknown[] = []) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents,
    }),
  } as never);
}

function mockFailedRunCommand(error: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error,
    }),
  } as never);
}

function mockPolicyDenialRunCommand(policyName: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      policyDenial: { policyName },
    }),
  } as never);
}

function mockGuardFailureRunCommand(index: number, formatted: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index, formatted },
    }),
  } as never);
}

function createMockStation(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_STATION_ID,
    tenantId: TEST_TENANT_ID,
    locationId: "loc-001",
    name: "Grill Station",
    stationType: "cooking",
    capacitySimultaneousTasks: 5,
    equipmentList: ["grill", "tongs"],
    isActive: true,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

// --- Tests ---

describe("Kitchen Stations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------ //
  // Authentication & authorization (shared across all command routes)   //
  // ------------------------------------------------------------------ //

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated (no userId)", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID, userId: null } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);

      const req = createMockRequest("http://localhost:3000/api/station/create", {
        method: "POST",
        body: JSON.stringify({ name: "Grill Station" }),
      });

      const res = await createStation(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 401 when orgId is missing", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: TEST_USER_ID } as never);

      const req = createMockRequest("http://localhost:3000/api/station/activate", {
        method: "POST",
        body: JSON.stringify({ id: TEST_STATION_ID }),
      });

      const res = await activateStation(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant is not found for org", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const req = createMockRequest("http://localhost:3000/api/station/create", {
        method: "POST",
        body: JSON.stringify({ name: "Grill Station" }),
      });

      const res = await createStation(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });
  });

  // ------------------------------------------------------------------ //
  // Station.create                                                      //
  // ------------------------------------------------------------------ //

  describe("POST /api/station/create", () => {
    it("creates a station and returns 200 with result and events", async () => {
      mockAuth();
      const emittedEvents = [{ type: "StationCreated", stationId: TEST_STATION_ID }];
      mockSuccessfulRunCommand({ id: TEST_STATION_ID, name: "Grill Station" }, emittedEvents);

      const req = createMockRequest("http://localhost:3000/api/station/create", {
        method: "POST",
        body: JSON.stringify({
          name: "Grill Station",
          stationType: "cooking",
          capacitySimultaneousTasks: 5,
        }),
      });

      const res = await createStation(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.name).toBe("Grill Station");
      expect(body.events).toHaveLength(1);
      expect(body.events[0].type).toBe("StationCreated");
    });

    it("returns 500 when an unexpected error is thrown", async () => {
      mockAuth();
      vi.mocked(createManifestRuntime).mockRejectedValue(new Error("DB connection lost"));

      const req = createMockRequest("http://localhost:3000/api/station/create", {
        method: "POST",
        body: JSON.stringify({ name: "Fail Station" }),
      });

      const res = await createStation(req);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ------------------------------------------------------------------ //
  // Station.activate / deactivate                                       //
  // ------------------------------------------------------------------ //

  describe("POST /api/station/activate", () => {
    it("activates a station successfully", async () => {
      mockAuth();
      mockSuccessfulRunCommand({ id: TEST_STATION_ID, isActive: true });

      const req = createMockRequest("http://localhost:3000/api/station/activate", {
        method: "POST",
        body: JSON.stringify({ id: TEST_STATION_ID }),
      });

      const res = await activateStation(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("POST /api/station/deactivate", () => {
    it("deactivates a station successfully", async () => {
      mockAuth();
      mockSuccessfulRunCommand({ id: TEST_STATION_ID, isActive: false });

      const req = createMockRequest("http://localhost:3000/api/station/deactivate", {
        method: "POST",
        body: JSON.stringify({ id: TEST_STATION_ID }),
      });

      const res = await deactivateStation(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // ------------------------------------------------------------------ //
  // Station.assignTask / removeTask                                     //
  // ------------------------------------------------------------------ //

  describe("POST /api/station/assign-task", () => {
    it("assigns a task to a station", async () => {
      mockAuth();
      mockSuccessfulRunCommand({ id: TEST_STATION_ID, taskId: "task-001" });

      const req = createMockRequest("http://localhost:3000/api/station/assign-task", {
        method: "POST",
        body: JSON.stringify({ stationId: TEST_STATION_ID, taskId: "task-001" }),
      });

      const res = await assignTask(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("POST /api/station/remove-task", () => {
    it("removes a task from a station", async () => {
      mockAuth();
      mockSuccessfulRunCommand({ id: TEST_STATION_ID, taskId: "task-001", removed: true });

      const req = createMockRequest("http://localhost:3000/api/station/remove-task", {
        method: "POST",
        body: JSON.stringify({ stationId: TEST_STATION_ID, taskId: "task-001" }),
      });

      const res = await removeTask(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // ------------------------------------------------------------------ //
  // Station.updateCapacity / updateEquipment                            //
  // ------------------------------------------------------------------ //

  describe("POST /api/station/update-capacity", () => {
    it("updates the capacity of a station", async () => {
      mockAuth();
      mockSuccessfulRunCommand({ id: TEST_STATION_ID, capacitySimultaneousTasks: 10 });

      const req = createMockRequest("http://localhost:3000/api/station/update-capacity", {
        method: "POST",
        body: JSON.stringify({ id: TEST_STATION_ID, capacitySimultaneousTasks: 10 }),
      });

      const res = await updateCapacity(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("POST /api/station/update-equipment", () => {
    it("updates the equipment list of a station", async () => {
      mockAuth();
      mockSuccessfulRunCommand({ id: TEST_STATION_ID, equipmentList: ["grill", "oven", "blender"] });

      const req = createMockRequest("http://localhost:3000/api/station/update-equipment", {
        method: "POST",
        body: JSON.stringify({ id: TEST_STATION_ID, equipmentList: ["grill", "oven", "blender"] }),
      });

      const res = await updateEquipment(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  // ------------------------------------------------------------------ //
  // Manifest runtime failure modes                                      //
  // ------------------------------------------------------------------ //

  describe("Manifest runtime failure modes", () => {
    it("returns 403 on policy denial", async () => {
      mockAuth();
      mockPolicyDenialRunCommand("StationWritePolicy");

      const req = createMockRequest("http://localhost:3000/api/station/create", {
        method: "POST",
        body: JSON.stringify({ name: "Unauthorized Station" }),
      });

      const res = await createStation(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("StationWritePolicy");
    });

    it("returns 422 on guard failure", async () => {
      mockAuth();
      mockGuardFailureRunCommand(0, "capacitySimultaneousTasks must be positive");

      const req = createMockRequest("http://localhost:3000/api/station/update-capacity", {
        method: "POST",
        body: JSON.stringify({ id: TEST_STATION_ID, capacitySimultaneousTasks: -1 }),
      });

      const res = await updateCapacity(req);
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("capacitySimultaneousTasks must be positive");
    });

    it("returns 400 on generic command failure", async () => {
      mockAuth();
      mockFailedRunCommand("Station name is required");

      const req = createMockRequest("http://localhost:3000/api/station/create", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await createStation(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Station name is required");
    });
  });

  // ------------------------------------------------------------------ //
  // GET /api/kitchen/stations — Paginated list with filters             //
  // ------------------------------------------------------------------ //

  describe("GET /api/kitchen/stations", () => {
    it("returns paginated stations with task counts", async () => {
      mockAuth();

      const mockStations = [
        createMockStation({ id: "s-001", name: "Grill Station" }),
        createMockStation({ id: "s-002", name: "Prep Station", stationType: "prep" }),
      ];

      vi.mocked(database.station.findMany).mockResolvedValue(mockStations as never);
      vi.mocked(database.station.count).mockResolvedValue(2);
      vi.mocked(database.prepListItem.count).mockResolvedValue(3);

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations");
      const res = await getStationsList(req);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(2);
      expect(body.data[0].currentTaskCount).toBe(3);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it("filters by stationType", async () => {
      mockAuth();
      vi.mocked(database.station.findMany).mockResolvedValue([] as never);
      vi.mocked(database.station.count).mockResolvedValue(0);

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations?stationType=cooking");
      await getStationsList(req);

      expect(database.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ stationType: "cooking" }),
            ]),
          }),
        }),
      );
    });

    it("filters by isActive status", async () => {
      mockAuth();
      vi.mocked(database.station.findMany).mockResolvedValue([] as never);
      vi.mocked(database.station.count).mockResolvedValue(0);

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations?isActive=true");
      await getStationsList(req);

      expect(database.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ isActive: true }),
            ]),
          }),
        }),
      );
    });

    it("filters by search term (case-insensitive name match)", async () => {
      mockAuth();
      vi.mocked(database.station.findMany).mockResolvedValue([] as never);
      vi.mocked(database.station.count).mockResolvedValue(0);

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations?search=grill");
      await getStationsList(req);

      expect(database.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                name: { contains: "grill", mode: "insensitive" },
              }),
            ]),
          }),
        }),
      );
    });

    it("handles pagination with page and limit params", async () => {
      mockAuth();
      vi.mocked(database.station.findMany).mockResolvedValue([] as never);
      vi.mocked(database.station.count).mockResolvedValue(50);

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations?page=3&limit=10");
      const res = await getStationsList(req);

      const body = await res.json();
      expect(body.pagination).toEqual({ page: 3, limit: 10, total: 50, totalPages: 5 });
      expect(database.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 }),
      );
    });

    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations");
      const res = await getStationsList(req);

      expect(res.status).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.station.findMany).mockRejectedValue(new Error("DB error"));

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations");
      const res = await getStationsList(req);

      expect(res.status).toBe(500);
    });

    it("enforces tenant isolation by filtering on tenantId", async () => {
      mockAuth();
      vi.mocked(database.station.findMany).mockResolvedValue([] as never);
      vi.mocked(database.station.count).mockResolvedValue(0);

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations");
      await getStationsList(req);

      expect(database.station.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ tenantId: TEST_TENANT_ID }),
            ]),
          }),
        }),
      );
    });
  });

  // ------------------------------------------------------------------ //
  // GET /api/kitchen/stations/[id] — Station detail                     //
  // ------------------------------------------------------------------ //

  describe("GET /api/kitchen/stations/[id]", () => {
    it("returns a station by ID", async () => {
      mockAuth();
      const mockStation = createMockStation();
      vi.mocked(database.station.findFirst).mockResolvedValue(mockStation as never);

      const req = createMockRequest(`http://localhost:3000/api/kitchen/stations/${TEST_STATION_ID}`);
      const res = await getStationDetail(req, {
        params: Promise.resolve({ id: TEST_STATION_ID }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.station.id).toBe(TEST_STATION_ID);
    });

    it("returns 404 when station does not exist", async () => {
      mockAuth();
      vi.mocked(database.station.findFirst).mockResolvedValue(null);

      const req = createMockRequest("http://localhost:3000/api/kitchen/stations/nonexistent-id");
      const res = await getStationDetail(req, {
        params: Promise.resolve({ id: "nonexistent-id" }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toBe("Station not found");
    });

    it("enforces tenant isolation on detail queries", async () => {
      mockAuth();
      vi.mocked(database.station.findFirst).mockResolvedValue(null);

      const otherTenantStationId = "x0000000-0000-4000-a000-000000000099";
      const req = createMockRequest(`http://localhost:3000/api/kitchen/stations/${otherTenantStationId}`);
      await getStationDetail(req, {
        params: Promise.resolve({ id: otherTenantStationId }),
      });

      expect(database.station.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: otherTenantStationId,
            tenantId: TEST_TENANT_ID,
          }),
        }),
      );
    });

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const req = createMockRequest(`http://localhost:3000/api/kitchen/stations/${TEST_STATION_ID}`);
      const res = await getStationDetail(req, {
        params: Promise.resolve({ id: TEST_STATION_ID }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.station.findFirst).mockRejectedValue(new Error("Connection refused"));

      const req = createMockRequest(`http://localhost:3000/api/kitchen/stations/${TEST_STATION_ID}`);
      const res = await getStationDetail(req, {
        params: Promise.resolve({ id: TEST_STATION_ID }),
      });

      expect(res.status).toBe(500);
    });
  });
});
