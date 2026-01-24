/**
 * Zod validation schemas for realtime events.
 * Provides runtime validation for event payloads.
 */

import { z } from "zod";

/**
 * Base schema for all realtime events.
 */
export const RealtimeEventBaseSchema = z.object({
  id: z.string().min(1),
  version: z.literal(1),
  tenantId: z.string().min(1),
  aggregateType: z.string().min(1),
  aggregateId: z.string().min(1),
  occurredAt: z.string().datetime(),
});

/**
 * Kitchen event payload schemas.
 */
export const KitchenTaskClaimedPayloadSchema = z.object({
  taskId: z.string().min(1),
  employeeId: z.string().min(1),
  claimedAt: z.string().datetime(),
});

export const KitchenTaskReleasedPayloadSchema = z.object({
  taskId: z.string().min(1),
  employeeId: z.string().min(1),
  releasedAt: z.string().datetime(),
});

export const KitchenTaskProgressPayloadSchema = z.object({
  taskId: z.string().min(1),
  employeeId: z.string().min(1),
  progressPercent: z.number().int().min(0).max(100),
  updatedAt: z.string().datetime(),
});

/**
 * Full event schemas with discriminator.
 */
export const KitchenTaskClaimedEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("kitchen.task.claimed"),
  payload: KitchenTaskClaimedPayloadSchema,
});

export const KitchenTaskReleasedEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("kitchen.task.released"),
  payload: KitchenTaskReleasedPayloadSchema,
});

export const KitchenTaskProgressEventSchema = RealtimeEventBaseSchema.extend({
  eventType: z.literal("kitchen.task.progress"),
  payload: KitchenTaskProgressPayloadSchema,
});

/**
 * Discriminated union of all event schemas.
 * Use this for validating unknown realtime events.
 */
export const RealtimeEventSchema = z.discriminatedUnion("eventType", [
  KitchenTaskClaimedEventSchema,
  KitchenTaskReleasedEventSchema,
  KitchenTaskProgressEventSchema,
]);

/**
 * Parse and validate a realtime event.
 *
 * @param data - Unknown data to validate
 * @returns Zod parse result with success status and typed data
 */
export function parseRealtimeEvent(data: unknown) {
  return RealtimeEventSchema.safeParse(data);
}

/**
 * Type guard for kitchen events.
 */
export function isKitchenEvent(data: unknown): data is z.infer<typeof RealtimeEventSchema> {
  const result = parseRealtimeEvent(data);
  return result.success;
}
