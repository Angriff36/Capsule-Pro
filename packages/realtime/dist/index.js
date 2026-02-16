"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Channel naming utilities
__exportStar(require("./channels/index"), exports);
// Vector clocks for causality tracking
__exportStar(require("./clocks/index"), exports);
// Event types and schemas
__exportStar(require("./events/index"), exports);
// Outbox helpers
__exportStar(require("./outbox/index"), exports);
// Replay system
__exportStar(require("./replay/index"), exports);
