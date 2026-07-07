// @vitest-environment node
/**
 * @vitest-environment node
 *
 * Command Board Server Actions — Bulk Operations Tests
 *
 * Tests the server actions for bulk edit (§4.42) and grouping (§4.43):
 * - moveCardAction: repositions a card on the canvas
 * - bulkUpdateCardsAction: updates status/color/cardType on multiple cards
 * - createGroupAction: creates a group and assigns cards
 * - ungroupCardsAction: removes cards from their group
 * - assignToGroupAction: assigns cards to an existing group
 * - toggleGroupCollapseAction: toggles group collapsed state
 * - deleteGroupAction: soft-deletes a group and unassigns cards
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock database
const mockCardUpdate = vi.fn();
const mockCardUpdateMany = vi.fn();
const mockCardFindMany = vi.fn();
const mockGroupCreate = vi.fn();
const mockGroupUpdate = vi.fn();
const mockGroupFindMany = vi.fn();
const mockBoardCreate = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    commandBoardCard: {
      update: (...args: unknown[]) => mockCardUpdate(...args),
      updateMany: (...args: unknown[]) => mockCardUpdateMany(...args),
      findMany: (...args: unknown[]) => mockCardFindMany(...args),
    },
    commandBoardGroup: {
      create: (...args: unknown[]) => mockGroupCreate(...args),
      update: (...args: unknown[]) => mockGroupUpdate(...args),
      findMany: (...args: unknown[]) => mockGroupFindMany(...args),
    },
    commandBoard: {
      create: (...args: unknown[]) => mockBoardCreate(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

// Mock tenant
const mockTenantId = "tenant-001";
const mockUser = { id: "user-001", tenantId: mockTenantId, role: "admin" };
vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: () => Promise.resolve(mockTenantId),
  requireCurrentUser: () => Promise.resolve(mockUser),
}));

// Mock Next.js server functions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock manifest command
const mockRunManifestCommand = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  result: { id: "mock-id" },
});
vi.mock("@/lib/manifest-command", () => ({
  runManifestCommand: (...args: unknown[]) => mockRunManifestCommand(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Import after mocks
import {
  assignToGroupAction,
  bulkUpdateCardsAction,
  createGroupAction,
  deleteGroupAction,
  moveCardAction,
  toggleGroupCollapseAction,
  ungroupCardsAction,
} from "@/app/(authenticated)/(events)/events/tree/actions";

describe("Command Board Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock returns
    mockCardFindMany.mockResolvedValue([]);
    mockGroupFindMany.mockResolvedValue([]);
    mockCardUpdate.mockResolvedValue({});
    mockCardUpdateMany.mockResolvedValue({ count: 0 });
    mockGroupCreate.mockResolvedValue({ id: "group-new" });
    mockGroupUpdate.mockResolvedValue({});
    mockBoardCreate.mockResolvedValue({ id: "board-new" });
  });

  // -----------------------------------------------------------------------
  // moveCardAction
  // -----------------------------------------------------------------------

  describe("moveCardAction", () => {
    it("updates card position via Manifest command", async () => {
      mockRunManifestCommand.mockResolvedValue({
        ok: true,
        status: 200,
        result: { id: "card-1" },
      });

      await moveCardAction("card-1", 150, 250);

      expect(mockRunManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CommandBoardCard",
          command: "move",
          instanceId: "card-1",
          body: expect.objectContaining({
            newPositionX: 150,
            newPositionY: 250,
          }),
          user: expect.objectContaining({ tenantId: mockTenantId }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // bulkUpdateCardsAction
  // -----------------------------------------------------------------------

  describe("bulkUpdateCardsAction", () => {
    it("bulk updates card status", async () => {
      mockCardUpdateMany.mockResolvedValue({ count: 3 });

      await bulkUpdateCardsAction(["card-1", "card-2", "card-3"], {
        status: "done",
      });

      expect(mockCardUpdateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          id: { in: ["card-1", "card-2", "card-3"] },
          deletedAt: null,
        },
        data: { status: "done" },
      });
    });

    it("bulk updates card color", async () => {
      mockCardUpdateMany.mockResolvedValue({ count: 2 });

      await bulkUpdateCardsAction(["card-1", "card-2"], {
        color: "blue",
      });

      expect(mockCardUpdateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          id: { in: ["card-1", "card-2"] },
          deletedAt: null,
        },
        data: { color: "blue" },
      });
    });

    it("no-ops when cardIds is empty", async () => {
      await bulkUpdateCardsAction([], { status: "done" });

      expect(mockCardUpdateMany).not.toHaveBeenCalled();
    });

    it("bulk updates multiple fields at once", async () => {
      mockCardUpdateMany.mockResolvedValue({ count: 2 });

      await bulkUpdateCardsAction(["card-1", "card-2"], {
        status: "in_progress",
        color: "red",
        cardType: "task",
      });

      expect(mockCardUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: "in_progress", color: "red", cardType: "task" },
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // createGroupAction
  // -----------------------------------------------------------------------

  describe("createGroupAction", () => {
    it("creates a group via Manifest command and assigns cards", async () => {
      mockRunManifestCommand.mockResolvedValue({
        ok: true,
        status: 200,
        result: { id: "group-new" },
      });
      mockCardUpdateMany.mockResolvedValue({ count: 3 });

      const result = await createGroupAction(
        "board-1",
        "Front of house",
        "#3b82f6",
        ["card-1", "card-2", "card-3"],
        10,
        20,
        300,
        200
      );

      expect(result.id).toBe("group-new");

      // Group created via Manifest command
      expect(mockRunManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CommandBoardGroup",
          command: "create",
          body: expect.objectContaining({
            boardId: "board-1",
            name: "Front of house",
            color: "#3b82f6",
            positionX: 10,
            positionY: 20,
            width: 300,
            height: 200,
          }),
          user: expect.objectContaining({ tenantId: mockTenantId }),
        })
      );

      // Cards were assigned to the new group
      expect(mockCardUpdateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          id: { in: ["card-1", "card-2", "card-3"] },
          deletedAt: null,
        },
        data: { groupId: result.id },
      });
    });

    it("creates a group without cards", async () => {
      mockRunManifestCommand.mockResolvedValue({
        ok: true,
        status: 200,
        result: { id: "group-empty" },
      });

      const result = await createGroupAction(
        "board-1",
        "Empty group",
        "#94a3b8",
        [],
        0,
        0,
        400,
        300
      );

      expect(result.id).toBe("group-empty");
      expect(mockCardUpdateMany).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // ungroupCardsAction
  // -----------------------------------------------------------------------

  describe("ungroupCardsAction", () => {
    it("removes cards from their group", async () => {
      mockCardUpdateMany.mockResolvedValue({ count: 2 });

      await ungroupCardsAction(["card-1", "card-2"]);

      expect(mockCardUpdateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          id: { in: ["card-1", "card-2"] },
          deletedAt: null,
        },
        data: { groupId: null },
      });
    });

    it("no-ops when cardIds is empty", async () => {
      await ungroupCardsAction([]);

      expect(mockCardUpdateMany).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // assignToGroupAction
  // -----------------------------------------------------------------------

  describe("assignToGroupAction", () => {
    it("assigns cards to an existing group", async () => {
      mockCardUpdateMany.mockResolvedValue({ count: 2 });

      await assignToGroupAction(["card-1", "card-2"], "group-1");

      expect(mockCardUpdateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          id: { in: ["card-1", "card-2"] },
          deletedAt: null,
        },
        data: { groupId: "group-1" },
      });
    });

    it("no-ops when cardIds is empty", async () => {
      await assignToGroupAction([], "group-1");

      expect(mockCardUpdateMany).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // toggleGroupCollapseAction
  // -----------------------------------------------------------------------

  describe("toggleGroupCollapseAction", () => {
    it("collapses a group via Manifest command", async () => {
      mockRunManifestCommand.mockResolvedValue({
        ok: true,
        status: 200,
        result: { id: "group-1" },
      });

      await toggleGroupCollapseAction("group-1", true);

      expect(mockRunManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CommandBoardGroup",
          command: "update",
          instanceId: "group-1",
          body: expect.objectContaining({
            newCollapsed: true,
          }),
          user: expect.objectContaining({ tenantId: mockTenantId }),
        })
      );
    });

    it("expands a group via Manifest command", async () => {
      mockRunManifestCommand.mockResolvedValue({
        ok: true,
        status: 200,
        result: { id: "group-1" },
      });

      await toggleGroupCollapseAction("group-1", false);

      expect(mockRunManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CommandBoardGroup",
          command: "update",
          instanceId: "group-1",
          body: expect.objectContaining({
            newCollapsed: false,
          }),
          user: expect.objectContaining({ tenantId: mockTenantId }),
        })
      );
    });
  });

  // -----------------------------------------------------------------------
  // deleteGroupAction
  // -----------------------------------------------------------------------

  describe("deleteGroupAction", () => {
    it("unassigns cards and soft-deletes the group via Manifest", async () => {
      mockCardUpdateMany.mockResolvedValue({ count: 3 });
      mockRunManifestCommand.mockResolvedValue({
        ok: true,
        status: 200,
        result: { id: "group-1" },
      });

      await deleteGroupAction("group-1");

      // Cards are unassigned first via direct Prisma (no governed equivalent for batch)
      expect(mockCardUpdateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          groupId: "group-1",
          deletedAt: null,
        },
        data: { groupId: null },
      });

      // Then group is soft-deleted via Manifest command
      expect(mockRunManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CommandBoardGroup",
          command: "remove",
          instanceId: "group-1",
          user: expect.objectContaining({ tenantId: mockTenantId }),
        })
      );
    });
  });
});
