/**
 * Bulk Edit Utilities
 *
 * Client-side utilities for bulk edit operations
 */

import type { EntityType } from "../types/entities";

// ============================================================================
// Types
// ============================================================================

/** Properties that can be bulk edited, keyed by entity type */
export const BULK_EDITABLE_PROPERTIES: Record<EntityType, string[]> = {
  event: ["status", "assignedTo"],
  prep_task: ["status", "priority"],
  kitchen_task: ["status", "priority"],
  client: [],
  employee: [],
  inventory_item: [],
  recipe: [],
  dish: [],
  proposal: ["status"],
  shipment: ["status"],
  note: [],
  risk: [], // Risk model doesn't exist in schema yet
  financial_projection: [],
};

/** Valid status values per entity type */
export const ENTITY_STATUS_OPTIONS: Record<string, string[]> = {
  event: ["draft", "tentative", "confirmed", "completed", "cancelled"],
  prep_task: ["pending", "in_progress", "completed", "cancelled"],
  kitchen_task: ["pending", "in_progress", "completed", "cancelled"],
  proposal: ["draft", "sent", "accepted", "rejected", "expired"],
  shipment: ["pending", "in_transit", "delivered", "cancelled"],
};

/** Priority levels with their numeric values */
export const PRIORITY_LEVELS: Record<string, number> = {
  low: 1,
  medium: 3,
  high: 5,
  urgent: 7,
};

/** Available priority options for UI */
export const PRIORITY_OPTIONS = Object.keys(PRIORITY_LEVELS);

/** Get priority label from numeric value */
export function getPriorityLabel(value: number | null): string {
  if (value === null) {
    return "none";
  }
  if (value <= 1) {
    return "low";
  }
  if (value <= 3) {
    return "medium";
  }
  if (value <= 5) {
    return "high";
  }
  return "urgent";
}
