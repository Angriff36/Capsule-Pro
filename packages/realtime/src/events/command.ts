/**
 * Command Board domain realtime events.
 * These events represent state changes in the Strategic Command Board.
 */

import type { RealtimeEventBase } from "./envelope.js";

/**
 * Emitted when a new card is created on the command board.
 */
export interface CommandBoardCardCreatedEvent extends RealtimeEventBase {
  eventType: "command.board.card.created";
  payload: {
    /** Board identifier */
    boardId: string;
    /** Card identifier */
    cardId: string;
    /** Card type (task, note, alert, info, client, event, employee, inventory) */
    cardType: string;
    /** Card title */
    title: string;
    /** X position on board */
    positionX: number;
    /** Y position on board */
    positionY: number;
    /** User who created the card */
    createdBy: string;
    /** ISO 8601 timestamp of creation */
    createdAt: string;
  };
}

/**
 * Emitted when a card is updated on the command board.
 */
export interface CommandBoardCardUpdatedEvent extends RealtimeEventBase {
  eventType: "command.board.card.updated";
  payload: {
    /** Board identifier */
    boardId: string;
    /** Card identifier */
    cardId: string;
    /** Updated fields */
    changes: Record<string, unknown>;
    /** User who updated the card */
    updatedBy: string;
    /** ISO 8601 timestamp of update */
    updatedAt: string;
  };
}

/**
 * Emitted when a card is moved on the command board.
 */
export interface CommandBoardCardMovedEvent extends RealtimeEventBase {
  eventType: "command.board.card.moved";
  payload: {
    /** Board identifier */
    boardId: string;
    /** Card identifier */
    cardId: string;
    /** Previous position */
    previousPosition: { x: number; y: number };
    /** New position */
    newPosition: { x: number; y: number };
    /** User who moved the card */
    movedBy: string;
    /** ISO 8601 timestamp of move */
    movedAt: string;
  };
}

/**
 * Emitted when a card is deleted from the command board.
 */
export interface CommandBoardCardDeletedEvent extends RealtimeEventBase {
  eventType: "command.board.card.deleted";
  payload: {
    /** Board identifier */
    boardId: string;
    /** Card identifier */
    cardId: string;
    /** User who deleted the card */
    deletedBy: string;
    /** ISO 8601 timestamp of deletion */
    deletedAt: string;
  };
}

/**
 * Emitted when a board is updated.
 */
export interface CommandBoardUpdatedEvent extends RealtimeEventBase {
  eventType: "command.board.updated";
  payload: {
    /** Board identifier */
    boardId: string;
    /** Board name */
    name: string;
    /** Updated fields */
    changes: Record<string, unknown>;
    /** User who updated the board */
    updatedBy: string;
    /** ISO 8601 timestamp of update */
    updatedAt: string;
  };
}

/**
 * Emitted when a user joins a command board session.
 */
export interface CommandBoardUserJoinedEvent extends RealtimeEventBase {
  eventType: "command.board.user.joined";
  payload: {
    /** Board identifier */
    boardId: string;
    /** User identifier */
    userId: string;
    /** User display name */
    userName: string;
    /** ISO 8601 timestamp of join */
    joinedAt: string;
  };
}

/**
 * Emitted when a user leaves a command board session.
 */
export interface CommandBoardUserLeftEvent extends RealtimeEventBase {
  eventType: "command.board.user.left";
  payload: {
    /** Board identifier */
    boardId: string;
    /** User identifier */
    userId: string;
    /** ISO 8601 timestamp of leave */
    leftAt: string;
  };
}

/**
 * Emitted when a user's cursor position changes.
 */
export interface CommandBoardCursorMovedEvent extends RealtimeEventBase {
  eventType: "command.board.cursor.moved";
  payload: {
    /** Board identifier */
    boardId: string;
    /** User identifier */
    userId: string;
    /** Cursor position */
    position: { x: number; y: number };
    /** ISO 8601 timestamp of movement */
    movedAt: string;
  };
}

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

/** Union type of all command board events */
export type CommandBoardEvent =
  | CommandBoardCardCreatedEvent
  | CommandBoardCardUpdatedEvent
  | CommandBoardCardMovedEvent
  | CommandBoardCardDeletedEvent
  | CommandBoardUpdatedEvent
  | CommandBoardUserJoinedEvent
  | CommandBoardUserLeftEvent
  | CommandBoardCursorMovedEvent
  | CommandBoardConnectionCreatedEvent
  | CommandBoardConnectionUpdatedEvent
  | CommandBoardConnectionDeletedEvent;
