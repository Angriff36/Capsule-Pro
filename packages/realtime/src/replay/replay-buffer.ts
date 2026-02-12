/**
 * Replay Buffer
 *
 * Manages the storage and retrieval of replay events for command boards.
 * Uses the existing OutboxEvent table as the event store.
 */

import type { ReplayEvent } from "./types";

/**
 * Configuration for the replay buffer
 */
interface ReplayBufferConfig {
  /** Maximum number of events to buffer per board */
  maxEventsPerBoard: number;
  /** Time window for events (in milliseconds) */
  timeWindowMs: number;
}

const DEFAULT_CONFIG: ReplayBufferConfig = {
  maxEventsPerBoard: 1000,
  timeWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Replay Buffer manages event storage for replay functionality
 *
 * Note: This implementation uses the existing OutboxEvent table.
 * The buffer is conceptual - we query the outbox table directly
 * for replay events, filtered by board and time window.
 */
export class ReplayBuffer {
  private readonly config: ReplayBufferConfig;

  constructor(config: Partial<ReplayBufferConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

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
  } {
    const { boardId, tenantId, limit = 1000, since } = params;

    // Query outbox events for cards and connections on this board
    // We need to join with the actual tables to filter by boardId
    const sql = `
      WITH board_entities AS (
        -- Get all card IDs for this board
        SELECT id, 'CommandBoardCard' as aggregate_type
        FROM command_board_cards
        WHERE board_id = $1 AND tenant_id = $2

        UNION ALL

        -- Get all connection IDs for this board
        SELECT id, 'CommandBoardConnection' as aggregate_type
        FROM command_board_connections
        WHERE board_id = $1 AND tenant_id = $2
      )
      SELECT
        oe.id,
        oe.event_type,
        oe.payload,
        oe.created_at,
        oe.aggregate_id,
        oe.aggregate_type
      FROM outbox_events oe
      INNER JOIN board_entities be
        ON oe.aggregate_id = be.id
        AND oe.aggregate_type = be.aggregate_type
      WHERE oe.tenant_id = $2
        AND oe.status = 'published'
        ${since ? "AND oe.created_at >= $3" : ""}
      ORDER BY oe.created_at ASC
      LIMIT $${since ? 4 : 3}
    `;

    const queryParams: unknown[] = [boardId, tenantId];
    if (since) {
      queryParams.push(since);
    }
    queryParams.push(limit);

    return { sql, params: queryParams };
  }

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
  }): ReplayEvent {
    const payload = row.payload as Record<string, unknown>;
    return {
      id: row.id,
      eventType: row.event_type,
      occurredAt: row.created_at.toISOString(),
      userId: (payload.userId as string) || (payload.createdBy as string) || "",
      payload,
      sequence: row.created_at.getTime(), // Use timestamp as sequence
    };
  }

  /**
   * Get the default time window for replay events
   */
  getTimeWindow(): number {
    return this.config.timeWindowMs;
  }

  /**
   * Get the maximum number of events per board
   */
  getMaxEvents(): number {
    return this.config.maxEventsPerBoard;
  }

  /**
   * Calculate the cutoff date for replay events
   */
  getCutoffDate(): Date {
    return new Date(Date.now() - this.config.timeWindowMs);
  }
}
