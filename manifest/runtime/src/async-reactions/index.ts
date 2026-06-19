/**
 * Async durable queue for cross-entity reactions.
 *
 * Public surface of the async-reactions subsystem:
 * - {@link PostgresAsyncReactionStore}  — production durable queue (Postgres)
 * - {@link InMemoryAsyncReactionStore}  — tests / dev without DB
 * - {@link asyncReactionRegistry}       — handler registry (populate at boot)
 * - {@link drainAsyncReactions}         — worker drain loop
 * - Types: {@link AsyncReactionJob}, {@link AsyncReactionHandler}, etc.
 *
 * See `types.ts` for the constitution-alignment rationale and the at-least-once
 * delivery contract.
 *
 * @packageDocumentation
 */

export { PostgresAsyncReactionStore } from "./postgres-async-reaction-store";
export type { PostgresAsyncReactionStoreOptions } from "./postgres-async-reaction-store";
export { InMemoryAsyncReactionStore } from "./in-memory-async-reaction-store";
export type { InMemoryAsyncReactionStoreOptions } from "./in-memory-async-reaction-store";
export {
  asyncReactionRegistry,
  type RegisteredAsyncReaction,
} from "./handler-registry";
export {
  drainAsyncReactions,
  type DrainAsyncReactionsContext,
  type DrainResult,
} from "./drain-async-reactions";
export {
  computeBackoffMs,
  DEFAULT_ASYNC_REACTION_POLICY,
  type AsyncReactionHandler,
  type AsyncReactionHandlerContext,
  type AsyncReactionJob,
  type AsyncReactionJobStatus,
  type AsyncReactionQueueOptions,
  type AsyncReactionStore,
  type TriggeringEventPayload,
} from "./types";
export {
  createAsyncDispatch,
  type AsyncDispatch,
  type AsyncDispatchContext,
  type CapturedTriggeringEvent,
} from "./async-dispatch";
export { EVENT_UPDATED_BOARD_SYNC_REACTION, eventUpdatedBoardSyncHandler } from "./handlers/event-updated-board-sync-handler";
export { SHIPMENT_ITEM_RECEIVED_INVENTORY_RESTOCK_REACTION, shipmentItemReceivedInventoryRestockHandler } from "./handlers/shipment-item-received-inventory-restock-handler";
