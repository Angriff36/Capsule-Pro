/**
 * Replay Buffer
 *
 * Manages the storage and retrieval of replay events for command boards.
 * Uses the existing OutboxEvent table as the event store.
 */
import type { ReplayEvent } from "./types.js";
/**
 * Configuration for the replay buffer
 */
interface ReplayBufferConfig {
    /** Maximum number of events to buffer per board */
    maxEventsPerBoard: number;
    /** Time window for events (in milliseconds) */
    timeWindowMs: number;
}
/**
 * Replay Buffer manages event storage for replay functionality
 *
 * Note: This implementation uses the existing OutboxEvent table.
 * The buffer is conceptual - we query the outbox table directly
 * for replay events, filtered by board and time window.
 */
export declare class ReplayBuffer {
    private readonly config;
    constructor(config?: Partial<ReplayBufferConfig>);
    /**
     * Build the SQL query for fetching board events
     * This is used by the API endpoint to query the outbox table
     */
    static buildReplayQuery(params: {
        boardId: string;
        tenantId: string;
        limit?: number;
        since?: Date;
    }): {
        sql: string;
        params: unknown[];
    };
    /**
     * Convert database row to ReplayEvent
     */
    static rowToReplayEvent(row: {
        id: string;
        event_type: string;
        payload: unknown;
        created_at: Date;
        aggregate_id: string;
        aggregate_type: string;
    }): ReplayEvent;
    /**
     * Get the default time window for replay events
     */
    getTimeWindow(): number;
    /**
     * Get the maximum number of events per board
     */
    getMaxEvents(): number;
    /**
     * Calculate the cutoff date for replay events
     */
    getCutoffDate(): Date;
}
export {};
//# sourceMappingURL=replay-buffer.d.ts.map