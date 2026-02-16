/**
 * Realtime event envelope base types.
 * All realtime events extend this base interface.
 */

export const REALTIME_EVENT_VERSION = 1 as const;

/**
 * Base interface for all realtime events.
 * These fields are included in every Ably message for consumer deduplication and ordering.
 */
export interface RealtimeEventBase {
  /** Unique event ID (mirrors OutboxEvent.id, used for consumer deduplication) */
  id: string;
  /** Schema version for evolution */
  version: typeof REALTIME_EVENT_VERSION;
  /** Tenant identifier for multi-tenancy */
  tenantId: string;
  /** Aggregate type (e.g., "KitchenTask", "Event") */
  aggregateType: string;
  /** Aggregate instance ID (e.g., task ID, event ID) */
  aggregateId: string;
  /** ISO 8601 timestamp - when the domain event occurred (authoritative for ordering) */
  occurredAt: string;
}

/** Discriminated union type for all realtime events */
export type RealtimeEvent = RealtimeEventBase & {
  eventType: string;
  payload: unknown;
};
