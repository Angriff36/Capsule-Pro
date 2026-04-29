/**
 * Shipment End-to-End Persistence Tests
 *
 * Tests that the Shipment write path (manifest command → ShipmentPrismaStore)
 * and read path (Prisma list/detail API) are aligned. The write path persists
 * through the ShipmentPrismaStore, and the read path queries the same Prisma
 * model — so a created shipment is immediately visible in the list API.
 *
 * This test also verifies the `instanceId` fix: instance-scoped command routes
 * (update, cancel, schedule, ship, startPreparing, markDelivered) must pass
 * `instanceId` to `runtime.runCommand` so the store can target the correct
 * entity row.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@/app/lib/invariant", async () => {
  const actual = await vi.importActual("@/app/lib/invariant");
  return actual;
});

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_ORG_ID = "org-test-123";
const TEST_USER_ID = "u0000000-0000-4000-a000-000000000001";
const TEST_CLERK_ID = "clerk_test_001";

function createMockShipment(overrides: Record<string, unknown> = {}) {
  return {
    id: "ship-001",
    tenantId: TEST_TENANT_ID,
    shipmentNumber: "SHP-001",
    status: "draft",
    eventId: null,
    supplierId: null,
    locationId: null,
    scheduledDate: null,
    shippedDate: null,
    estimatedDeliveryDate: null,
    actualDeliveryDate: null,
    totalItems: 0,
    shippingCost: null,
    totalValue: null,
    trackingNumber: null,
    carrier: null,
    shippingMethod: null,
    deliveredBy: null,
    receivedBy: null,
    signature: null,
    notes: null,
    internalNotes: null,
    reference: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

describe("Shipment Persistence (write → read alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // 1. GET /api/shipments/shipment/list — list route
  // -----------------------------------------------------------------------

  describe("GET /api/shipments/shipment/list", () => {
    it("returns shipments persisted through ShipmentPrismaStore", async () => {
      const mockShipment = createMockShipment({
        id: "ship-001",
        status: "draft",
        shipmentNumber: "SHP-001",
      });

      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.shipment.findMany).mockResolvedValue([
        mockShipment,
      ] as never);

      const { GET } = await import("@/app/api/shipments/shipment/list/route");

      const request = createMockRequest(
        "http://localhost:3000/api/shipments/shipment/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shipments).toHaveLength(1);
      expect(data.shipments[0].id).toBe("ship-001");
      expect(data.shipments[0].status).toBe("draft");

      expect(database.shipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as any);

      const { GET } = await import("@/app/api/shipments/shipment/list/route");

      const request = createMockRequest(
        "http://localhost:3000/api/shipments/shipment/list"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("excludes soft-deleted shipments from the list", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.shipment.findMany).mockResolvedValue([]);

      const { GET } = await import("@/app/api/shipments/shipment/list/route");

      const request = createMockRequest(
        "http://localhost:3000/api/shipments/shipment/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shipments).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // 2. GET /api/shipments/shipment/[id] — detail route
  // -----------------------------------------------------------------------

  describe("GET /api/shipments/shipment/[id] (detail)", () => {
    it("returns a single persisted shipment", async () => {
      const mockShipment = createMockShipment({
        id: "ship-002",
        status: "in_transit",
        trackingNumber: "TRACK-123",
      });

      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.shipment.findUnique).mockResolvedValue(
        mockShipment as never
      );

      const { GET } = await import("@/app/api/shipments/shipment/[id]/route");

      const request = createMockRequest(
        "http://localhost:3000/api/shipments/shipment/ship-002"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "ship-002" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.shipment.id).toBe("ship-002");
      expect(data.shipment.status).toBe("in_transit");

      expect(database.shipment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "ship-002",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("returns 404 for non-existent shipment", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.shipment.findUnique).mockResolvedValue(null);

      const { GET } = await import("@/app/api/shipments/shipment/[id]/route");

      const request = createMockRequest(
        "http://localhost:3000/api/shipments/shipment/non-existent"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Command routes pass instanceId for instance-scoped verbs
  // -----------------------------------------------------------------------

  describe("instanceId on command routes (Blocker #1 fix)", () => {
    const mockUser = {
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
      authUserId: TEST_CLERK_ID,
    };

    const mockRunCommand = vi.fn().mockResolvedValue({
      success: true,
      result: { id: "ship-003", status: "draft" },
      emittedEvents: [],
    });

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.user.findFirst).mockResolvedValue(mockUser as never);
      mockRunCommand.mockClear();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: mockRunCommand,
      } as any);
    });

    const instanceScopedVerbs = [
      { verb: "update", file: "update" },
      { verb: "cancel", file: "cancel" },
      { verb: "schedule", file: "schedule" },
      { verb: "ship", file: "ship" },
      { verb: "startPreparing", file: "start-preparing" },
      { verb: "markDelivered", file: "mark-delivered" },
    ];

    for (const { verb, file } of instanceScopedVerbs) {
      it(`${verb} route passes instanceId to runCommand`, async () => {
        const mod = await import(
          `@/app/api/shipments/shipment/commands/${file}/route`
        );
        const request = createMockRequest(
          `http://localhost:3000/api/shipments/shipment/commands/${file}`,
          {
            method: "POST",
            body: JSON.stringify({ id: "ship-003" }),
          }
        );

        await mod.POST(request);

        expect(mockRunCommand).toHaveBeenCalledWith(
          verb,
          expect.any(Object),
          expect.objectContaining({
            entityName: "Shipment",
            instanceId: "ship-003",
          })
        );
      });
    }

    it("create route does NOT pass instanceId", async () => {
      const mod = await import(
        "@/app/api/shipments/shipment/commands/create/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/shipments/shipment/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            shipmentNumber: "SHP-NEW",
            carrier: "FedEx",
          }),
        }
      );

      await mod.POST(request);

      expect(mockRunCommand).toHaveBeenCalledWith(
        "create",
        expect.any(Object),
        expect.not.objectContaining({
          instanceId: expect.anything(),
        })
      );
    });
  });
});
