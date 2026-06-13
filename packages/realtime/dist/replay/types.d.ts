/**
 * Event Replay System Types
 *
 * Provides type definitions for replaying command board events,
 * enabling users to see board history when joining a session.
 */
/**
 * Request parameters for fetching replay events
 */
export interface ReplayFetchRequest {
    /** Board ID to fetch events for */
    boardId: string;
    /** Optional: sequence number to start from (for incremental replay) */
    fromSequence?: number;
    /** Optional: maximum number of events to return (default: 1000) */
    limit?: number;
    /** Optional: only return events after this timestamp */
    since?: Date;
    /** Tenant ID for multi-tenancy */
    tenantId: string;
}
/**
 * Response containing replay events
 */
export interface ReplayFetchResponse {
    /** Events in chronological order (oldest first) */
    events: ReplayEvent[];
    /** Whether more events are available */
    hasMore: boolean;
    /** Last sequence number in this batch */
    lastSequence: number;
    /** Total number of events available (may be more than returned) */
    totalCount: number;
}
/**
 * A replayable event with metadata for playback
 */
export interface ReplayEvent {
    /** Event type (e.g., "command.board.card.created") */
    eventType: string;
    /** Event ID */
    id: string;
    /** When the event occurred */
    occurredAt: string;
    /** The event payload */
    payload: unknown;
    /** Sequence number for ordering */
    sequence: number;
    /** User who triggered the event */
    userId: string;
}
/**
 * Configuration for replay playback
 */
export interface ReplayConfig {
    /** Maximum number of events to replay */
    maxEvents: number;
    /** Speed multiplier for replay (1 = real-time, 10 = 10x faster) */
    playbackSpeed: number;
    /** Whether to show replay UI indicators */
    showIndicator: boolean;
}
/**
 * State of the replay system
 */
export type ReplayState = "idle" | "fetching" | "replaying" | "paused" | "completed" | "error";
/**
 * Progress of replay playback
 */
export interface ReplayProgress {
    /** Current event being processed */
    currentEvent?: ReplayEvent;
    /** Error if state is "error" */
    error?: string;
    /** Number of events processed */
    processedCount: number;
    /** Current replay state */
    state: ReplayState;
    /** Total number of events to replay */
    totalCount: number;
}
//# sourceMappingURL=types.d.ts.map