/**
 * Event Replay System Types
 *
 * Provides type definitions for replaying command board events,
 * enabling users to see board history when joining a session.
 */

import type { RealtimeEventBase } from "../events";

/**
 * Request parameters for fetching replay events
 */
export interface ReplayFetchRequest {
  /** Board ID to fetch events for */
  boardId: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** Optional: sequence number to start from (for incremental replay) */
  fromSequence?: number;
  /** Optional: maximum number of events to return (default: 1000) */
  limit?: number;
  /** Optional: only return events after this timestamp */
  since?: Date;
}

/**
 * Response containing replay events
 */
export interface ReplayFetchResponse {
  /** Events in chronological order (oldest first) */
  events: ReplayEvent[];
  /** Total number of events available (may be more than returned) */
  totalCount: number;
  /** Last sequence number in this batch */
  lastSequence: number;
  /** Whether more events are available */
  hasMore: boolean;
}

/**
 * A replayable event with metadata for playback
 */
export interface ReplayEvent {
  /** Event ID */
  id: string;
  /** Event type (e.g., "command.board.card.created") */
  eventType: string;
  /** When the event occurred */
  occurredAt: string;
  /** User who triggered the event */
  userId: string;
  /** The event payload */
  payload: unknown;
  /** Sequence number for ordering */
  sequence: number;
}

/**
 * Configuration for replay playback
 */
export interface ReplayConfig {
  /** Speed multiplier for replay (1 = real-time, 10 = 10x faster) */
  playbackSpeed: number;
  /** Whether to show replay UI indicators */
  showIndicator: boolean;
  /** Maximum number of events to replay */
  maxEvents: number;
}

/**
 * State of the replay system
 */
export type ReplayState =
  | "idle"
  | "fetching"
  | "replaying"
  | "paused"
  | "completed"
  | "error";

/**
 * Progress of replay playback
 */
export interface ReplayProgress {
  /** Current replay state */
  state: ReplayState;
  /** Number of events processed */
  processedCount: number;
  /** Total number of events to replay */
  totalCount: number;
  /** Current event being processed */
  currentEvent?: ReplayEvent;
  /** Error if state is "error" */
  error?: string;
}
