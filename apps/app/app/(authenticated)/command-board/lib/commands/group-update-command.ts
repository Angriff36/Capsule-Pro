/**
 * Group update command for undo/redo functionality.
 * Updates properties of an existing group on the command board.
 */

import { database } from "@repo/database";
import { updateGroup } from "../../actions/groups";
import type { CommandBoardGroup, UpdateGroupInput } from "../../types";
import type { UndoRedoCommand } from "../../types-specific/undo-redo";

/**
 * Input for GroupUpdateCommand
 */
export interface GroupUpdateCommandInput {
  input: UpdateGroupInput;
}

/**
 * Command to update a group
 */
export class GroupUpdateCommand implements UndoRedoCommand {
  description = "Update group";
  timestamp: Date;
  userId?: string;

  private readonly input: UpdateGroupInput;
  private previousState?: Partial<CommandBoardGroup>;

  constructor(commandInput: GroupUpdateCommandInput) {
    this.input = commandInput.input;
    this.timestamp = new Date();
  }

  async execute(): Promise<void> {
    // Fetch the current group state before updating for undo
    const group = await database.commandBoardGroup.findFirst({
      where: {
        id: this.input.id,
      },
    });

    if (!group) {
      throw new Error("Group not found");
    }

    // Store the previous state for undo
    this.previousState = {
      id: group.id,
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
    };

    const result = await updateGroup(this.input);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to update group");
    }
  }

  async undo(): Promise<void> {
    if (!this.previousState) {
      throw new Error("Cannot undo: previous state not found");
    }

    // Restore the previous state
    const undoInput: UpdateGroupInput = {
      id: this.input.id,
    };

    if (this.previousState.name !== undefined) {
      undoInput.name = this.previousState.name;
    }
    if (this.previousState.color !== undefined) {
      undoInput.color = this.previousState.color;
    }
    if (this.previousState.collapsed !== undefined) {
      undoInput.collapsed = this.previousState.collapsed;
    }
    if (this.previousState.position !== undefined) {
      undoInput.position = this.previousState.position;
    }

    const result = await updateGroup(undoInput);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to undo group update");
    }
  }
}
