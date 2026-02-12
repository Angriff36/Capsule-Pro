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
export * from "./channels/index";
export * from "./events/index";
export * from "./outbox/index";
export * from "./replay/index";
export * from "./clocks/index";
//# sourceMappingURL=index.d.ts.map