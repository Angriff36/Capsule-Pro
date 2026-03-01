/**
 * Event Replay System
 *
 * Enables users joining a command board to see recent events that occurred
 * before they joined. This provides context for board state changes.
 *
 * Features:
 * - Fetch recent board events from outbox
 * - Replay events at accelerated speed
 * - Integrates with Liveblocks for seamless transition to live mode
 */
export { ReplayBuffer } from "./replay-buffer.js";
export * from "./types.js";
