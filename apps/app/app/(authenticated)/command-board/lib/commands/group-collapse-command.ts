/**
 * Group collapse command for undo/redo functionality.
 * Toggles the collapsed state of a group on the command board.
 */

import type { UndoRedoCommand } from "../../types/undo-redo";
import { toggleGroupCollapsed } from "../../actions/groups";

/**
 * Input for GroupCollapseCommand
 */
export interface GroupCollapseCommandInput {
  groupId: string;
}

/**
 * Command to toggle group collapsed state
 */
export class GroupCollapseCommand implements UndoRedoCommand {
  description = "Collapse group";
  timestamp: Date;
  userId?: string;

  private readonly groupId: string;
  private previousCollapsedState?: boolean;

  constructor(input: GroupCollapseCommandInput) {
    this.groupId = input.groupId;
    this.timestamp = new Date();
  }

  async execute(): Promise<void> {
    const result = await toggleGroupCollapsed(this.groupId);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to toggle group collapsed state");
    }
    // Store the previous state for undo (it's the opposite of what it is now)
    this.previousCollapsedState = !result.group?.collapsed;
  }

  async undo(): Promise<void> {
    if (this.previousCollapsedState === undefined) {
      throw new Error("Cannot undo: previous state not found");
    }

    // Toggle back to the previous state
    // We need to toggle again because toggleGroupCollapsed flips the state
    const result = await toggleGroupCollapsed(this.groupId);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to undo group collapse");
    }

    // Verify we're back to the previous state
    if (result.group?.collapsed !== this.previousCollapsedState) {
      throw new Error("Undo failed: state mismatch");
    }
  }
}
