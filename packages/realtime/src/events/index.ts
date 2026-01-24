/**
 * Event type exports.
 * Re-exports all event types, schemas, and utilities.
 */

// Envelope types
export type { RealtimeEvent, RealtimeEventBase } from "./envelope";
export { REALTIME_EVENT_VERSION } from "./envelope";

// Kitchen event types
export type {
  KitchenEvent,
  KitchenTaskClaimedEvent,
  KitchenTaskProgressEvent,
  KitchenTaskReleasedEvent,
} from "./kitchen";

// Command Board event types
export type {
  CommandBoardEvent,
  CommandBoardCardCreatedEvent,
  CommandBoardCardUpdatedEvent,
  CommandBoardCardMovedEvent,
  CommandBoardCardDeletedEvent,
  CommandBoardUpdatedEvent,
  CommandBoardUserJoinedEvent,
  CommandBoardUserLeftEvent,
  CommandBoardCursorMovedEvent,
} from "./command";

// Zod schemas - Kitchen
export {
  isKitchenEvent,
  KitchenTaskClaimedEventSchema,
  KitchenTaskClaimedPayloadSchema,
  KitchenTaskProgressEventSchema,
  KitchenTaskProgressPayloadSchema,
  KitchenTaskReleasedEventSchema,
  KitchenTaskReleasedPayloadSchema,
} from "./schemas";

// Zod schemas - Command Board
export {
  isCommandBoardEvent,
  CommandBoardCardCreatedEventSchema,
  CommandBoardCardCreatedPayloadSchema,
  CommandBoardCardUpdatedEventSchema,
  CommandBoardCardUpdatedPayloadSchema,
  CommandBoardCardMovedEventSchema,
  CommandBoardCardMovedPayloadSchema,
  CommandBoardCardDeletedEventSchema,
  CommandBoardCardDeletedPayloadSchema,
  CommandBoardUpdatedEventSchema,
  CommandBoardUpdatedPayloadSchema,
  CommandBoardUserJoinedEventSchema,
  CommandBoardUserJoinedPayloadSchema,
  CommandBoardUserLeftEventSchema,
  CommandBoardUserLeftPayloadSchema,
  CommandBoardCursorMovedEventSchema,
  CommandBoardCursorMovedPayloadSchema,
} from "./schemas";

// Core Zod schemas and utilities
export {
  parseRealtimeEvent,
  RealtimeEventBaseSchema,
  RealtimeEventSchema,
} from "./schemas";
