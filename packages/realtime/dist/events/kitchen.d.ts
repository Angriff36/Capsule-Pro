/**
 * Kitchen domain realtime events.
 * These events represent state changes in kitchen operations.
 */
import type { RealtimeEventBase } from "./envelope.js";
/**
 * Emitted when a kitchen task is claimed by an employee.
 */
export interface KitchenTaskClaimedEvent extends RealtimeEventBase {
  eventType: "kitchen.task.claimed";
  payload: {
    /** Task identifier */
    taskId: string;
    /** Employee who claimed the task */
    employeeId: string;
    /** ISO 8601 timestamp of claim */
    claimedAt: string;
  };
}
/**
 * Emitted when a kitchen task is released (unclaimed).
 */
export interface KitchenTaskReleasedEvent extends RealtimeEventBase {
  eventType: "kitchen.task.released";
  payload: {
    /** Task identifier */
    taskId: string;
    /** Employee who released the task */
    employeeId: string;
    /** ISO 8601 timestamp of release */
    releasedAt: string;
  };
}
/**
 * Emitted when task progress is updated.
 */
export interface KitchenTaskProgressEvent extends RealtimeEventBase {
  eventType: "kitchen.task.progress";
  payload: {
    /** Task identifier */
    taskId: string;
    /** Employee updating progress */
    employeeId: string;
    /** Progress percentage (0-100) */
    progressPercent: number;
    /** ISO 8601 timestamp of update */
    updatedAt: string;
  };
}
/** Union type of all kitchen events */
export type KitchenEvent =
  | KitchenTaskClaimedEvent
  | KitchenTaskReleasedEvent
  | KitchenTaskProgressEvent;
//# sourceMappingURL=kitchen.d.ts.map
