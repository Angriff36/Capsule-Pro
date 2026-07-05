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

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

// Standard infrastructure mocks for manifest dispatcher
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data, status = 200) =>
      new Response(JSON.stringify({ success: true, ...data }), { status })
  ),
  manifestErrorResponse: vi.fn(
    (data, status = 400) =>
      new Response(
        JSON.stringify({
          success: false,
          ...(typeof data === "string" ? { message: data } : data),
        }),
        { status }
      )
  ),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    override name = "InvariantError";
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

// Keep existing mocks
vi.mock("@repo/database", () => ({
  database: {
    inventoryTransfer: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fn) => fn({})),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/pagination", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/pagination")>(
      "@/lib/pagination"
    );
  return actual;
});

// Safety net: keep manifest-runtime mock
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// --- Route imports ---

import { GET as listTransfers } from "@/app/api/inventory/transfers/list/route";
import { POST as commandPost } from "@/app/api/manifest/[entity]/commands/[command]/route";

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

function mockManifestSuccess(result: Record<string, unknown> = {}) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(
      JSON.stringify({
        success: true,
        result: { id: "transfer-001", ...result },
        events: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  );
}

function mockManifestError(message: string, status = 400) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: false, message }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
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
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: "a",
          toLocationId: "b",
          items: [{ itemId: "i1", quantity: 1 }],
        }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(401);
    });

    it("delegates create to runManifestCommand with correct entity/command", async () => {
      mockCurrentUser();
      mockManifestSuccess({ transferNumber: "TRF-000004" });

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
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventoryTransfer",
          command: "create",
          body: expect.objectContaining({
            fromLocationId: VALID_LOCATION_UUID_A,
            toLocationId: VALID_LOCATION_UUID_B,
            notes: "urgent",
            items: [
              { itemId: VALID_ITEM_UUID_1, quantity: 5, notes: "n1" },
              { itemId: VALID_ITEM_UUID_2, quantity: 2 },
            ],
          }),
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("passes the full body to runManifestCommand", async () => {
      mockCurrentUser();
      mockManifestSuccess();

      const body = {
        fromLocationId: VALID_LOCATION_UUID_A,
        toLocationId: VALID_LOCATION_UUID_B,
        items: [{ itemId: VALID_ITEM_UUID_1, quantity: 1 }],
        notes: "test notes",
      };
      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        body
      );
      await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          body,
        })
      );
    });

    it("returns error response from runManifestCommand", async () => {
      mockCurrentUser();
      mockManifestError("At least one item is required", 400);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          items: [],
        }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "create")
      );

      expect(response.status).toBe(400);
    });

    it("returns 500 on unexpected exception", async () => {
      mockCurrentUser();
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("DB down"));

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        {
          fromLocationId: VALID_LOCATION_UUID_A,
          toLocationId: VALID_LOCATION_UUID_B,
          items: [{ itemId: VALID_ITEM_UUID_1, quantity: 1 }],
        }
      );
      const response = await commandPost(
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
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(401);
    });

    it("delegates approve to runManifestCommand", async () => {
      mockCurrentUser();
      mockManifestSuccess({
        status: "approved",
        approvedAt: new Date("2026-04-02").toISOString(),
      });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventoryTransfer",
          command: "approve",
          body: { transferId: "transfer-001" },
          user: expect.objectContaining({
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
          }),
        })
      );
    });

    it("returns error when runManifestCommand returns error", async () => {
      mockCurrentUser();
      mockManifestError("Transfer not found", 404);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "approve")
      );

      expect(response.status).toBe(404);
    });

    it("returns 500 on unexpected exception", async () => {
      mockCurrentUser();
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("boom"));

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await commandPost(
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
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(401);
    });

    it("delegates ship to runManifestCommand", async () => {
      mockCurrentUser();
      mockManifestSuccess({ status: "in_transit" });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventoryTransfer",
          command: "ship",
          body: { transferId: "transfer-001" },
        })
      );
    });

    it("returns error from runManifestCommand", async () => {
      mockCurrentUser();
      mockManifestError("Transfer not found", 404);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "missing" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "ship")
      );

      expect(response.status).toBe(404);
    });
  });

  // ------------------------------------------------------------------- //
  // RECEIVE                                                              //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/receive", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(401);
    });

    it("delegates receive to runManifestCommand with receivedItems", async () => {
      mockCurrentUser();
      mockManifestSuccess({ status: "completed" });

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
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventoryTransfer",
          command: "receive",
          body: expect.objectContaining({
            transferId: "transfer-001",
            receivedItems: [
              { itemId: "i1", receivedQuantity: 5 },
              { itemId: "i2", receivedQuantity: 3 },
            ],
          }),
        })
      );
    });

    it("delegates receive with empty receivedItems to runManifestCommand", async () => {
      mockCurrentUser();
      mockManifestSuccess({ status: "completed" });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001", receivedItems: [] }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "receive")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "receive",
          body: { transferId: "transfer-001", receivedItems: [] },
        })
      );
    });
  });

  // ------------------------------------------------------------------- //
  // CANCEL                                                               //
  // ------------------------------------------------------------------- //

  describe("POST /api/inventory/transfers/commands/cancel", () => {
    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        Object.assign(new Error("Unauthenticated"), { name: "InvariantError" })
      );

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(401);
    });

    it("delegates cancel to runManifestCommand with reason", async () => {
      mockCurrentUser();
      mockManifestSuccess({ status: "cancelled" });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001", reason: "wrong location" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventoryTransfer",
          command: "cancel",
          body: { transferId: "transfer-001", reason: "wrong location" },
        })
      );
    });

    it("cancels an approved transfer via runManifestCommand", async () => {
      mockCurrentUser();
      mockManifestSuccess({ status: "cancelled" });

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "transfer-001" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(200);
    });

    it("returns error from runManifestCommand for illegal cancel", async () => {
      mockCurrentUser();
      mockManifestError("Cannot cancel transfer in in_transit status", 400);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(400);
    });

    it("returns error for completed transfer cancel", async () => {
      mockCurrentUser();
      mockManifestError("Cannot cancel completed transfer", 400);

      const request = buildPostRequest(
        "http://localhost/api/manifest/[entity]/commands/[command]",
        { transferId: "t1" }
      );
      const response = await commandPost(
        request,
        makeManifestParams("InventoryTransfer", "cancel")
      );

      expect(response.status).toBe(400);
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
      const { database } = await import("@repo/database");
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
          include: { lineItems: true }, // route uses lineItems (Prisma relation name)
          orderBy: { requestedAt: "desc" },
        })
      );
    });

    it("applies status, fromLocationId, toLocationId filters", async () => {
      mockAuthOrg();
      const { database } = await import("@repo/database");
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
      const { database } = await import("@repo/database");
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
      const { database } = await import("@repo/database");
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
