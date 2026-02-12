/**
 * Connection update command for undo/redo functionality.
 * Updates a connection between two cards on the command board.
 */

import type { UndoRedoCommand } from "../../types/undo-redo";
import type { CardConnection, RelationshipType } from "../../types";
import type { UpdateConnectionInput } from "../../actions/connections";
import { updateConnection } from "../../actions/connections";

/**
 * Input for ConnectionUpdateCommand
 */
export interface ConnectionUpdateCommandInput {
  oldConnection: CardConnection;
  newProperties: Partial<Pick<CardConnection, "relationshipType" | "label" | "visible">>;
}

/**
 * Command to update a connection between two cards
 */
export class ConnectionUpdateCommand implements UndoRedoCommand {
  description = "Update connection";
  timestamp: Date;
  userId?: string;

  private readonly oldConnection: CardConnection;
  private readonly newProperties: Partial<
    Pick<CardConnection, "relationshipType" | "label" | "visible">
  >;

  constructor(commandInput: ConnectionUpdateCommandInput) {
    this.oldConnection = commandInput.oldConnection;
    this.newProperties = commandInput.newProperties;
    this.timestamp = new Date();
  }

  async execute(): Promise<void> {
    const result = await updateConnection({
      id: this.oldConnection.id,
      ...this.newProperties,
    });
    if (!result.success) {
      throw new Error(result.error ?? "Failed to update connection");
    }
  }

  async undo(): Promise<void> {
    // Restore the old connection state
    const result = await updateConnection({
      id: this.oldConnection.id,
      relationshipType: this.oldConnection.relationshipType,
      label: this.oldConnection.label,
      visible: this.oldConnection.visible,
    });
    if (!result.success) {
      throw new Error(result.error ?? "Failed to undo connection update");
    }
  }
}
