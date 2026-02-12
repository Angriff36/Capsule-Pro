/**
 * Connection delete command for undo/redo functionality.
 * Deletes a connection between two cards on the command board.
 */

import type { UndoRedoCommand } from "../../types/undo-redo";
import type {
  CardConnection,
  RelationshipType,
} from "../../types";
import { deleteConnection } from "../../actions/connections";

/**
 * Input for ConnectionDeleteCommand
 */
export interface ConnectionDeleteCommandInput {
  connection: CardConnection;
}

/**
 * Command to delete a connection between two cards
 */
export class ConnectionDeleteCommand implements UndoRedoCommand {
  description = "Delete connection";
  timestamp: Date;
  userId?: string;

  private readonly connection: CardConnection;
  private readonly oldConnection: CardConnection;
  private deletedAt?: Date;

  constructor(commandInput: ConnectionDeleteCommandInput) {
    this.connection = commandInput.connection;
    // Store the old connection state for undo
    this.oldConnection = { ...commandInput.connection };
    this.timestamp = new Date();
  }

  async execute(): Promise<void> {
    const result = await deleteConnection(this.connection.id);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to delete connection");
    }
    this.deletedAt = new Date();
  }

  async undo(): Promise<void> {
    // Restore the connection by calling update with the old properties
    // Since deleteConnection sets deletedAt, we need to restore it
    const { updateConnection } = await import("../../actions/connections");

    const result = await updateConnection({
      id: this.oldConnection.id,
      relationshipType: this.oldConnection.relationshipType,
      label: this.oldConnection.label,
      visible: this.oldConnection.visible,
    });

    if (!result.success) {
      throw new Error(result.error ?? "Failed to undo connection deletion");
    }
  }
}
