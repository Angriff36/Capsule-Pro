/**
 * Realtime event envelope base types.
 * All realtime events extend this base interface.
 */
export declare const REALTIME_EVENT_VERSION: 1;
/**
 * Base interface for all realtime events.
 * These fields are included in every realtime message for consumer deduplication and ordering.
 */
export interface RealtimeEventBase {
    /** Aggregate instance ID (e.g., task ID, event ID) */
    aggregateId: string;
    /** Aggregate type (e.g., "KitchenTask", "Event") */
    aggregateType: string;
    /** Unique event ID (mirrors OutboxEvent.id, used for consumer deduplication) */
    id: string;
    /** ISO 8601 timestamp - when the domain event occurred (authoritative for ordering) */
    occurredAt: string;
    /** Tenant identifier for multi-tenancy */
    tenantId: string;
    /** Schema version for evolution */
    version: typeof REALTIME_EVENT_VERSION;
}
/** Discriminated union type for all realtime events */
export type RealtimeEvent = RealtimeEventBase & {
    eventType: string;
    payload: unknown;
};
//# sourceMappingURL=envelope.d.ts.map