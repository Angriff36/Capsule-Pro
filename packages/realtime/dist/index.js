/**
 * @repo/realtime - Realtime event transport using the outbox pattern.
 *
 * Transport-agnostic primitives (types, channel naming, outbox helpers).
 * The current runtime fanout is the in-process SSE pub/sub in apps/api
 * (`apps/api/lib/realtime/pubsub.ts`); this package does not depend on
 * any specific broker.
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
// Channel naming utilities
export * from "./channels/index.js";
// Vector clocks for causality tracking
export * from "./clocks/index.js";
// Event types and schemas
export * from "./events/index.js";
// Outbox helpers
export * from "./outbox/index.js";
// Replay system
export * from "./replay/index.js";
