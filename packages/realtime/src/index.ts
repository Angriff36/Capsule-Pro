/**
 * @repo/realtime - Realtime event transport using outbox pattern + Ably.
 *
 * This package provides:
 * - Type-safe event definitions with discriminated unions
 * - Zod validation schemas for runtime safety
 * - Channel naming conventions
 * - Outbox helper functions for creating events
 *
 * @example
 * ```ts
 * import { createOutboxEvent, getChannelName } from "@repo/realtime";
 *
 * await createOutboxEvent(database, {
 *   tenantId: "tenant-123",
 *   aggregateType: "KitchenTask",
 *   aggregateId: "task-456",
 *   eventType: "kitchen.task.claimed",
 *   payload: { taskId: "task-456", employeeId: "emp-789", claimedAt: new Date().toISOString() },
 * });
 *
 * const channel = getChannelName("tenant-123"); // "tenant:tenant-123"
 * ```
 */

// Event types and schemas
export * from "./events/index.js";

// Channel naming utilities
export * from "./channels/index.js";

// Outbox helpers
export * from "./outbox/index.js";
