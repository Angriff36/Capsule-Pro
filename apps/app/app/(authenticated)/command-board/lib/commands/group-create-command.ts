/**
 * Group create command for undo/redo functionality.
 * Creates a group on the command board.
 */

import type { UndoRedoCommand } from "../../types/undo-redo";
import type { CreateGroupInput } from "../../types";
import { createGroup, deleteGroup } from "../../actions/groups";

/**
 * Input for GroupCreateCommand
 */
export interface GroupCreateCommandInput {
  boardId: string;
  input: CreateGroupInput;
}

/**
 * Command to create a group
 */
export class GroupCreateCommand implements UndoRedoCommand {
  description = "Create group";
  timestamp: Date;
  userId?: string;

  private readonly boardId: string;
  private readonly input: CreateGroupInput;
  private createdGroupId?: string;

  constructor(input: GroupCreateCommandInput) {
    this.boardId = input.boardId;
    this.input = input.input;
    this.timestamp = new Date();
  }

  async execute(): Promise<void> {
    const result = await createGroup(this.boardId, this.input);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to create group");
    }
    this.createdGroupId = result.group?.id;
  }

  async undo(): Promise<void> {
    if (!this.createdGroupId) {
      throw new Error("Cannot undo: group ID not found");
    }
    const result = await deleteGroup(this.createdGroupId);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to undo group creation");
    }
  }
}
