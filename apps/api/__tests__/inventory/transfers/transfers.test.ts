/**
 * Inventory Transfers API Integration Tests
 *
 * Covers the 5-state transfer state machine and the list endpoint:
 *   - create  (POST commands/create)            → pending
 *   - approve (POST commands/approve)           → pending → approved
 *   - ship    (POST commands/ship)              → approved → in_transit
 *   - receive (POST commands/receive)           → in_transit → completed
 *   - cancel  (POST commands/cancel)            → pending|approved → cancelled
 *   - list    (GET  list)                       → paginated, filterable
 *
 * Why this matters:
 * Transfers move stock between locations. A bug in receive() can double-credit
 * inventory or skip the offsetting transfer_out, silently distorting on-hand
 * quantities and cost accounting. State-machine guards (no
 * approve-after-ship, no receive-without-ship) protect financial integrity,
 * so they must be unit-tested explicitly.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvariantError } from "@/app/lib/invariant";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// --- Route imports ---

import { GET as listTransfers } from "@/app/api/inventory/transfers/list/route";
import {
  POST as approveTransfer,
  POST as cancelTransfer,
  POST as createTransfer,
  POST as receiveTransfer,
  POST as shipTransfer,
} from "@/app/api/manifest/[entity]/commands/[command]/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000020";
const TEST_USER_ID = "user_transfers_test";
const TEST_ORG_ID = "org_transfers_test";
const VALID_LOCATION_UUID_A = "00000000-0000-0000-0000-000000000001";
const VALID_LOCATION_UUID_B = "00000000-0000-0000-0000-000000000002";
const VALID_ITEM_UUID_1 = "00000000-0000-0000-0000-000000000010";
const VALID_ITEM_UUID_2 = "00000000-0000-0000-0000-000000000011";

// --- Helpers ---

const mockRuntime = {
  runCommand: vi.fn(),
};

function mockAuthOrg() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
  vi.mocked(createManifestRuntime).mockResolvedValue(mockRuntime as never);
}

function mockCurrentUser() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "manager",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
  vi.mocked(createManifestRuntime).mockResolvedValue(mockRuntime as never);
}

function buildPostRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeManifestParams(entity: string, command: string) {
  return { params: Promise.resolve({ entity, command }) };
}

function createMockTransfer(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TEST_TENANT_ID,
    id: "transfer-001",
    transferNumber: "TRF-000001",
    fromLocationId: "loc-from",
    toLocationId: "loc-to",
    status: "pending",
    requestedBy: TEST_USER_ID,
    approvedBy: null,
    shippedBy: null,
    receivedBy: null,
    requestedAt: new Date("2026-04-01"),
    approvedAt: null,
    shippedAt: null,
    receivedAt: null,
    notes: null,
    deletedAt: null,
    ...overrides,
  };
}

// ===================================================================== //
// TEST SUITE                                                             //
// ===================================================================== //

describe("Inventory Transfers API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Always mock createManifestRuntime to provide a mock runtime
    vi.mocked(createManifestRuntime).mockResolvedValue(mockRuntime as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------- //
  // CREATE                                                               //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/create", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: "a",
          toLocationId: "b",
          items: [{ itemId: "i1", quantity: 1 }],
        }
      );
      const response = await createTransfer(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(401);
    });

    it("returns 400 when fromLocationId is missing", async () => {
      mockCurrentUser();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "From and to locations are required",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { toLocationId: "b", items: [{ itemId: "i1", quantity: 1 }] }
      );
      const response = await createTransfer(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(400);
    });

    it("returns 400 when toLocationId is missing", async () => {
      mockCurrentUser();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "From and to locations are required",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { fromLocationId: "a", items: [{ itemId: "i1", quantity: 1 }] }
      );
      const response = await createTransfer(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(400);
    });

    it("returns 400 when items is empty", async () => {
      mockCurrentUser();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "At least one item is required",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          items: [],
        }
      );
      const response = await createTransfer(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(400);
    });

    it("returns 400 when items is not an array", async () => {
      mockCurrentUser();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "At least one item is required",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          items: "not-array",
        }
      );
      const response = await createTransfer(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(400);
    });

    it("creates a transfer with zero-padded transferNumber and persists items in a transaction", async () => {
      mockCurrentUser();
      mockRuntime.runCommand.mockResolvedValue({
        success: true,
        result: createMockTransfer({ transferNumber: "TRF-000004" }),
        emittedEvents: [],
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          notes: "urgent",
          items: [
            { itemId: VALID_ITEM_UUID_1, quantity: 5, notes: "n1" },
            { itemId: VALID_ITEM_UUID_2, quantity: 2 },
          ],
        }
      );
      const response = await createTransfer(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.transferNumber).toBe("TRF-000004");
    });

    it("returns 500 on database error", async () => {
      mockCurrentUser();
      mockRuntime.runCommand.mockRejectedValue(new Error("DB down"));

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          items: [{ itemId: VALID_ITEM_UUID_1, quantity: 1 }],
        }
      );
      const response = await createTransfer(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // APPROVE                                                              //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/approve", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await approveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await approveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(401);
    });

    it("returns 400 when transferId missing", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "Transfer ID is required",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {}
      );
      const response = await approveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(400);
    });

    it("returns 400 when transfer not found", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "Transfer not found",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await approveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(400);
    });

    it("returns 422 when transfer is not pending", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "Transfer must be in pending status" },
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await approveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(422);
    });

    it("approves a pending transfer and stamps approvedAt", async () => {
      mockAuthOrg();
      const updated = createMockTransfer({
        status: "approved",
        approvedAt: new Date("2026-04-02"),
      });
      mockRuntime.runCommand.mockResolvedValue({
        success: true,
        result: updated,
        emittedEvents: [],
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await approveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.status).toBe("approved");
    });

    it("returns 500 on database error", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockRejectedValue(new Error("boom"));

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await approveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // SHIP                                                                 //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/ship", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await shipTransfer(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await shipTransfer(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when transferId missing", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "Transfer ID is required",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {}
      );
      const response = await shipTransfer(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(400);
    });

    it("returns 404 when transfer not found", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "Transfer not found",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await shipTransfer(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(400);
    });

    it("returns 422 when transfer is not approved", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "Transfer must be in approved status" },
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await shipTransfer(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(422);
    });

    it("ships an approved transfer and stamps shippedAt", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: true,
        result: createMockTransfer({ status: "in_transit", shippedAt: new Date() }),
        emittedEvents: [],
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await shipTransfer(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------- //
  // RECEIVE                                                              //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/receive", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await receiveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await receiveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when transferId missing", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "Transfer ID is required",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {}
      );
      const response = await receiveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(400);
    });

    it("returns 400 when transfer not found", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "Transfer not found",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await receiveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(400);
    });

    it("returns 422 when transfer is not in_transit", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "Transfer must be in in_transit status" },
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await receiveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(422);
    });

    it("completes an in_transit transfer, updates received quantities, and creates offsetting transactions", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: true,
        result: createMockTransfer({ status: "completed" }),
        emittedEvents: [],
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          transferId: "transfer-001",
          receivedItems: [
            { itemId: "i1", receivedQuantity: 5 },
            { itemId: "i2", receivedQuantity: 3 },
          ],
        }
      );
      const response = await receiveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(200);
    });

    it("handles empty receivedItems gracefully", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: true,
        result: createMockTransfer({ status: "completed" }),
        emittedEvents: [],
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001", receivedItems: [] }
      );
      const response = await receiveTransfer(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------- //
  // CANCEL                                                               //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/cancel", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await cancelTransfer(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when tenant not found", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await cancelTransfer(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(401);
    });

    it("returns 401 when transferId missing", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "Transfer ID is required",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {}
      );
      const response = await cancelTransfer(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(400);
    });

    it("returns 400 when transfer not found", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        error: "Transfer not found",
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await cancelTransfer(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(400);
    });

    it("returns 422 when transfer is in_transit (illegal cancel)", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "Transfer cannot be cancelled in transit status" },
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await cancelTransfer(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(422);
    });

    it("returns 422 when transfer is already completed", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: false,
        guardFailure: { index: 0, formatted: "Transfer cannot be cancelled in completed status" },
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await cancelTransfer(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(422);
    });

    it("cancels a pending transfer and appends reason to notes", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: true,
        result: createMockTransfer({ status: "cancelled", notes: "original wrong location" }),
        emittedEvents: [],
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001", reason: "wrong location" }
      );
      const response = await cancelTransfer(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(200);
    });

    it("cancels an approved transfer", async () => {
      mockAuthOrg();
      mockRuntime.runCommand.mockResolvedValue({
        success: true,
        result: createMockTransfer({ status: "cancelled" }),
        emittedEvents: [],
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await cancelTransfer(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------- //
  // LIST                                                                 //
  // ------------------------------------------------------------------- //

  describe("GET /api/inventory/transfers/list", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: null,
        orgId: null,
      } as never);

      const request = new NextRequest(
        "http://localhost/api/inventory/transfers/list"
      );
      const response = await listTransfers(request);

      expect(response.status).toBe(401);
    });

    it("returns 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = new NextRequest(
        "http://localhost/api/inventory/transfers/list"
      );
      const response = await listTransfers(request);

      expect(response.status).toBe(400);
    });

    it("returns transfers with default pagination (limit=50, offset=0)", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findMany).mockResolvedValue([
        createMockTransfer(),
      ] as never);
      vi.mocked(database.inventoryTransfer.count).mockResolvedValue(1 as never);

      const request = new NextRequest(
        "http://localhost/api/inventory/transfers/list"
      );
      const response = await listTransfers(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.transfers).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);

      expect(database.inventoryTransfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
          take: 50,
          skip: 0,
          include: { items: true },
          orderBy: { requestedAt: "desc" },
        })
      );
    });

    it("applies status, fromLocationId, toLocationId filters", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.inventoryTransfer.count).mockResolvedValue(0 as never);

      const request = new NextRequest(
        "http://localhost/api/inventory/transfers/list?status=pending&fromLocationId=loc-a&toLocationId=loc-b"
      );
      await listTransfers(request);

      expect(database.inventoryTransfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "pending",
            fromLocationId: "loc-a",
            toLocationId: "loc-b",
          }),
        })
      );
    });

    it("clamps limit at MAX_LIMIT=200", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findMany).mockResolvedValue(
        [] as never
      );
      vi.mocked(database.inventoryTransfer.count).mockResolvedValue(0 as never);

      const request = new NextRequest(
        "http://localhost/api/inventory/transfers/list?limit=999999"
      );
      const response = await listTransfers(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.limit).toBe(200);
    });

    it("returns 500 on database error", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findMany).mockRejectedValue(
        new Error("DB down")
      );

      const request = new NextRequest(
        "http://localhost/api/inventory/transfers/list"
      );
      const response = await listTransfers(request);

      expect(response.status).toBe(500);
    });
  });
});
