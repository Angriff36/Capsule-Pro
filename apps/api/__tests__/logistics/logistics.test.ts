/**
 * Logistics API Integration Tests
 *
 * Tests all logistics endpoints across three domains:
 *   - Drivers: list (Prisma ORM), create/delete via manifest dispatcher
 *   - Vehicles: list (Prisma ORM), create/delete via manifest dispatcher
 *   - Delivery Routes: list (requireTenantId + Prisma ORM), create via manifest dispatcher
 *
 * Covers authentication, tenant resolution, validation, pagination,
 * data shaping, and error handling for each route.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
const tenantModule = vi.hoisted(() => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/app/lib/tenant", () => tenantModule);
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      ),
    manifestErrorResponse: (
      message:
        | string
        | ({ error: string; diagnostics?: unknown[] } & Record<string, unknown>),
      status: number
    ) => {
      const body =
        typeof message === "string"
          ? { success: false, message }
          : {
              success: false,
              diagnostics: message.diagnostics ?? [],
              ...message,
              error: message.error,
            };
      return NextResponse.json(body, { status });
    },
  };
});
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "InvariantError";
    }
  },
}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireTenantId, requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// --- Route imports ---

import { GET as listDrivers } from "@/app/api/logistics/drivers/list/route";
import { GET as listRoutes } from "@/app/api/logistics/routes/list/route";
import { GET as listVehicles } from "@/app/api/logistics/vehicles/list/route";
import {
  POST as createDriver,
  POST as createRoute,
  POST as createVehicle,
  POST as deleteDriver,
  POST as deleteVehicle,
} from "@/app/api/manifest/[entity]/commands/[command]/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000010";
const TEST_USER_ID = "user_logistics_test";
const TEST_ORG_ID = "org_logistics_test";

// --- Helpers ---

function mockAuth() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

/** Mock requireCurrentUser for authenticated dispatcher calls */
function mockRequireCurrentUser() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  });
}

/** Mock requireCurrentUser to throw InvariantError for unauthenticated */
function mockRequireCurrentUserUnauthed() {
  const error = new Error("Unauthorized") as Error & { name: "InvariantError" };
  error.name = "InvariantError";
  vi.mocked(requireCurrentUser).mockRejectedValue(error);
}

function createMockDriver(overrides: Record<string, unknown> = {}) {
  return {
    id: "driver-001",
    tenantId: TEST_TENANT_ID,
    name: "John Smith",
    phone: "+1-555-0100",
    email: "john@example.com",
    licenseNumber: "DL-12345",
    licenseExpiry: new Date("2027-12-31"),
    status: "available",
    vehicleId: "vehicle-001",
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    vehicle: {
      make: "Ford",
      model: "Transit",
      plateNumber: "ABC-1234",
    },
    ...overrides,
  };
}

function createMockVehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: "vehicle-001",
    make: "Ford",
    model: "Transit",
    year: 2024,
    plateNumber: "ABC-1234",
    vin: "1FTBW2CM5JKA00001",
    capacityWeight: 2000,
    capacityVolume: 15,
    fuelType: "diesel",
    mileage: 15_000,
    status: "available",
    notes: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function createMockRoute(overrides: Record<string, unknown> = {}) {
  return {
    id: "route-001",
    tenantId: TEST_TENANT_ID,
    routeNumber: "RT-000001",
    name: "Route RT-000001",
    description: null,
    eventId: null,
    scheduledDate: new Date("2026-04-15"),
    status: "planned",
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
    deletedAt: null,
    stops: [],
    ...overrides,
  };
}

// ===================================================================== //
// TEST SUITE                                                             //
// ===================================================================== //

describe("Logistics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------- //
  // DRIVERS LIST                                                         //
  // ------------------------------------------------------------------- //

  describe("GET /api/logistics/drivers/list", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list"
      );
      const response = await listDrivers(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant not found", async () => {
      mockAuth();
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list"
      );
      const response = await listDrivers(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("returns drivers with shaped vehicle info for authenticated user", async () => {
      mockAuth();
      const mockDrivers = [
        createMockDriver({ id: "d-001", name: "Alice" }),
        createMockDriver({
          id: "d-002",
          name: "Bob",
          vehicle: null,
          vehicleId: null,
        }),
      ];

      vi.mocked(database.driver.findMany).mockResolvedValue(
        mockDrivers as never
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list"
      );
      const response = await listDrivers(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.drivers).toHaveLength(2);
      // First driver has a vehicle
      expect(body.drivers[0].vehicle_name).toBe("Ford Transit");
      expect(body.drivers[0].plate_number).toBe("ABC-1234");
      // Second driver has no vehicle
      expect(body.drivers[1].vehicle_name).toBeNull();
      expect(body.drivers[1].plate_number).toBeNull();
    });

    it("filters by tenantId and excludes soft-deleted drivers", async () => {
      mockAuth();
      vi.mocked(database.driver.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list"
      );
      await listDrivers(request);

      expect(database.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("applies status filter from query params", async () => {
      mockAuth();
      vi.mocked(database.driver.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list?status=available"
      );
      await listDrivers(request);

      expect(database.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "available",
          }),
        })
      );
    });

    it("orders drivers by name ascending", async () => {
      mockAuth();
      vi.mocked(database.driver.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list"
      );
      await listDrivers(request);

      expect(database.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: "asc" },
        })
      );
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.driver.findMany).mockRejectedValue(
        new Error("Connection refused")
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list"
      );
      const response = await listDrivers(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ------------------------------------------------------------------- //
  // DRIVERS / CREATE (via dispatcher)                                     //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/drivers/commands/create", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockRequireCurrentUserUnauthed();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Driver" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createDriver(request, {
        params: Promise.resolve({ entity: "Driver", command: "create" }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 401 when tenant not found (InvariantError)", async () => {
      mockRequireCurrentUserUnauthed();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Driver" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createDriver(request, {
        params: Promise.resolve({ entity: "Driver", command: "create" }),
      });

      expect(response.status).toBe(401);
    });

    it("creates a driver through manifest runtime", async () => {
      mockRequireCurrentUser();
      const driverResult = {
        id: "driver-new",
        name: "Jane Doe",
        status: "available",
        createdAt: new Date("2026-04-01"),
      };
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: driverResult, events: [] }), { status: 200 })
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Jane Doe",
            phone: "+1-555-0200",
            email: "jane@example.com",
            licenseNumber: "DL-99999",
            licenseExpiry: "2028-06-30",
            vehicleId: "vehicle-002",
            notes: "Experienced driver",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createDriver(request, {
        params: Promise.resolve({ entity: "Driver", command: "create" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.name).toBe("Jane Doe");
      expect(body.result.status).toBe("available");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Driver",
          command: "create",
          body: expect.objectContaining({ name: "Jane Doe" }),
          user: expect.objectContaining({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID }),
        })
      );
    });

    it("returns 500 on unexpected error", async () => {
      mockRequireCurrentUser();
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Unique constraint violation")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Crash Driver" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createDriver(request, {
        params: Promise.resolve({ entity: "Driver", command: "create" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // DRIVERS / DELETE (soft delete via dispatcher)                         //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/drivers/commands/delete", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockRequireCurrentUserUnauthed();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ driverId: "driver-001" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await deleteDriver(request, {
        params: Promise.resolve({ entity: "Driver", command: "remove" }),
      });

      expect(response.status).toBe(401);
    });

    it("soft-deletes a driver through manifest runtime", async () => {
      mockRequireCurrentUser();
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { id: "driver-001", deletedAt: new Date().toISOString() }, events: [] }), { status: 200 })
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ driverId: "driver-001" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await deleteDriver(request, {
        params: Promise.resolve({ entity: "Driver", command: "remove" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Driver",
          command: "remove",
          body: expect.objectContaining({ driverId: "driver-001" }),
          user: expect.objectContaining({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID }),
        })
      );
    });

    it("returns 500 on unexpected error", async () => {
      mockRequireCurrentUser();
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Record not found")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ driverId: "driver-999" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await deleteDriver(request, {
        params: Promise.resolve({ entity: "Driver", command: "remove" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // VEHICLES / LIST                                                       //
  // ------------------------------------------------------------------- //

  describe("GET /api/logistics/vehicles/list", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list"
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant not found", async () => {
      mockAuth();
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list"
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("returns vehicles for authenticated user", async () => {
      mockAuth();
      const mockVehicles = [
        createMockVehicle({ id: "v-001", make: "Ford" }),
        createMockVehicle({
          id: "v-002",
          make: "Mercedes",
        }),
      ];

      vi.mocked(database.vehicle.findMany).mockResolvedValue(mockVehicles as never);
      vi.mocked(database.driver.count).mockResolvedValue(0);
      vi.mocked(database.driver.count).mockResolvedValue(2);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list"
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.vehicles).toHaveLength(2);
      expect(body.vehicles[0].make).toBe("Ford");
    });

    it("calls database.vehicle.findMany for vehicles query", async () => {
      mockAuth();
      vi.mocked(database.vehicle.findMany).mockResolvedValue([]);
      vi.mocked(database.driver.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list"
      );
      await listVehicles(request);

      expect(database.vehicle.findMany).toHaveBeenCalled();
    });

    it("returns default limit (50) and offset (0) when not specified", async () => {
      mockAuth();
      vi.mocked(database.vehicle.findMany).mockResolvedValue([]);
      vi.mocked(database.driver.count).mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list"
      );
      const response = await listVehicles(request);

      const body = await response.json();
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.vehicle.findMany).mockRejectedValue(
        new Error("SQL syntax error")
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list"
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe("Internal server error");
    });

    it("returns empty array when no vehicles exist", async () => {
      mockAuth();
      vi.mocked(database.vehicle.findMany).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list"
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.vehicles).toEqual([]);
    });
  });

  // ------------------------------------------------------------------- //
  // VEHICLES / CREATE (via dispatcher)                                    //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/vehicles/commands/create", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockRequireCurrentUserUnauthed();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ make: "Ford", model: "Transit" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createVehicle(request, {
        params: Promise.resolve({ entity: "Vehicle", command: "create" }),
      });

      expect(response.status).toBe(401);
    });

    it("creates a vehicle through manifest runtime", async () => {
      mockRequireCurrentUser();
      const vehicleResult = {
        id: "vehicle-new",
        make: "Mercedes",
        model: "Sprinter",
        status: "available",
        created_at: new Date("2026-04-01"),
      };
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: vehicleResult, events: [] }), { status: 200 })
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            make: "Mercedes",
            model: "Sprinter",
            year: 2025,
            plateNumber: "XYZ-5678",
            vin: "WDB9066331S000001",
            capacityWeight: 3000,
            capacityVolume: 20,
            fuelType: "diesel",
            notes: "New delivery van",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createVehicle(request, {
        params: Promise.resolve({ entity: "Vehicle", command: "create" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.make).toBe("Mercedes");
      expect(body.result.model).toBe("Sprinter");
      expect(body.result.status).toBe("available");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Vehicle",
          command: "create",
          user: expect.objectContaining({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID }),
        })
      );
    });

    it("returns 500 on unexpected error", async () => {
      mockRequireCurrentUser();
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Foreign key violation")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ make: "Ford", model: "Transit" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createVehicle(request, {
        params: Promise.resolve({ entity: "Vehicle", command: "create" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // VEHICLES / DELETE (via dispatcher)                                    //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/vehicles/commands/delete", () => {
    it("returns 401 for unauthenticated requests", async () => {
      mockRequireCurrentUserUnauthed();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ vehicleId: "vehicle-001" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await deleteVehicle(request, {
        params: Promise.resolve({ entity: "Vehicle", command: "remove" }),
      });

      expect(response.status).toBe(401);
    });

    it("soft-deletes vehicle through manifest runtime", async () => {
      mockRequireCurrentUser();
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: { id: "vehicle-001", deletedAt: new Date().toISOString() }, events: [] }), { status: 200 })
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ vehicleId: "vehicle-001" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await deleteVehicle(request, {
        params: Promise.resolve({ entity: "Vehicle", command: "remove" }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Vehicle",
          command: "remove",
          body: expect.objectContaining({ vehicleId: "vehicle-001" }),
          user: expect.objectContaining({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID }),
        })
      );
    });

    it("returns 500 on unexpected error", async () => {
      mockRequireCurrentUser();
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Connection timeout")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ vehicleId: "vehicle-999" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await deleteVehicle(request, {
        params: Promise.resolve({ entity: "Vehicle", command: "remove" }),
      });

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // DELIVERY ROUTES / LIST (requireTenantId + Prisma ORM)                 //
  // ------------------------------------------------------------------- //

  describe("GET /api/logistics/routes/list", () => {
    it("returns routes for authenticated tenant", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      const mockRoutes = [
        createMockRoute({ id: "r-001", routeNumber: "RT-000001" }),
        createMockRoute({
          id: "r-002",
          routeNumber: "RT-000002",
          status: "in_progress",
        }),
      ];
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue(
        mockRoutes as never
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list"
      );
      const response = await listRoutes(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.routes).toHaveLength(2);
      expect(body.routes[0].routeNumber).toBe("RT-000001");
    });

    it("filters by status from query params", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list?status=planned"
      );
      await listRoutes(request);

      expect(database.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "planned",
          }),
        })
      );
    });

    it("filters by date from query params", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list?date=2026-04-15"
      );
      await listRoutes(request);

      expect(database.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledDate: expect.any(Date),
          }),
        })
      );
    });

    it("excludes soft-deleted routes", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list"
      );
      await listRoutes(request);

      expect(database.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("returns 500 on database error", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockRejectedValue(
        new Error("Connection refused")
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list"
      );
      const response = await listRoutes(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to list routes");
    });

    it("returns empty routes array when none exist", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list"
      );
      const response = await listRoutes(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.routes).toEqual([]);
    });
  });

  // ------------------------------------------------------------------- //
  // DELIVERY ROUTES / CREATE (requireTenantId + Prisma ORM)               //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/routes/commands/create", () => {
    it("creates a route through manifest runtime", async () => {
      mockRequireCurrentUser();
      const routeResult = {
        id: "route-new",
        routeNumber: "RT-000001",
        name: "Downtown Delivery",
        tenantId: TEST_TENANT_ID,
      };
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: routeResult, events: [] }), { status: 200 })
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Downtown Delivery",
            scheduledDate: "2026-04-20",
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createRoute(request, {
        params: Promise.resolve({
          entity: "LogisticsRoute",
          command: "create",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.routeNumber).toBe("RT-000001");

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "LogisticsRoute",
          command: "create",
          body: expect.objectContaining({ name: "Downtown Delivery" }),
          user: expect.objectContaining({ id: TEST_USER_ID, tenantId: TEST_TENANT_ID }),
        })
      );
    });

    it("creates route with stops through manifest runtime", async () => {
      mockRequireCurrentUser();
      const routeResult = {
        id: "route-with-stops",
        routeNumber: "RT-000002",
        stops: [
          { id: "stop-1", stopNumber: 1, stopType: "pickup" },
          { id: "stop-2", stopNumber: 2, stopType: "delivery" },
        ],
      };
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(JSON.stringify({ success: true, result: routeResult, events: [] }), { status: 200 })
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Multi-stop Route",
            stops: [
              { name: "Warehouse", stopType: "pickup", locationId: "loc-1" },
              { name: "Customer", stopType: "delivery", locationId: "loc-2" },
            ],
          }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createRoute(request, {
        params: Promise.resolve({
          entity: "LogisticsRoute",
          command: "create",
        }),
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.result.stops).toHaveLength(2);
    });

    it("returns 401 for unauthenticated requests", async () => {
      mockRequireCurrentUserUnauthed();

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Fail Route" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createRoute(request, {
        params: Promise.resolve({
          entity: "LogisticsRoute",
          command: "create",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 500 on unexpected error", async () => {
      mockRequireCurrentUser();
      vi.mocked(runManifestCommand).mockRejectedValue(
        new Error("Connection refused")
      );

      const request = new NextRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          method: "POST",
          body: JSON.stringify({ name: "Fail Route" }),
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await createRoute(request, {
        params: Promise.resolve({
          entity: "LogisticsRoute",
          command: "create",
        }),
      });

      expect(response.status).toBe(500);
    });
  });
});
