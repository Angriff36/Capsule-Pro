/**
 * Command Board Connection domain realtime events.
 * These events represent state changes in connections between cards on the Strategic Command Board.
 */

import type { RealtimeEventBase } from "./envelope.js";

/**
 * Emitted when a new connection is created between cards on the command board.
 */
export interface CommandBoardConnectionCreatedEvent extends RealtimeEventBase {
  eventType: "command.board.connection.created";
  payload: {
    /** Board identifier */
    boardId: string;
    /** Connection identifier */
    connectionId: string;
    /** Source card identifier */
    fromCardId: string;
    /** Target card identifier */
    toCardId: string;
    /** Type of relationship (generic, dependency, blocks, related_to, part_of) */
    relationshipType: string;
    /** User who created connection */
    createdBy: string;
    /** ISO 8601 timestamp of creation */
    createdAt: string;
  };
}

/**
 * Emitted when a connection is updated on the command board.
 */
export interface CommandBoardConnectionUpdatedEvent extends RealtimeEventBase {
  eventType: "command.board.connection.updated";
  payload: {
    /** Board identifier */
    boardId: string;
    /** Connection identifier */
    connectionId: string;
    /** Updated fields (relationshipType, label, visible) */
    changes: Record<string, unknown>;
    /** User who updated connection */
    updatedBy: string;
    /** ISO 8601 timestamp of update */
    updatedAt: string;
  };
}

/**
 * Emitted when a connection is deleted from the command board.
 */
export interface CommandBoardConnectionDeletedEvent extends RealtimeEventBase {
  eventType: "command.board.connection.deleted";
  payload: {
    /** Board identifier */
    boardId: string;
    /** Connection identifier */
    connectionId: string;
    /** Source card identifier */
    fromCardId: string;
    /** Target card identifier */
    toCardId: string;
    /** User who deleted connection */
    deletedBy: string;
    /** ISO 8601 timestamp of deletion */
    deletedAt: string;
  };
}

/** Union type of all connection events */
export type ConnectionBoardEvent =
  | CommandBoardConnectionCreatedEvent
  | CommandBoardConnectionUpdatedEvent
  | CommandBoardConnectionDeletedEvent;
