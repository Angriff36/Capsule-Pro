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

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);

// --- Route imports ---

import { POST as approveTransfer } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { POST as cancelTransfer } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { POST as createTransfer } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { POST as receiveTransfer } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { POST as shipTransfer } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { GET as listTransfers } from "@/app/api/inventory/transfers/list/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000020";
const TEST_USER_ID = "user_transfers_test";
const TEST_ORG_ID = "org_transfers_test";
const VALID_LOCATION_UUID_A = "00000000-0000-0000-0000-000000000001";
const VALID_LOCATION_UUID_B = "00000000-0000-0000-0000-000000000002";
const VALID_ITEM_UUID_1 = "00000000-0000-0000-0000-000000000010";
const VALID_ITEM_UUID_2 = "00000000-0000-0000-0000-000000000011";

// --- Helpers ---

function mockAuthOrg() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
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
}

function buildPostRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------- //
  // CREATE                                                               //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/create", () => {
    it("returns 401 when requireCurrentUser returns null", async () => {
      vi.mocked(requireCurrentUser).mockResolvedValue(null as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: "a",
          toLocationId: "b",
          items: [{ itemId: "i1", quantity: 1 }],
        }
      );
      const response = await createTransfer(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 400 when fromLocationId is missing", async () => {
      mockCurrentUser();

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { toLocationId: "b", items: [{ itemId: "i1", quantity: 1 }] }
      );
      const response = await createTransfer(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("From and to locations are required");
    });

    it("returns 400 when toLocationId is missing", async () => {
      mockCurrentUser();

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { fromLocationId: "a", items: [{ itemId: "i1", quantity: 1 }] }
      );
      const response = await createTransfer(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("From and to locations are required");
    });

    it("returns 400 when items is empty", async () => {
      mockCurrentUser();

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          items: [],
        }
      );
      const response = await createTransfer(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("At least one item is required");
    });

    it("returns 400 when items is not an array", async () => {
      mockCurrentUser();

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          items: "not-array",
        }
      );
      const response = await createTransfer(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("At least one item is required");
    });

    it("creates a transfer with zero-padded transferNumber and persists items in a transaction", async () => {
      mockCurrentUser();

      const transferCreateMock = vi
        .fn()
        .mockResolvedValue(
          createMockTransfer({ transferNumber: "TRF-000004" })
        );
      const itemCreateMock = vi.fn().mockResolvedValue({});
      vi.mocked(database.inventoryTransfer.count).mockResolvedValue(3 as never);
      vi.mocked(database.$transaction).mockImplementation(
        async (fn: unknown) => {
          const tx = {
            inventoryTransfer: { create: transferCreateMock },
            inventoryTransferItem: { create: itemCreateMock },
          };
          return await (fn as (t: unknown) => unknown)(tx);
        }
      );

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
      const response = await createTransfer(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.transfer.transferNumber).toBe("TRF-000004");

      expect(transferCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          transferNumber: "TRF-000004",
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          notes: "urgent",
          status: "pending",
          requestedBy: TEST_USER_ID,
        }),
      });
      expect(itemCreateMock).toHaveBeenCalledTimes(2);
      expect(itemCreateMock).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          itemId: VALID_ITEM_UUID_1,
          quantity: 5,
          notes: "n1",
        }),
      });
    });

    it("returns 500 on database error", async () => {
      mockCurrentUser();
      vi.mocked(database.inventoryTransfer.count).mockRejectedValue(
        new Error("DB down")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          items: [{ itemId: VALID_ITEM_UUID_1, quantity: 1 }],
        }
      );
      const response = await createTransfer(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to create inventory transfer");
    });
  });

  // ------------------------------------------------------------------- //
  // APPROVE                                                              //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/approve", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await approveTransfer(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await approveTransfer(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Tenant not found");
    });

    it("returns 400 when transferId missing", async () => {
      mockAuthOrg();

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {}
      );
      const response = await approveTransfer(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Transfer ID is required");
    });

    it("returns 404 when transfer not found", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        null as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await approveTransfer(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Transfer not found");
    });

    it("returns 400 when transfer is not pending", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "approved" }) as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await approveTransfer(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/only pending/i);
    });

    it("approves a pending transfer and stamps approvedAt", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "pending" }) as never
      );
      const updated = createMockTransfer({
        status: "approved",
        approvedAt: new Date("2026-04-02"),
      });
      vi.mocked(database.inventoryTransfer.update).mockResolvedValue(
        updated as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await approveTransfer(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.transfer.status).toBe("approved");

      expect(database.inventoryTransfer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_id: { tenantId: TEST_TENANT_ID, id: "transfer-001" },
          },
          data: expect.objectContaining({
            status: "approved",
            approvedAt: expect.any(Date),
          }),
        })
      );
    });

    it("returns 500 on database error", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockRejectedValue(
        new Error("boom")
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await approveTransfer(request);

      expect(response.status).toBe(500);
    });
  });

  // ------------------------------------------------------------------- //
  // SHIP                                                                 //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/ship", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await shipTransfer(request);

      expect(response.status).toBe(401);
    });

    it("returns 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await shipTransfer(request);

      expect(response.status).toBe(400);
    });

    it("returns 400 when transferId missing", async () => {
      mockAuthOrg();

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {}
      );
      const response = await shipTransfer(request);

      expect(response.status).toBe(400);
    });

    it("returns 404 when transfer not found", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        null as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await shipTransfer(request);

      expect(response.status).toBe(404);
    });

    it("returns 400 when transfer is not approved", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "pending" }) as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await shipTransfer(request);

      expect(response.status).toBe(400);
    });

    it("ships an approved transfer and stamps shippedAt", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "approved" }) as never
      );
      vi.mocked(database.inventoryTransfer.update).mockResolvedValue(
        createMockTransfer({
          status: "in_transit",
          shippedAt: new Date(),
        }) as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await shipTransfer(request);

      expect(response.status).toBe(200);
      expect(database.inventoryTransfer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId_id: { tenantId: TEST_TENANT_ID, id: "transfer-001" },
          },
          data: expect.objectContaining({
            status: "in_transit",
            shippedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  // ------------------------------------------------------------------- //
  // RECEIVE                                                              //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/receive", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await receiveTransfer(request);

      expect(response.status).toBe(401);
    });

    it("returns 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await receiveTransfer(request);

      expect(response.status).toBe(400);
    });

    it("returns 400 when transferId missing", async () => {
      mockAuthOrg();

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {}
      );
      const response = await receiveTransfer(request);

      expect(response.status).toBe(400);
    });

    it("returns 404 when transfer not found", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        null as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await receiveTransfer(request);

      expect(response.status).toBe(404);
    });

    it("returns 400 when transfer is not in_transit", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "approved" }) as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await receiveTransfer(request);

      expect(response.status).toBe(400);
    });

    it("completes an in_transit transfer, updates received quantities, and creates offsetting transactions", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({
          id: "transfer-001",
          fromLocationId: "loc-from",
          toLocationId: "loc-to",
          status: "in_transit",
        }) as never
      );

      const transferUpdateMock = vi
        .fn()
        .mockResolvedValue(createMockTransfer({ status: "completed" }));
      const itemUpdateManyMock = vi.fn().mockResolvedValue({ count: 1 });
      const txCreateMock = vi.fn().mockResolvedValue({});

      vi.mocked(database.$transaction).mockImplementation(
        async (fn: unknown) => {
          const tx = {
            inventoryTransfer: { update: transferUpdateMock },
            inventoryTransferItem: { updateMany: itemUpdateManyMock },
            inventoryTransaction: { create: txCreateMock },
          };
          return await (fn as (t: unknown) => unknown)(tx);
        }
      );

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
      const response = await receiveTransfer(request);

      expect(response.status).toBe(200);

      // Two items × two transactions (in + out) = 4 transaction creates
      expect(txCreateMock).toHaveBeenCalledTimes(4);

      // Verify transfer_in (positive) at toLocationId
      const positiveCalls = txCreateMock.mock.calls.filter(
        (call) =>
          (call[0] as { data: { transactionType: string } }).data
            .transactionType === "transfer_in"
      );
      expect(positiveCalls.length).toBe(2);
      const firstPositive = positiveCalls[0][0] as {
        data: { storage_location_id: string; quantity: number };
      };
      expect(firstPositive.data.storage_location_id).toBe("loc-to");
      expect(firstPositive.data.quantity).toBeGreaterThan(0);

      // Verify transfer_out (negative) at fromLocationId
      const negativeCalls = txCreateMock.mock.calls.filter(
        (call) =>
          (call[0] as { data: { transactionType: string } }).data
            .transactionType === "transfer_out"
      );
      expect(negativeCalls.length).toBe(2);
      const firstNegative = negativeCalls[0][0] as {
        data: { storage_location_id: string; quantity: number };
      };
      expect(firstNegative.data.storage_location_id).toBe("loc-from");
      expect(firstNegative.data.quantity).toBeLessThan(0);

      // Item received quantities updated (one updateMany per receivedItem)
      expect(itemUpdateManyMock).toHaveBeenCalledTimes(2);
      // Transfer marked completed with receivedAt timestamp
      expect(transferUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "completed",
            receivedAt: expect.any(Date),
          }),
        })
      );
    });

    it("handles empty receivedItems gracefully", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "in_transit" }) as never
      );

      const transferUpdateMock = vi
        .fn()
        .mockResolvedValue(createMockTransfer({ status: "completed" }));
      const txCreateMock = vi.fn().mockResolvedValue({});
      vi.mocked(database.$transaction).mockImplementation(
        async (fn: unknown) => {
          const tx = {
            inventoryTransfer: { update: transferUpdateMock },
            inventoryTransferItem: { updateMany: vi.fn() },
            inventoryTransaction: { create: txCreateMock },
          };
          return await (fn as (t: unknown) => unknown)(tx);
        }
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001", receivedItems: [] }
      );
      const response = await receiveTransfer(request);

      expect(response.status).toBe(200);
      // No item or transaction work when nothing is received
      expect(txCreateMock).toHaveBeenCalledTimes(0);
      expect(transferUpdateMock).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------- //
  // CANCEL                                                               //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/cancel", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await cancelTransfer(request);

      expect(response.status).toBe(401);
    });

    it("returns 400 when tenant not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        userId: TEST_USER_ID,
        orgId: TEST_ORG_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await cancelTransfer(request);

      expect(response.status).toBe(400);
    });

    it("returns 400 when transferId missing", async () => {
      mockAuthOrg();

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {}
      );
      const response = await cancelTransfer(request);

      expect(response.status).toBe(400);
    });

    it("returns 404 when transfer not found", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        null as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await cancelTransfer(request);

      expect(response.status).toBe(404);
    });

    it("returns 400 when transfer is in_transit (illegal cancel)", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "in_transit" }) as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await cancelTransfer(request);

      expect(response.status).toBe(400);
    });

    it("returns 400 when transfer is already completed", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "completed" }) as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await cancelTransfer(request);

      expect(response.status).toBe(400);
    });

    it("cancels a pending transfer and appends reason to notes", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "pending", notes: "original" }) as never
      );
      vi.mocked(database.inventoryTransfer.update).mockResolvedValue(
        createMockTransfer({ status: "cancelled" }) as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001", reason: "wrong location" }
      );
      const response = await cancelTransfer(request);

      expect(response.status).toBe(200);
      const updateCall = vi.mocked(database.inventoryTransfer.update).mock
        .calls[0][0];
      expect((updateCall as { data: { status: string } }).data.status).toBe(
        "cancelled"
      );
      expect((updateCall as { data: { notes: string } }).data.notes).toContain(
        "wrong location"
      );
    });

    it("cancels an approved transfer", async () => {
      mockAuthOrg();
      vi.mocked(database.inventoryTransfer.findFirst).mockResolvedValue(
        createMockTransfer({ status: "approved" }) as never
      );
      vi.mocked(database.inventoryTransfer.update).mockResolvedValue(
        createMockTransfer({ status: "cancelled" }) as never
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await cancelTransfer(request);

      expect(response.status).toBe(200);
    });
  });

  // ------------------------------------------------------------------- //
  // LIST                                                                 //
  // ------------------------------------------------------------------- //

  describe("GET /api/inventory/transfers/list", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);

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
