/**
 * Connection create command for undo/redo functionality.
 * Creates a connection between two cards on the command board.
 */

import type { CreateConnectionInput } from "../../actions/connections";
import { createConnection, deleteConnection } from "../../actions/connections";
import type { UndoRedoCommand } from "../../types/undo-redo";

/**
 * Input for ConnectionCreateCommand
 */
export interface ConnectionCreateCommandInput {
  boardId: string;
  input: CreateConnectionInput;
  fromCardTitle?: string;
  toCardTitle?: string;
}

/**
 * Command to create a connection between two cards
 */
export class ConnectionCreateCommand implements UndoRedoCommand {
  description: string;
  timestamp: Date;
  userId?: string;

  private readonly boardId: string;
  private readonly input: CreateConnectionInput;
  private createdConnectionId?: string;
  private readonly fromCardTitle: string;
  private readonly toCardTitle: string;

  constructor(commandInput: ConnectionCreateCommandInput) {
    this.boardId = commandInput.boardId;
    this.input = commandInput.input;
    this.fromCardTitle = commandInput.fromCardTitle ?? "Unknown Card";
    this.toCardTitle = commandInput.toCardTitle ?? "Unknown Card";
    this.description = `Connect ${this.fromCardTitle} to ${this.toCardTitle}`;
    this.timestamp = new Date();
  }

  async execute(): Promise<void> {
    const result = await createConnection(this.boardId, this.input);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to create connection");
    }
    this.createdConnectionId = result.connection?.id;
  }

  async undo(): Promise<void> {
    if (!this.createdConnectionId) {
      throw new Error("Cannot undo: connection ID not found");
    }
    const result = await deleteConnection(this.createdConnectionId);
    if (!result.success) {
      throw new Error(result.error ?? "Failed to undo connection creation");
    }
  }
}
