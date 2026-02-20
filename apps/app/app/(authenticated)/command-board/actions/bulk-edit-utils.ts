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

// ============================================================================
// Shared Validation (used by both preview and execute)
// ============================================================================

export interface ValidationError {
  entityType: EntityType;
  entityId: string;
  field: string;
  message: string;
}

export interface BulkEditValidationResult {
  valid: boolean;
  errors: ValidationError[];
  /** Normalized changes with invalid values removed */
  normalizedChanges: BulkEditChanges;
}

export interface BulkEditChanges {
  status?: string;
  /** Priority as string label (low, medium, high, urgent) - will be converted to number */
  priority?: string;
  assignedTo?: string | null;
}

/**
 * Validate bulk edit changes for a specific entity type.
 * This function is shared between preview and execute to ensure consistent validation.
 *
 * @param entityType - The type of entity being edited
 * @param entityId - The specific entity ID (for error reporting)
 * @param changes - The proposed changes
 * @returns Validation result with any errors and normalized changes
 */
export function validateBulkEditChanges(
  entityType: EntityType,
  entityId: string,
  changes: BulkEditChanges
): BulkEditValidationResult {
  const errors: ValidationError[] = [];
  const normalizedChanges: BulkEditChanges = {};
  const editableProps = BULK_EDITABLE_PROPERTIES[entityType] ?? [];

  // Check if entity type supports bulk editing at all
  if (editableProps.length === 0) {
    return {
      valid: false,
      errors: [
        {
          entityType,
          entityId,
          field: "entityType",
          message: `${entityType} entities cannot be bulk edited`,
        },
      ],
      normalizedChanges: {},
    };
  }

  let valid = true;

  // Validate status
  if (changes.status !== undefined) {
    if (!editableProps.includes("status")) {
      errors.push({
        entityType,
        entityId,
        field: "status",
        message: `status cannot be edited for ${entityType} entities`,
      });
      valid = false;
    } else {
      const validStatuses = ENTITY_STATUS_OPTIONS[entityType] ?? [];
      if (!validStatuses.includes(changes.status)) {
        errors.push({
          entityType,
          entityId,
          field: "status",
          message: `Invalid status "${changes.status}". Valid values for ${entityType}: ${validStatuses.join(", ")}`,
        });
        valid = false;
      } else {
        normalizedChanges.status = changes.status;
      }
    }
  }

  // Validate priority
  if (changes.priority !== undefined) {
    if (!editableProps.includes("priority")) {
      errors.push({
        entityType,
        entityId,
        field: "priority",
        message: `priority cannot be edited for ${entityType} entities`,
      });
      valid = false;
    } else {
      const priorityValue = PRIORITY_LEVELS[changes.priority];
      if (priorityValue === undefined) {
        const validPriorities = Object.keys(PRIORITY_LEVELS);
        errors.push({
          entityType,
          entityId,
          field: "priority",
          message: `Invalid priority "${changes.priority}". Valid values: ${validPriorities.join(", ")}`,
        });
        valid = false;
      } else {
        normalizedChanges.priority = changes.priority;
      }
    }
  }

  // Validate assignedTo (just check it's editable for this entity type)
  // Note: Employee existence check happens server-side in bulk-edit.ts
  if (changes.assignedTo !== undefined) {
    if (!editableProps.includes("assignedTo")) {
      errors.push({
        entityType,
        entityId,
        field: "assignedTo",
        message: `assignedTo cannot be edited for ${entityType} entities`,
      });
      valid = false;
    } else {
      normalizedChanges.assignedTo = changes.assignedTo;
    }
  }

  return { valid, errors, normalizedChanges };
}

/**
 * Validate bulk edit changes across multiple entities.
 * Returns combined validation results.
 */
export function validateBulkEditBatch(
  items: Array<{ entityType: EntityType; entityId: string }>,
  changes: BulkEditChanges
): {
  valid: boolean;
  errors: ValidationError[];
  validItems: Array<{ entityType: EntityType; entityId: string }>;
} {
  const allErrors: ValidationError[] = [];
  const validItems: Array<{ entityType: EntityType; entityId: string }> = [];

  for (const item of items) {
    const result = validateBulkEditChanges(item.entityType, item.entityId, changes);
    if (result.valid && Object.keys(result.normalizedChanges).length > 0) {
      validItems.push(item);
    }
    allErrors.push(...result.errors);
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    validItems,
  };
}
