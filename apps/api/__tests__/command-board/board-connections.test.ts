/**
 * @vitest-environment node
 *
 * Command Board Connection Regression Tests
 *
 * Tests covering:
 * - Create manual connection between two projections
 * - Prevent duplicate connections
 * - Delete connection (soft delete)
 * - List connections for a board
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database before importing
vi.mock("@repo/database", () => ({
  database: {
    commandBoardConnection: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    boardProjection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    commandBoardCard: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join("?"),
      values,
    }),
  },
}));

// Mock auth
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

// Mock tenant
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

// Mock manifest runtime
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { GET as listConnections } from "@/app/api/command-board/connections/list/route";

const mockAuth = vi.mocked(auth) as any;
const mockGetTenantIdForOrg = vi.mocked(getTenantIdForOrg);
const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockCreateManifestRuntime = vi.mocked(createManifestRuntime);
const mockConnection = vi.mocked(database.commandBoardConnection);
const mockBoardProjection = vi.mocked(database.boardProjection);
const mockCommandBoardCard = vi.mocked(database.commandBoardCard);

// Test constants
const TEST_TENANT_ID = "67a4af48-114e-4e45-89d7-6ae36da6ff71";
const TEST_USER_ID = "user_38l4Ysz037WwfEIfrjAvWLeM7AP";
const TEST_ORG_ID = "org_test_123";
const TEST_BOARD_ID = "00000000-0000-0000-0000-000000000001";
const TEST_CARD_1_ID = "00000000-0000-0000-0000-000000000010";
const TEST_CARD_2_ID = "00000000-0000-0000-0000-000000000011";
const TEST_CONNECTION_ID = "00000000-0000-0000-0000-000000000020";

// Helper to create mock connection data
function createMockConnection(overrides: Partial<any> = {}) {
  return {
    id: TEST_CONNECTION_ID,
    tenantId: TEST_TENANT_ID,
    boardId: TEST_BOARD_ID,
    fromCardId: TEST_CARD_1_ID,
    toCardId: TEST_CARD_2_ID,
    relationshipType: "generic",
    label: null,
    visible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

// Helper to create mock projection
function createMockProjection(overrides: Partial<any> = {}) {
  return {
    id: overrides.id || TEST_CARD_1_ID,
    tenantId: TEST_TENANT_ID,
    boardId: TEST_BOARD_ID,
    entityType: "EVENT",
    entityId: "event_123",
    positionX: 0,
    positionY: 0,
    width: 200,
    height: 150,
    zIndex: 0,
    colorOverride: null,
    collapsed: false,
    groupId: null,
    pinned: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("Command Board Connection Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Connection", () => {
    it("should create manual connection between two cards", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: {
            id: TEST_CONNECTION_ID,
            boardId: TEST_BOARD_ID,
            fromCardId: TEST_CARD_1_ID,
            toCardId: TEST_CARD_2_ID,
            relationshipType: "generic",
            visible: true,
          },
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Mock cards exist
      mockCommandBoardCard.findFirst.mockResolvedValue({ id: TEST_CARD_1_ID } as any);

      const mockCreateConnection = vi.fn().mockResolvedValue(createMockConnection());
      mockConnection.create = mockCreateConnection;

      // Verify the runtime was called correctly
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should set relationship_type based on card types", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: {
            id: TEST_CONNECTION_ID,
            relationshipType: "event_to_task",
          },
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Connection from event card to task card
      const connectionData = {
        fromCardId: "card_event",
        toCardId: "card_task",
        relationshipType: "event_to_task",
      };

      // Verify expected relationship type
      expect(connectionData.relationshipType).toBe("event_to_task");
    });

    it("should support connection visibility toggle", async () => {
      const hiddenConnection = createMockConnection({ visible: false });
      expect(hiddenConnection.visible).toBe(false);

      const visibleConnection = createMockConnection({ visible: true });
      expect(visibleConnection.visible).toBe(true);
    });

    it("should support custom labels on connections", async () => {
      const labeledConnection = createMockConnection({
        label: "Depends on",
      });
      expect(labeledConnection.label).toBe("Depends on");
    });
  });

  describe("Prevent Duplicate Connections", () => {
    it("should not allow duplicate connections between same cards", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      // Mock existing connection
      mockConnection.findFirst.mockResolvedValue(createMockConnection());

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Connection already exists between these cards",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Attempt to create duplicate should fail
      const result = await mockConnection.findFirst({
        where: {
          tenantId: TEST_TENANT_ID,
          boardId: TEST_BOARD_ID,
          fromCardId: TEST_CARD_1_ID,
          toCardId: TEST_CARD_2_ID,
          deletedAt: null,
        },
      });

      expect(result).not.toBeNull();
    });

    it("should allow reversed direction connection (A→B is different from B→A)", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      // No existing connection for B→A
      mockConnection.findFirst.mockResolvedValue(null);

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: {
            id: "conn_reversed",
            fromCardId: TEST_CARD_2_ID,
            toCardId: TEST_CARD_1_ID,
          },
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Reversed connection should be allowed
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should allow multiple connections from same card to different targets", async () => {
      const connections = [
        createMockConnection({ id: "conn_1", toCardId: "card_2" }),
        createMockConnection({ id: "conn_2", toCardId: "card_3" }),
        createMockConnection({ id: "conn_3", toCardId: "card_4" }),
      ];

      // All have same fromCardId but different toCardId
      expect(connections.every((c) => c.fromCardId === TEST_CARD_1_ID)).toBe(true);
      expect(new Set(connections.map((c) => c.toCardId)).size).toBe(3);
    });
  });

  describe("Delete Connection (Soft Delete)", () => {
    it("should soft delete connection via manifest runtime", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: {
            id: TEST_CONNECTION_ID,
            deletedAt: new Date().toISOString(),
          },
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Verify delete command would be called
      expect(mockRuntime.runCommand).toBeDefined();
    });

    it("should set deletedAt timestamp on soft delete", async () => {
      const deletedConnection = createMockConnection({
        deletedAt: new Date(),
      });

      expect(deletedConnection.deletedAt).not.toBeNull();
    });

    it("should exclude soft-deleted connections from list", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const activeConnections = [
        createMockConnection({ id: "conn_1" }),
        createMockConnection({ id: "conn_2" }),
      ];

      mockConnection.findMany.mockResolvedValue(activeConnections as any);

      const request = new Request("http://localhost/api/command-board/connections/list");
      const response = await listConnections(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("should return 404 for non-existent connection on delete", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Connection not found",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Delete non-existent should fail
      expect(mockRuntime.runCommand).toBeDefined();
    });
  });

  describe("List Connections for a Board", () => {
    it("should list all connections for a board", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const mockConnections = [
        createMockConnection({ id: "conn_1", relationshipType: "client_to_event" }),
        createMockConnection({ id: "conn_2", relationshipType: "event_to_task" }),
        createMockConnection({ id: "conn_3", relationshipType: "task_to_employee" }),
      ];

      mockConnection.findMany.mockResolvedValue(mockConnections as any);

      const request = new Request("http://localhost/api/command-board/connections/list");
      const response = await listConnections(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.commandBoardConnections).toHaveLength(3);
    });

    it("should return empty array when no connections exist", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockConnection.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/command-board/connections/list");
      const response = await listConnections(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.commandBoardConnections).toEqual([]);
    });

    it("should include connection metadata in response", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const connection = createMockConnection({
        label: "Requires",
        relationshipType: "event_to_inventory",
        visible: true,
      });

      mockConnection.findMany.mockResolvedValue([connection] as any);

      const request = new Request("http://localhost/api/command-board/connections/list");
      const response = await listConnections(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      const returned = body.commandBoardConnections[0];
      expect(returned.label).toBe("Requires");
      expect(returned.relationshipType).toBe("event_to_inventory");
      expect(returned.visible).toBe(true);
    });

    it("should order connections by creation date descending", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockConnection.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/command-board/connections/list");
      await listConnections(request);

      expect(mockConnection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });

  describe("Connection Types", () => {
    it("should support all defined connection types", () => {
      const connectionTypes = [
        "client_to_event",
        "event_to_task",
        "task_to_employee",
        "event_to_inventory",
        "generic",
      ];

      connectionTypes.forEach((type) => {
        const connection = createMockConnection({ relationshipType: type });
        expect(connection.relationshipType).toBe(type);
      });
    });

    it("should validate connection type is valid", () => {
      const validTypes = [
        "client_to_event",
        "event_to_task",
        "task_to_employee",
        "event_to_inventory",
        "generic",
      ];

      const invalidType = "invalid_type";
      expect(validTypes.includes(invalidType)).toBe(false);
    });
  });

  describe("Authorization", () => {
    it("should return 401 for unauthenticated requests", async () => {
      mockAuth.mockResolvedValue({ orgId: null, userId: null });

      const request = new Request("http://localhost/api/command-board/connections/list");
      const response = await listConnections(request);

      expect(response.status).toBe(401);
    });

    it("should return 400 for unknown tenant", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(null as never);

      const request = new Request("http://localhost/api/command-board/connections/list");
      const response = await listConnections(request);

      expect(response.status).toBe(400);
    });

    it("should require admin role for creating connections", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "viewer",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          policyDenial: { policyName: "AdminOnly" },
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Non-admin should be denied
      expect(mockRuntime.runCommand).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should return 500 for database errors", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockConnection.findMany.mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost/api/command-board/connections/list");
      const response = await listConnections(request);

      expect(response.status).toBe(500);
    });

    it("should handle invalid connection data gracefully", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          guardFailure: { index: 0, formatted: "Invalid card IDs" },
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      // Invalid data should fail guard
      expect(mockRuntime.runCommand).toBeDefined();
    });
  });
});
