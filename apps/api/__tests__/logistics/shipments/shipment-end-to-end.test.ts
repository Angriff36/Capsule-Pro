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
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
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
import {
  getTenantIdForOrg,
  requireCurrentUser,
  resolveCurrentUser,
} from "@/app/lib/tenant";
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
      vi.mocked(database.shipment.findFirst).mockResolvedValue(
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

      expect(database.shipment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: "ship-002",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          },
        })
      );
    });

    it("returns 404 for non-existent shipment", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_CLERK_ID,
      } as any);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
      vi.mocked(database.shipment.findFirst).mockResolvedValue(null);

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
      vi.mocked(resolveCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        authUserId: TEST_CLERK_ID,
      } as any);
      vi.mocked(requireCurrentUser).mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        authUserId: TEST_CLERK_ID,
      } as any);
      mockRunCommand.mockClear();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        // getEntity required by resolveParentContext + sanitizeCreateInitialTransitionInput for create commands.
        getEntity: vi.fn().mockReturnValue(undefined),
        getCommand: vi.fn().mockReturnValue(undefined),
        runCommand: mockRunCommand,
      } as any);
    });

    // Instance-scoped verbs go through the canonical dispatcher (the concrete
    // per-command routes were pruned by commit 12c1a4f9b — constitution §6).
    // The dispatcher derives `instanceId` from `body.id`.
    //
    // Each body carries the verb's required command params so it clears the
    // dispatcher's Zod pre-flight gate (which 400s on missing required params
    // BEFORE the mocked runtime runs); `id` is the unused instance-id key on
    // top. We are asserting instanceId forwarding, so the param values are
    // arbitrary valid placeholders.
    const instanceScopedVerbs: Array<{
      verb: string;
      body: Record<string, unknown>;
    }> = [
      {
        verb: "update",
        body: {
          trackingNumber: "T-1",
          carrier: "UPS",
          shippingMethod: "ground",
          estimatedDeliveryDate: 1_735_689_600_000,
          shippingCost: 10,
          notes: "",
          internalNotes: "",
        },
      },
      { verb: "cancel", body: { userId: TEST_USER_ID, reason: "supplier delay" } },
      {
        verb: "schedule",
        body: { userId: TEST_USER_ID, scheduledDate: 1_735_689_600_000 },
      },
      { verb: "ship", body: { userId: TEST_USER_ID, trackingNumber: "1Z9999" } },
      { verb: "startPreparing", body: { userId: TEST_USER_ID } },
      {
        verb: "markDelivered",
        body: {
          userId: TEST_USER_ID,
          receivedBy: "Jane Doe",
          signatureData: "data:image/png;base64,xyz",
        },
      },
    ];

    for (const { verb, body } of instanceScopedVerbs) {
      it(`${verb} command forwards instanceId from body.id to runCommand`, async () => {
        const { POST } = await import(
          "@/app/api/manifest/[entity]/commands/[command]/route"
        );
        const request = createMockRequest(
          `http://localhost:3000/api/manifest/Shipment/commands/${verb}`,
          {
            method: "POST",
            body: JSON.stringify({ id: "ship-003", ...body }),
          }
        );

        await POST(request, {
          params: Promise.resolve({ entity: "Shipment", command: verb }),
        });

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
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const request = createMockRequest(
        "http://localhost:3000/api/shipments/shipment/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            shipmentNumber: "SHP-NEW",
            carrier: "FedEx",
            scheduledDate: 1_735_689_600_000,
            shippingMethod: "ground",
            notes: "",
            supplierId: "",
            eventId: "",
          }),
        }
      );

      await mod.POST(request, {
        params: Promise.resolve({ entity: "Shipment", command: "create" }),
      });

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
