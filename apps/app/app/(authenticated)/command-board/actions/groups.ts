"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type {
  CardPosition,
  CommandBoardGroup,
  CreateGroupInput,
  UpdateGroupInput,
} from "../types";

function positionToDb(position: CardPosition): {
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  zIndex: number;
} {
  return {
    positionX: position.x,
    positionY: position.y,
    width: position.width,
    height: position.height,
    zIndex: position.zIndex,
  };
}

export interface GroupResult {
  success: boolean;
  group?: CommandBoardGroup;
  error?: string;
}

export async function createGroup(
  boardId: string,
  input: CreateGroupInput
): Promise<GroupResult> {
  try {
    const tenantId = await requireTenantId();

    // Verify board exists and belongs to tenant
    const board = await database.commandBoard.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: boardId,
        },
      },
    });

    if (!board) {
      return {
        success: false,
        error: "Board not found",
      };
    }

    // Get max zIndex for groups on this board
    const maxZGroups = await database.commandBoardGroup.findMany({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
      },
      orderBy: {
        zIndex: "desc",
      },
      take: 1,
    });

    const maxZ = maxZGroups[0]?.zIndex ?? 0;

    const defaultPosition: CardPosition = {
      x: input.position?.x ?? 100,
      y: input.position?.y ?? 100,
      width: input.position?.width ?? 300,
      height: input.position?.height ?? 200,
      zIndex: maxZ + 1,
    };

    const group = await database.commandBoardGroup.create({
      data: {
        tenantId,
        boardId,
        id: crypto.randomUUID(),
        name: input.name,
        color: input.color ?? null,
        collapsed: false,
        ...positionToDb(defaultPosition),
      },
    });

    // If cardIds provided, add cards to group
    if (input.cardIds && input.cardIds.length > 0) {
      await database.commandBoardCard.updateMany({
        where: {
          tenantId,
          id: { in: input.cardIds },
          boardId,
        },
        data: {
          groupId: group.id,
        },
      });
    }

    return {
      success: true,
      group: {
        id: group.id,
        tenantId: group.tenantId,
        boardId: group.boardId,
        name: group.name,
        color: group.color,
        collapsed: group.collapsed,
        position: {
          x: group.positionX,
          y: group.positionY,
          width: group.width,
          height: group.height,
          zIndex: group.zIndex,
        },
        cardIds: input.cardIds ?? [],
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        deletedAt: group.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create group",
    };
  }
}

export async function updateGroup(
  input: UpdateGroupInput
): Promise<GroupResult> {
  try {
    const tenantId = await requireTenantId();

    const updateData: {
      name?: string;
      color?: string | null;
      collapsed?: boolean;
      positionX?: number;
      positionY?: number;
      width?: number;
      height?: number;
      zIndex?: number;
    } = {};

    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    if (input.color !== undefined) {
      updateData.color = input.color;
    }
    if (input.collapsed !== undefined) {
      updateData.collapsed = input.collapsed;
    }
    if (input.position !== undefined) {
      updateData.positionX = input.position.x;
      updateData.positionY = input.position.y;
      updateData.width = input.position.width;
      updateData.height = input.position.height;
      updateData.zIndex = input.position.zIndex;
    }

    const group = await database.commandBoardGroup.update({
      where: {
        tenantId_id: {
          tenantId,
          id: input.id,
        },
      },
      data: updateData,
      include: {
        cards: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      success: true,
      group: {
        id: group.id,
        tenantId: group.tenantId,
        boardId: group.boardId,
        name: group.name,
        color: group.color,
        collapsed: group.collapsed,
        position: {
          x: group.positionX,
          y: group.positionY,
          width: group.width,
          height: group.height,
          zIndex: group.zIndex,
        },
        cardIds: group.cards.map((c) => c.id),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        deletedAt: group.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update group",
    };
  }
}

export async function deleteGroup(groupId: string): Promise<GroupResult> {
  try {
    const tenantId = await requireTenantId();

    // Remove groupId from all cards in the group
    await database.commandBoardCard.updateMany({
      where: {
        tenantId,
        groupId,
      },
      data: {
        groupId: null,
      },
    });

    // Soft delete the group
    await database.commandBoardGroup.update({
      where: {
        tenantId_id: {
          tenantId,
          id: groupId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete group",
    };
  }
}

export async function addCardsToGroup(
  groupId: string,
  cardIds: string[]
): Promise<GroupResult> {
  try {
    const tenantId = await requireTenantId();

    await database.commandBoardCard.updateMany({
      where: {
        tenantId,
        id: { in: cardIds },
      },
      data: {
        groupId,
      },
    });

    const group = await database.commandBoardGroup.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: groupId,
        },
      },
      include: {
        cards: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!group) {
      return {
        success: false,
        error: "Group not found",
      };
    }

    return {
      success: true,
      group: {
        id: group.id,
        tenantId: group.tenantId,
        boardId: group.boardId,
        name: group.name,
        color: group.color,
        collapsed: group.collapsed,
        position: {
          x: group.positionX,
          y: group.positionY,
          width: group.width,
          height: group.height,
          zIndex: group.zIndex,
        },
        cardIds: group.cards.map((c) => c.id),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        deletedAt: group.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add cards to group",
    };
  }
}

export async function removeCardsFromGroup(
  cardIds: string[]
): Promise<GroupResult> {
  try {
    const tenantId = await requireTenantId();

    await database.commandBoardCard.updateMany({
      where: {
        tenantId,
        id: { in: cardIds },
      },
      data: {
        groupId: null,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to remove cards from group",
    };
  }
}

export async function toggleGroupCollapsed(
  groupId: string
): Promise<GroupResult> {
  try {
    const tenantId = await requireTenantId();

    const currentGroup = await database.commandBoardGroup.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: groupId,
        },
      },
    });

    if (!currentGroup) {
      return {
        success: false,
        error: "Group not found",
      };
    }

    const group = await database.commandBoardGroup.update({
      where: {
        tenantId_id: {
          tenantId,
          id: groupId,
        },
      },
      data: {
        collapsed: !currentGroup.collapsed,
      },
      include: {
        cards: {
          select: {
            id: true,
          },
        },
      },
    });

    return {
      success: true,
      group: {
        id: group.id,
        tenantId: group.tenantId,
        boardId: group.boardId,
        name: group.name,
        color: group.color,
        collapsed: group.collapsed,
        position: {
          x: group.positionX,
          y: group.positionY,
          width: group.width,
          height: group.height,
          zIndex: group.zIndex,
        },
        cardIds: group.cards.map((c) => c.id),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        deletedAt: group.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to toggle group collapsed state",
    };
  }
}

export async function getGroupsForBoard(boardId: string): Promise<{
  success: boolean;
  groups?: CommandBoardGroup[];
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();

    const groups = await database.commandBoardGroup.findMany({
      where: {
        tenantId,
        boardId,
        deletedAt: null,
      },
      include: {
        cards: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        zIndex: "asc",
      },
    });

    return {
      success: true,
      groups: groups.map((group) => ({
        id: group.id,
        tenantId: group.tenantId,
        boardId: group.boardId,
        name: group.name,
        color: group.color,
        collapsed: group.collapsed,
        position: {
          x: group.positionX,
          y: group.positionY,
          width: group.width,
          height: group.height,
          zIndex: group.zIndex,
        },
        cardIds: group.cards.map((c) => c.id),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        deletedAt: group.deletedAt,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get groups",
    };
  }
}
