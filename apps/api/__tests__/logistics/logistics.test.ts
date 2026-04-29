/**
 * Logistics API Integration Tests
 *
 * Tests all logistics endpoints across three domains:
 *   - Drivers: list, create, soft-delete (Prisma ORM)
 *   - Vehicles: list, create, soft-delete (Raw SQL via $queryRaw)
 *   - Delivery Routes: list, create (Prisma ORM via requireTenantId)
 *
 * Covers authentication, tenant resolution, validation, pagination,
 * data shaping, and error handling for each route.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
}));
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
        { status },
      ),
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});
// Alias @/lib/database to the same mock surface as @repo/database so routes
// that import via either path resolve to the same object.
vi.mock("@/lib/database", async () => {
  const mod = await vi.importActual<typeof import("@repo/database")>(
    "@repo/database",
  );
  return mod;
});

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireTenantId } = await import(
  "@/app/lib/tenant"
);

// --- Route imports ---

import { GET as listDrivers } from "@/app/api/logistics/drivers/list/route";
import { POST as createDriver } from "@/app/api/logistics/drivers/commands/create/route";
import { POST as deleteDriver } from "@/app/api/logistics/drivers/commands/delete/route";
import { GET as listVehicles } from "@/app/api/logistics/vehicles/list/route";
import { POST as createVehicle } from "@/app/api/logistics/vehicles/commands/create/route";
import { POST as deleteVehicle } from "@/app/api/logistics/vehicles/commands/delete/route";
import { GET as listRoutes } from "@/app/api/logistics/routes/list/route";
import { POST as createRoute } from "@/app/api/logistics/routes/commands/create/route";

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
    plate_number: "ABC-1234",
    vin: "1FTBW2CM5JKA00001",
    capacity_weight: 2000,
    capacity_volume: 15,
    fuel_type: "diesel",
    mileage: 15000,
    status: "available",
    notes: null,
    created_at: new Date("2026-01-01"),
    assigned_drivers: 0,
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
  // DRIVERS                                                              //
  // ------------------------------------------------------------------- //

  describe("GET /api/logistics/drivers/list", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list",
      );
      const response = await listDrivers(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant not found", async () => {
      mockAuth();
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list",
      );
      const response = await listDrivers(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
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
        mockDrivers as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list",
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
        "http://localhost/api/logistics/drivers/list",
      );
      await listDrivers(request);

      expect(database.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        }),
      );
    });

    it("applies status filter from query params", async () => {
      mockAuth();
      vi.mocked(database.driver.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list?status=available",
      );
      await listDrivers(request);

      expect(database.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "available",
          }),
        }),
      );
    });

    it("orders drivers by name ascending", async () => {
      mockAuth();
      vi.mocked(database.driver.findMany).mockResolvedValue([] as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list",
      );
      await listDrivers(request);

      expect(database.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: "asc" },
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.driver.findMany).mockRejectedValue(
        new Error("Connection refused"),
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/list",
      );
      const response = await listDrivers(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ------------------------------------------------------------------- //
  // DRIVERS / CREATE                                                     //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/drivers/commands/create", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Driver" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createDriver(request);

      expect(response.status).toBe(401);
    });

    it("returns 400 when tenant not found", async () => {
      mockAuth();
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ name: "Test Driver" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createDriver(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("returns 400 when name is missing", async () => {
      mockAuth();

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ phone: "+1-555-0000" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createDriver(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("name is required");
    });

    it("creates a driver with status available and returns driver", async () => {
      mockAuth();
      const mockResult = {
        id: "driver-new",
        name: "Jane Doe",
        status: "available",
        createdAt: new Date("2026-04-01"),
      };
      vi.mocked(database.driver.create).mockResolvedValue(
        mockResult as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/create",
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
        },
      );
      const response = await createDriver(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.driver.name).toBe("Jane Doe");
      expect(body.driver.status).toBe("available");

      expect(database.driver.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            name: "Jane Doe",
            status: "available",
          }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.driver.create).mockRejectedValue(
        new Error("Unique constraint violation"),
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ name: "Crash Driver" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createDriver(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // ------------------------------------------------------------------- //
  // DRIVERS / DELETE (soft delete)                                       //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/drivers/commands/delete", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/delete",
        {
          method: "POST",
          body: JSON.stringify({ driverId: "driver-001" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await deleteDriver(request);

      expect(response.status).toBe(401);
    });

    it("returns 400 when driverId is missing", async () => {
      mockAuth();

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/delete",
        {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await deleteDriver(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("driverId is required");
    });

    it("soft-deletes a driver by setting deletedAt", async () => {
      mockAuth();
      vi.mocked(database.driver.update).mockResolvedValue({} as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/delete",
        {
          method: "POST",
          body: JSON.stringify({ driverId: "driver-001" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await deleteDriver(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.deleted).toBe(true);

      expect(database.driver.update).toHaveBeenCalledWith({
        where: {
          tenantId_id: { tenantId: TEST_TENANT_ID, id: "driver-001" },
        },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.driver.update).mockRejectedValue(
        new Error("Record not found"),
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/drivers/commands/delete",
        {
          method: "POST",
          body: JSON.stringify({ driverId: "driver-999" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await deleteDriver(request);

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // VEHICLES / LIST (Raw SQL)                                            //
  // ------------------------------------------------------------------- //

  describe("GET /api/logistics/vehicles/list", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list",
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant not found", async () => {
      mockAuth();
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list",
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("returns vehicles via $queryRaw for authenticated user", async () => {
      mockAuth();
      const mockVehicles = [
        createMockVehicle({ id: "v-001", make: "Ford" }),
        createMockVehicle({
          id: "v-002",
          make: "Mercedes",
          assigned_drivers: 2,
        }),
      ];

      vi.mocked(database.$queryRaw).mockResolvedValue(mockVehicles);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list",
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.vehicles).toHaveLength(2);
      expect(body.vehicles[0].make).toBe("Ford");
      expect(body.vehicles[1].assigned_drivers).toBe(2);
    });

    it("calls $queryRaw for raw SQL query", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list",
      );
      await listVehicles(request);

      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it("returns default limit (50) and offset (0) when not specified", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list",
      );
      const response = await listVehicles(request);

      const body = await response.json();
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("SQL syntax error"),
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list",
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });

    it("returns empty array when no vehicles exist", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/list",
      );
      const response = await listVehicles(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.vehicles).toEqual([]);
    });
  });

  // ------------------------------------------------------------------- //
  // VEHICLES / CREATE (Raw SQL)                                          //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/vehicles/commands/create", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ make: "Ford", model: "Transit" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createVehicle(request);

      expect(response.status).toBe(401);
    });

    it("returns 400 when make and model are missing", async () => {
      mockAuth();

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ year: 2024 }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createVehicle(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("make and model are required");
    });

    it("returns 400 when only make is provided", async () => {
      mockAuth();

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ make: "Ford" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createVehicle(request);

      expect(response.status).toBe(400);
    });

    it("creates a vehicle via $queryRaw and returns first result", async () => {
      mockAuth();
      const mockResult = {
        id: "vehicle-new",
        make: "Mercedes",
        model: "Sprinter",
        status: "available",
        created_at: new Date("2026-04-01"),
      };
      vi.mocked(database.$queryRaw).mockResolvedValue([mockResult]);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/create",
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
        },
      );
      const response = await createVehicle(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.vehicle.make).toBe("Mercedes");
      expect(body.vehicle.model).toBe("Sprinter");
      expect(body.vehicle.status).toBe("available");

      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("Foreign key violation"),
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ make: "Ford", model: "Transit" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createVehicle(request);

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // VEHICLES / DELETE (Raw SQL soft delete)                              //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/vehicles/commands/delete", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/delete",
        {
          method: "POST",
          body: JSON.stringify({ vehicleId: "vehicle-001" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await deleteVehicle(request);

      expect(response.status).toBe(401);
    });

    it("returns 400 when vehicleId is missing", async () => {
      mockAuth();

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/delete",
        {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await deleteVehicle(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.message).toBe("vehicleId is required");
    });

    it("soft-deletes vehicle by setting deleted_at and status decommissioned", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockResolvedValue(undefined);

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/delete",
        {
          method: "POST",
          body: JSON.stringify({ vehicleId: "vehicle-001" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await deleteVehicle(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      expect(database.$queryRaw).toHaveBeenCalled();
    });

    it("returns 500 on database error", async () => {
      mockAuth();
      vi.mocked(database.$queryRaw).mockRejectedValue(
        new Error("Connection timeout"),
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/vehicles/commands/delete",
        {
          method: "POST",
          body: JSON.stringify({ vehicleId: "vehicle-999" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await deleteVehicle(request);

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // DELIVERY ROUTES / LIST (requireTenantId + Prisma ORM)                //
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
        mockRoutes as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list",
      );
      const response = await listRoutes(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.routes).toHaveLength(2);
      expect(body.routes[0].routeNumber).toBe("RT-000001");
    });

    it("filters by status from query params", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue(
        [] as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list?status=planned",
      );
      await listRoutes(request);

      expect(database.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "planned",
          }),
        }),
      );
    });

    it("filters by date from query params", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue(
        [] as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list?date=2026-04-15",
      );
      await listRoutes(request);

      expect(database.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledDate: expect.any(Date),
          }),
        }),
      );
    });

    it("excludes soft-deleted routes", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue(
        [] as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list",
      );
      await listRoutes(request);

      expect(database.deliveryRoute.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockRejectedValue(
        new Error("Connection refused"),
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list",
      );
      const response = await listRoutes(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to list routes");
    });

    it("returns empty routes array when none exist", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findMany).mockResolvedValue(
        [] as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/list",
      );
      const response = await listRoutes(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.routes).toEqual([]);
    });
  });

  // ------------------------------------------------------------------- //
  // DELIVERY ROUTES / CREATE (requireTenantId + Prisma ORM)              //
  // ------------------------------------------------------------------- //

  describe("POST /api/logistics/routes/commands/create", () => {
    it("creates a route with auto-generated route number RT-000001 when no prior routes", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);

      // No existing routes
      vi.mocked(database.deliveryRoute.findFirst).mockResolvedValue(
        null as never,
      );

      const mockCreated = createMockRoute({
        id: "route-new",
        routeNumber: "RT-000001",
        name: "Route RT-000001",
        stops: [],
      });
      vi.mocked(database.deliveryRoute.create).mockResolvedValue(
        mockCreated as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Downtown Delivery",
            scheduledDate: "2026-04-20",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createRoute(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.route.routeNumber).toBe("RT-000001");

      expect(database.deliveryRoute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            routeNumber: "RT-000001",
          }),
        }),
      );
    });

    it("increments route number from last existing route", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);

      vi.mocked(database.deliveryRoute.findFirst).mockResolvedValue({
        routeNumber: "RT-000003",
      } as never);

      const mockCreated = createMockRoute({
        id: "route-new",
        routeNumber: "RT-000004",
      });
      vi.mocked(database.deliveryRoute.create).mockResolvedValue(
        mockCreated as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ name: "Next Route" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createRoute(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.route.routeNumber).toBe("RT-000004");

      expect(database.deliveryRoute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            routeNumber: "RT-000004",
          }),
        }),
      );
    });

    it("creates route with nested stops", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findFirst).mockResolvedValue(
        null as never,
      );

      const mockCreated = createMockRoute({
        id: "route-with-stops",
        routeNumber: "RT-000001",
        stops: [
          { id: "stop-1", stopNumber: 1, stopType: "pickup" },
          { id: "stop-2", stopNumber: 2, stopType: "delivery" },
        ],
      });
      vi.mocked(database.deliveryRoute.create).mockResolvedValue(
        mockCreated as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/commands/create",
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
        },
      );
      const response = await createRoute(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.route.stops).toHaveLength(2);

      expect(database.deliveryRoute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stops: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({
                  tenantId: TEST_TENANT_ID,
                  stopNumber: 1,
                }),
                expect.objectContaining({
                  tenantId: TEST_TENANT_ID,
                  stopNumber: 2,
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it("uses default name when name not provided", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findFirst).mockResolvedValue(
        null as never,
      );

      const mockCreated = createMockRoute({
        routeNumber: "RT-000005",
        name: "Route RT-000005",
      });
      vi.mocked(database.deliveryRoute.create).mockResolvedValue(
        mockCreated as never,
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/commands/create",
        {
          method: "POST",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        },
      );
      await createRoute(request);

      expect(database.deliveryRoute.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: expect.stringContaining("RT-"),
          }),
        }),
      );
    });

    it("returns 500 on database error", async () => {
      vi.mocked(requireTenantId).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.deliveryRoute.findFirst).mockRejectedValue(
        new Error("Connection refused"),
      );

      const request = new NextRequest(
        "http://localhost/api/logistics/routes/commands/create",
        {
          method: "POST",
          body: JSON.stringify({ name: "Fail Route" }),
          headers: { "Content-Type": "application/json" },
        },
      );
      const response = await createRoute(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to create route");
    });
  });
});
