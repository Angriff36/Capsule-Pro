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
const mockGroupCreate = vi.fn();
const mockGroupUpdate = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    commandBoardCard: {
      update: (...args: unknown[]) => mockCardUpdate(...args),
      updateMany: (...args: unknown[]) => mockCardUpdateMany(...args),
    },
    commandBoardGroup: {
      create: (...args: unknown[]) => mockGroupCreate(...args),
      update: (...args: unknown[]) => mockGroupUpdate(...args),
    },
  },
}));

// Mock tenant
const mockTenantId = "tenant-001";
vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: () => Promise.resolve(mockTenantId),
}));

// Mock Next.js server functions
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
} from "@/app/(authenticated)/command-board/actions";

describe("Command Board Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // moveCardAction
  // -----------------------------------------------------------------------

  describe("moveCardAction", () => {
    it("updates card position", async () => {
      mockCardUpdate.mockResolvedValue({});

      await moveCardAction("card-1", 150, 250);

      expect(mockCardUpdate).toHaveBeenCalledWith({
        where: {
          tenantId_id: { tenantId: mockTenantId, id: "card-1" },
        },
        data: { positionX: 150, positionY: 250 },
      });
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
    it("creates a group and assigns cards", async () => {
      mockGroupCreate.mockResolvedValue({});
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

      // The action generates its own UUID
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );

      // Group was created with correct fields
      expect(mockGroupCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          boardId: "board-1",
          name: "Front of house",
          color: "#3b82f6",
          collapsed: false,
          positionX: 10,
          positionY: 20,
          width: 300,
          height: 200,
        }),
      });

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
      mockGroupCreate.mockResolvedValue({});

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

      // Action generates UUID
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
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
    it("collapses a group", async () => {
      mockGroupUpdate.mockResolvedValue({});

      await toggleGroupCollapseAction("group-1", true);

      expect(mockGroupUpdate).toHaveBeenCalledWith({
        where: {
          tenantId_id: { tenantId: mockTenantId, id: "group-1" },
        },
        data: { collapsed: true },
      });
    });

    it("expands a group", async () => {
      mockGroupUpdate.mockResolvedValue({});

      await toggleGroupCollapseAction("group-1", false);

      expect(mockGroupUpdate).toHaveBeenCalledWith({
        where: {
          tenantId_id: { tenantId: mockTenantId, id: "group-1" },
        },
        data: { collapsed: false },
      });
    });
  });

  // -----------------------------------------------------------------------
  // deleteGroupAction
  // -----------------------------------------------------------------------

  describe("deleteGroupAction", () => {
    it("unassigns cards and soft-deletes the group", async () => {
      mockCardUpdateMany.mockResolvedValue({ count: 3 });
      mockGroupUpdate.mockResolvedValue({});

      await deleteGroupAction("group-1");

      // Cards are unassigned first
      expect(mockCardUpdateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          groupId: "group-1",
          deletedAt: null,
        },
        data: { groupId: null },
      });

      // Then group is soft-deleted
      expect(mockGroupUpdate).toHaveBeenCalledWith({
        where: {
          tenantId_id: { tenantId: mockTenantId, id: "group-1" },
        },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
