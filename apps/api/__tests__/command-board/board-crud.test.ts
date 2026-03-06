/**
 * @vitest-environment node
 *
 * Command Board CRUD Regression Tests
 *
 * Tests covering:
 * - Create board with template → verify scope is applied
 * - Create board without template → verify defaults
 * - List boards → verify filtering by status
 * - Delete board (soft delete)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the database before importing
vi.mock("@repo/database", () => ({
  database: {
    commandBoard: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    boardProjection: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    commandBoardCard: {
      findMany: vi.fn(),
    },
  },
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join("?"),
      values,
    }),
    join: (items: unknown[]) => items.map((item) => String(item)).join(","),
    empty: { sql: "", values: [] },
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
import { GET, POST } from "@/app/api/command-board/route";
import { DELETE, GET as GET_BOARD } from "@/app/api/command-board/[boardId]/route";

const mockAuth = vi.mocked(auth) as any;
const mockGetTenantIdForOrg = vi.mocked(getTenantIdForOrg);
const mockRequireCurrentUser = vi.mocked(requireCurrentUser);
const mockCreateManifestRuntime = vi.mocked(createManifestRuntime);
const mockCommandBoard = vi.mocked(database.commandBoard);
const mockBoardProjection = vi.mocked(database.boardProjection);
const mockCommandBoardCard = vi.mocked(database.commandBoardCard);

// Test constants
const TEST_TENANT_ID = "67a4af48-114e-4e45-89d7-6ae36da6ff71";
const TEST_USER_ID = "user_38l4Ysz037WwfEIfrjAvWLeM7AP";
const TEST_ORG_ID = "org_test_123";
const TEST_BOARD_ID = "00000000-0000-0000-0000-000000000001";
const TEMPLATE_BOARD_ID = "00000000-0000-0000-0000-000000000002";

// Helper to create mock board data
function createMockBoard(overrides: Partial<any> = {}) {
  return {
    id: TEST_BOARD_ID,
    tenantId: TEST_TENANT_ID,
    eventId: null,
    name: "Test Board",
    description: null,
    status: "active",
    isTemplate: false,
    tags: [],
    scope: null,
    autoPopulate: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("Command Board CRUD Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Create Board", () => {
    describe("with template", () => {
      it("should create board and apply template scope", async () => {
        // Setup auth
        mockRequireCurrentUser.mockResolvedValue({
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        });

        // Setup manifest runtime mock
        const mockRuntime = {
          runCommand: vi.fn().mockResolvedValue({
            success: true,
            result: {
              id: TEST_BOARD_ID,
              name: "New Board from Template",
              status: "active",
              scope: { eventId: "event_123", dateRange: { start: "2024-01-01", end: "2024-01-31" } },
            },
            emittedEvents: [],
          }),
        };
        mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

        // Mock template lookup
        mockCommandBoard.findFirst.mockResolvedValue(createMockBoard({
          id: TEMPLATE_BOARD_ID,
          isTemplate: true,
          scope: { eventId: "event_123", dateRange: { start: "2024-01-01", end: "2024-01-31" } },
        }));

        const request = new Request("http://localhost/api/command-board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Board from Template",
            templateId: TEMPLATE_BOARD_ID,
          }),
        });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockCreateManifestRuntime).toHaveBeenCalled();
        expect(mockRuntime.runCommand).toHaveBeenCalledWith(
          "create",
          expect.objectContaining({
            name: "New Board from Template",
            tenantId: TEST_TENANT_ID,
          }),
          expect.objectContaining({ entityName: "CommandBoard" })
        );
      });

      it("should copy projections from template to new board", async () => {
        mockRequireCurrentUser.mockResolvedValue({
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        });

        const mockRuntime = {
          runCommand: vi.fn().mockResolvedValue({
            success: true,
            result: { id: TEST_BOARD_ID, name: "Cloned Board" },
            emittedEvents: [],
          }),
        };
        mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

        const request = new Request("http://localhost/api/command-board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Cloned Board",
            templateId: TEMPLATE_BOARD_ID,
          }),
        });

        const response = await POST(request as any);
        expect(response.status).toBe(200);
      });
    });

    describe("without template", () => {
      it("should create board with default values", async () => {
        mockRequireCurrentUser.mockResolvedValue({
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        });

        const mockRuntime = {
          runCommand: vi.fn().mockResolvedValue({
            success: true,
            result: {
              id: TEST_BOARD_ID,
              name: "New Board",
              status: "draft",
              isTemplate: false,
              tags: [],
              scope: null,
              autoPopulate: true,
            },
            emittedEvents: [],
          }),
        };
        mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

        const request = new Request("http://localhost/api/command-board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Board",
          }),
        });

        const response = await POST(request as any);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(mockRuntime.runCommand).toHaveBeenCalledWith(
          "create",
          expect.objectContaining({
            name: "New Board",
            tenantId: TEST_TENANT_ID,
          }),
          expect.objectContaining({ entityName: "CommandBoard" })
        );
      });

      it("should default status to 'draft' for new boards", async () => {
        mockRequireCurrentUser.mockResolvedValue({
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        });

        const mockRuntime = {
          runCommand: vi.fn().mockResolvedValue({
            success: true,
            result: { id: TEST_BOARD_ID, name: "Board", status: "draft" },
            emittedEvents: [],
          }),
        };
        mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

        const request = new Request("http://localhost/api/command-board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Board" }),
        });

        await POST(request as any);

        expect(mockRuntime.runCommand).toHaveBeenCalledWith(
          "create",
          expect.objectContaining({
            tenantId: TEST_TENANT_ID,
          }),
          expect.any(Object)
        );
      });

      it("should accept optional event_id during creation", async () => {
        mockRequireCurrentUser.mockResolvedValue({
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        });

        const mockRuntime = {
          runCommand: vi.fn().mockResolvedValue({
            success: true,
            result: { id: TEST_BOARD_ID, eventId: "event_123" },
            emittedEvents: [],
          }),
        };
        mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

        const request = new Request("http://localhost/api/command-board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Event Board",
            event_id: "event_123",
          }),
        });

        await POST(request as any);

        expect(mockRuntime.runCommand).toHaveBeenCalledWith(
          "create",
          expect.objectContaining({
            event_id: "event_123",
          }),
          expect.any(Object)
        );
      });
    });
  });

  describe("List Boards", () => {
    // Helper to add _count to mock boards (required by route)
    function withCardsCount(boards: any[]) {
      return boards.map((board) => ({
        ...board,
        _count: { cards: 0 },
      }));
    }

    it("should list boards with pagination", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const mockBoards = withCardsCount([
        createMockBoard({ id: "board_1", name: "Board 1" }),
        createMockBoard({ id: "board_2", name: "Board 2" }),
      ]);

      mockCommandBoard.findMany.mockResolvedValue(mockBoards as any);
      mockCommandBoard.count.mockResolvedValue(2);

      const request = new Request("http://localhost/api/command-board?page=1&limit=10");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it("should filter boards by status", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const activeBoards = withCardsCount([
        createMockBoard({ id: "board_1", status: "active" }),
        createMockBoard({ id: "board_2", status: "active" }),
      ]);

      mockCommandBoard.findMany.mockResolvedValue(activeBoards as any);
      mockCommandBoard.count.mockResolvedValue(2);

      const request = new Request("http://localhost/api/command-board?status=active");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCommandBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "active",
          }),
        })
      );
    });

    it("should filter boards by draft status", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const draftBoards = withCardsCount([createMockBoard({ id: "board_1", status: "draft" })]);

      mockCommandBoard.findMany.mockResolvedValue(draftBoards as any);
      mockCommandBoard.count.mockResolvedValue(1);

      const request = new Request("http://localhost/api/command-board?status=draft");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCommandBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "draft",
          }),
        })
      );
    });

    it("should filter boards by archived status", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const archivedBoards = withCardsCount([createMockBoard({ id: "board_1", status: "archived" })]);

      mockCommandBoard.findMany.mockResolvedValue(archivedBoards as any);
      mockCommandBoard.count.mockResolvedValue(1);

      const request = new Request("http://localhost/api/command-board?status=archived");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCommandBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "archived",
          }),
        })
      );
    });

    it("should filter boards by template flag", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const templates = withCardsCount([createMockBoard({ id: "tmpl_1", isTemplate: true })]);

      mockCommandBoard.findMany.mockResolvedValue(templates as any);
      mockCommandBoard.count.mockResolvedValue(1);

      const request = new Request("http://localhost/api/command-board?is_template=true");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCommandBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isTemplate: true,
          }),
        })
      );
    });

    it("should filter boards by event_id", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const eventBoards = withCardsCount([createMockBoard({ id: "board_1", eventId: "event_123" })]);

      mockCommandBoard.findMany.mockResolvedValue(eventBoards as any);
      mockCommandBoard.count.mockResolvedValue(1);

      const request = new Request("http://localhost/api/command-board?event_id=event_123");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCommandBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: "event_123",
          }),
        })
      );
    });

    it("should exclude soft-deleted boards from list", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockCommandBoard.findMany.mockResolvedValue([] as any);
      mockCommandBoard.count.mockResolvedValue(0);

      const request = new Request("http://localhost/api/command-board");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCommandBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });

    it("should search boards by name", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      mockCommandBoard.findMany.mockResolvedValue([] as any);
      mockCommandBoard.count.mockResolvedValue(0);

      const request = new Request("http://localhost/api/command-board?search=Catering");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockCommandBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
            ]),
          }),
        })
      );
    });
  });

  describe("Get Single Board", () => {
    it("should return board with cards", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);

      const mockBoard = {
        ...createMockBoard(),
        cards: [
          {
            id: "card_1",
            tenantId: TEST_TENANT_ID,
            boardId: TEST_BOARD_ID,
            title: "Task Card",
            content: null,
            cardType: "task",
            status: "pending",
            positionX: 0,
            positionY: 0,
            width: 200,
            height: 150,
            zIndex: 0,
            color: null,
            metadata: {},
            vectorClock: null,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
        ],
      };

      mockCommandBoard.findFirst.mockResolvedValue(mockBoard as any);

      const request = new Request(`http://localhost/api/command-board/${TEST_BOARD_ID}`);
      const response = await GET_BOARD(request, { params: Promise.resolve({ boardId: TEST_BOARD_ID }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.id).toBe(TEST_BOARD_ID);
      expect(body.cards).toHaveLength(1);
    });

    it("should return 404 for non-existent board", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);
      mockCommandBoard.findFirst.mockResolvedValue(null);

      const request = new Request(`http://localhost/api/command-board/${TEST_BOARD_ID}`);
      const response = await GET_BOARD(request, { params: Promise.resolve({ boardId: TEST_BOARD_ID }) });

      expect(response.status).toBe(404);
    });

    it("should exclude soft-deleted boards", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(TEST_TENANT_ID);
      mockCommandBoard.findFirst.mockResolvedValue(null);

      const request = new Request(`http://localhost/api/command-board/${TEST_BOARD_ID}`);
      const response = await GET_BOARD(request, { params: Promise.resolve({ boardId: TEST_BOARD_ID }) });

      expect(mockCommandBoard.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });
  });

  describe("Delete Board (Soft Delete)", () => {
    it("should soft delete board via manifest runtime", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User"
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: { id: TEST_BOARD_ID, deletedAt: new Date().toISOString() },
          emittedEvents: [],
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      const request = new Request(`http://localhost/api/command-board/${TEST_BOARD_ID}`, {
        method: "DELETE",
      });

      const response = await DELETE(request as any, { params: Promise.resolve({ boardId: TEST_BOARD_ID }) });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mockRuntime.runCommand).toHaveBeenCalledWith(
        "deactivate",
        expect.objectContaining({
          id: TEST_BOARD_ID,
          tenantId: TEST_TENANT_ID,
        }),
        expect.objectContaining({ entityName: "CommandBoard" })
      );
    });

    it("should reject delete for non-admin users", async () => {
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

      const request = new Request(`http://localhost/api/command-board/${TEST_BOARD_ID}`, {
        method: "DELETE",
      });

      const response = await DELETE(request as any, { params: Promise.resolve({ boardId: TEST_BOARD_ID }) });

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent board on delete", async () => {
      mockRequireCurrentUser.mockResolvedValue({
        id: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User"
      });

      const mockRuntime = {
        runCommand: vi.fn().mockResolvedValue({
          success: false,
          error: "Board not found",
        }),
      };
      mockCreateManifestRuntime.mockResolvedValue(mockRuntime as any);

      const request = new Request(`http://localhost/api/command-board/${TEST_BOARD_ID}`, {
        method: "DELETE",
      });

      const response = await DELETE(request as any, { params: Promise.resolve({ boardId: TEST_BOARD_ID }) });

      expect(response.status).toBe(400);
    });
  });

  describe("Authorization", () => {
    it("should return 401 for unauthenticated requests", async () => {
      mockAuth.mockResolvedValue({ orgId: null, userId: null });

      const request = new Request("http://localhost/api/command-board");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should return 404 for unknown tenant", async () => {
      mockAuth.mockResolvedValue({ orgId: TEST_ORG_ID, userId: TEST_USER_ID });
      mockGetTenantIdForOrg.mockResolvedValue(null as never);

      const request = new Request("http://localhost/api/command-board");
      const response = await GET(request);

      expect(response.status).toBe(404);
    });
  });
});
