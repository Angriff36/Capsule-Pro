/**
 * Group delete command for undo/redo functionality.
 * Deletes (soft deletes) a group from the command board.
 */

import { database } from "@repo/database";
import { deleteGroup as deleteGroupAction } from "../../actions/groups";
import type { CommandBoardGroup } from "../../types";
import type { UndoRedoCommand } from "../../types/undo-redo";

/**
 * Input for GroupDeleteCommand
 */
export interface GroupDeleteCommandInput {
  groupId: string;
}

/**
 * Command to delete a group
 */
export class GroupDeleteCommand implements UndoRedoCommand {
  description = "Delete group";
  timestamp: Date;
  userId?: string;

  private readonly groupId: string;
  private previousState?: CommandBoardGroup;

  constructor(input: GroupDeleteCommandInput) {
    this.groupId = input.groupId;
    this.timestamp = new Date();
  }

  async execute(): Promise<void> {
    // Fetch the group state before deletion for undo
    const group = await database.commandBoardGroup.findFirst({
      where: {
        id: this.groupId,
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
      throw new Error("Group not found");
    }

    // Store the previous state for undo
    this.previousState = {
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
      cardIds: group.cards.map((card: { id: string }) => card.id),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      deletedAt: group.deletedAt,
    };

    const result = await deleteGroupAction(this.groupId);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to delete group");
    }
  }

  async undo(): Promise<void> {
    if (!this.previousState) {
      throw new Error("Cannot undo: previous state not found");
    }

    // Restore the group by setting deletedAt to null
    await database.commandBoardGroup.update({
      where: {
        tenantId_id: {
          tenantId: this.previousState.tenantId,
          id: this.groupId,
        },
      },
      data: {
        deletedAt: null,
      },
    });

    // Restore card associations
    if (this.previousState.cardIds.length > 0) {
      await database.commandBoardCard.updateMany({
        where: {
          id: { in: this.previousState.cardIds },
        },
        data: {
          groupId: this.groupId,
        },
      });
    }
  }
}
