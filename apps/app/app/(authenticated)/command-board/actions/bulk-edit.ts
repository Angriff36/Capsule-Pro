"use server";

import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "../../../lib/tenant";
import type { EntityType } from "../types/entities";
import {
  BULK_EDITABLE_PROPERTIES,
  getPriorityLabel,
  PRIORITY_LEVELS,
} from "./bulk-edit-utils";

// ============================================================================
// Types
// ============================================================================

export interface BulkEditItem {
  entityType: EntityType;
  entityId: string;
  /** The projection ID for undo tracking */
  projectionId: string;
}

export interface BulkEditChanges {
  status?: string;
  /** Priority as string label (low, medium, high, urgent) - will be converted to number */
  priority?: string;
  assignedTo?: string | null;
}

export interface BulkEditPreview {
  items: Array<{
    entityType: EntityType;
    entityId: string;
    entityTitle: string;
    currentValue: string;
    newValue: string;
    fieldName: string;
  }>;
  warnings: string[];
}

export interface BulkEditResult {
  success: boolean;
  updatedCount: number;
  errors: Array<{ entityId: string; error: string }>;
  /** Snapshot of original values for undo */
  undoSnapshot: Array<{
    entityType: EntityType;
    entityId: string;
    changes: Record<string, unknown>;
  }>;
}

// ============================================================================
// Preview
// ============================================================================

/**
 * Generate a preview of what will change in a bulk edit operation.
 * Shows current vs new values for each affected entity.
 */
export async function getBulkEditPreview(
  items: BulkEditItem[],
  changes: BulkEditChanges
): Promise<BulkEditPreview> {
  const tenantId = await requireTenantId();
  const preview: BulkEditPreview["items"] = [];
  const warnings: string[] = [];

  // Group items by entity type for efficient querying
  const byType = new Map<EntityType, BulkEditItem[]>();
  for (const item of items) {
    const list = byType.get(item.entityType) ?? [];
    list.push(item);
    byType.set(item.entityType, list);
  }

  // Convert priority string to number for comparison
  const newPriorityValue = changes.priority
    ? (PRIORITY_LEVELS[changes.priority] ?? null)
    : undefined;

  // Fetch current values for each entity type
  for (const [entityType, entityItems] of byType) {
    const entityIds = entityItems.map((i) => i.entityId);
    const editableProps = BULK_EDITABLE_PROPERTIES[entityType] ?? [];

    if (editableProps.length === 0) {
      warnings.push(`${entityType} entities cannot be bulk edited`);
      continue;
    }

    // Check which properties in changes are actually editable for this type
    const requestedChanges = Object.keys(changes).filter((k) =>
      editableProps.includes(k)
    );
    if (requestedChanges.length === 0) {
      continue;
    }

    switch (entityType) {
      case "event": {
        const entities = await database.event.findMany({
          where: { tenantId, id: { in: entityIds } },
          select: { id: true, title: true, status: true, assignedTo: true },
        });
        for (const entity of entities) {
          if (changes.status && entity.status !== changes.status) {
            preview.push({
              entityType,
              entityId: entity.id,
              entityTitle: entity.title,
              currentValue: entity.status,
              newValue: changes.status,
              fieldName: "status",
            });
          }
          if (
            changes.assignedTo !== undefined &&
            entity.assignedTo !== changes.assignedTo
          ) {
            preview.push({
              entityType,
              entityId: entity.id,
              entityTitle: entity.title,
              currentValue: entity.assignedTo ?? "Unassigned",
              newValue: changes.assignedTo ?? "Unassigned",
              fieldName: "assignedTo",
            });
          }
        }
        break;
      }

      case "prep_task": {
        const entities = await database.prepTask.findMany({
          where: { tenantId, id: { in: entityIds } },
          select: {
            id: true,
            name: true,
            status: true,
            priority: true,
          },
        });
        for (const entity of entities) {
          if (changes.status && entity.status !== changes.status) {
            preview.push({
              entityType,
              entityId: entity.id,
              entityTitle: entity.name,
              currentValue: entity.status,
              newValue: changes.status,
              fieldName: "status",
            });
          }
          if (
            newPriorityValue !== undefined &&
            entity.priority !== newPriorityValue
          ) {
            preview.push({
              entityType,
              entityId: entity.id,
              entityTitle: entity.name,
              currentValue: getPriorityLabel(entity.priority),
              newValue: changes.priority ?? "none",
              fieldName: "priority",
            });
          }
        }
        break;
      }

      case "kitchen_task": {
        const entities = await database.kitchenTask.findMany({
          where: { tenantId, id: { in: entityIds } },
          select: { id: true, title: true, status: true, priority: true },
        });
        for (const entity of entities) {
          if (changes.status && entity.status !== changes.status) {
            preview.push({
              entityType,
              entityId: entity.id,
              entityTitle: entity.title,
              currentValue: entity.status,
              newValue: changes.status,
              fieldName: "status",
            });
          }
          if (
            newPriorityValue !== undefined &&
            entity.priority !== newPriorityValue
          ) {
            preview.push({
              entityType,
              entityId: entity.id,
              entityTitle: entity.title,
              currentValue: getPriorityLabel(entity.priority),
              newValue: changes.priority ?? "none",
              fieldName: "priority",
            });
          }
        }
        break;
      }

      case "proposal": {
        const entities = await database.proposal.findMany({
          where: { tenantId, id: { in: entityIds } },
          select: { id: true, title: true, status: true },
        });
        for (const entity of entities) {
          if (changes.status && entity.status !== changes.status) {
            preview.push({
              entityType,
              entityId: entity.id,
              entityTitle: entity.title,
              currentValue: entity.status,
              newValue: changes.status,
              fieldName: "status",
            });
          }
        }
        break;
      }

      case "shipment": {
        const entities = await database.shipment.findMany({
          where: { tenantId, id: { in: entityIds } },
          select: { id: true, shipmentNumber: true, status: true },
        });
        for (const entity of entities) {
          if (changes.status && entity.status !== changes.status) {
            preview.push({
              entityType,
              entityId: entity.id,
              entityTitle: entity.shipmentNumber ?? entity.id,
              currentValue: entity.status,
              newValue: changes.status,
              fieldName: "status",
            });
          }
        }
        break;
      }
    }
  }

  return { items: preview, warnings };
}

// ============================================================================
// Execute Bulk Edit
// ============================================================================

/**
 * Execute a bulk edit operation across multiple entities.
 * Updates all entities in a transaction and returns undo information.
 */
export async function executeBulkEdit(
  items: BulkEditItem[],
  changes: BulkEditChanges
): Promise<BulkEditResult> {
  const tenantId = await requireTenantId();
  const errors: BulkEditResult["errors"] = [];
  const undoSnapshot: BulkEditResult["undoSnapshot"] = [];
  let updatedCount = 0;

  // Group items by entity type
  const byType = new Map<EntityType, BulkEditItem[]>();
  for (const item of items) {
    const list = byType.get(item.entityType) ?? [];
    list.push(item);
    byType.set(item.entityType, list);
  }

  // Convert priority string to number
  const priorityValue = changes.priority
    ? (PRIORITY_LEVELS[changes.priority] ?? undefined)
    : undefined;

  // Process each entity type in a transaction
  await database.$transaction(async (tx) => {
    for (const [entityType, entityItems] of byType) {
      const entityIds = entityItems.map((i) => i.entityId);
      const editableProps = BULK_EDITABLE_PROPERTIES[entityType] ?? [];

      // Filter changes to only include editable properties for this type
      // Also convert priority to number for task entities
      const filteredChanges: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(changes)) {
        if (key === "priority" && editableProps.includes("priority")) {
          // Convert priority string to number
          if (priorityValue !== undefined) {
            filteredChanges.priority = priorityValue;
          }
        } else if (editableProps.includes(key) && value !== undefined) {
          filteredChanges[key] = value;
        }
      }

      if (Object.keys(filteredChanges).length === 0) {
        continue;
      }

      try {
        switch (entityType) {
          case "event": {
            // Fetch current values for undo
            const current = await tx.event.findMany({
              where: { tenantId, id: { in: entityIds } },
              select: { id: true, status: true, assignedTo: true },
            });

            // Store undo snapshot
            for (const e of current) {
              undoSnapshot.push({
                entityType,
                entityId: e.id,
                changes: {
                  status: e.status,
                  assignedTo: e.assignedTo,
                },
              });
            }

            // Update all
            const result = await tx.event.updateMany({
              where: { tenantId, id: { in: entityIds } },
              data: filteredChanges,
            });
            updatedCount += result.count;
            break;
          }

          case "prep_task": {
            const current = await tx.prepTask.findMany({
              where: { tenantId, id: { in: entityIds } },
              select: { id: true, status: true, priority: true },
            });

            for (const e of current) {
              undoSnapshot.push({
                entityType,
                entityId: e.id,
                changes: {
                  status: e.status,
                  priority: e.priority,
                },
              });
            }

            const result = await tx.prepTask.updateMany({
              where: { tenantId, id: { in: entityIds } },
              data: filteredChanges,
            });
            updatedCount += result.count;
            break;
          }

          case "kitchen_task": {
            const current = await tx.kitchenTask.findMany({
              where: { tenantId, id: { in: entityIds } },
              select: { id: true, status: true, priority: true },
            });

            for (const e of current) {
              undoSnapshot.push({
                entityType,
                entityId: e.id,
                changes: {
                  status: e.status,
                  priority: e.priority,
                },
              });
            }

            const result = await tx.kitchenTask.updateMany({
              where: { tenantId, id: { in: entityIds } },
              data: filteredChanges,
            });
            updatedCount += result.count;
            break;
          }

          case "proposal": {
            const current = await tx.proposal.findMany({
              where: { tenantId, id: { in: entityIds } },
              select: { id: true, status: true },
            });

            for (const e of current) {
              undoSnapshot.push({
                entityType,
                entityId: e.id,
                changes: { status: e.status },
              });
            }

            const result = await tx.proposal.updateMany({
              where: { tenantId, id: { in: entityIds } },
              data: filteredChanges,
            });
            updatedCount += result.count;
            break;
          }

          case "shipment": {
            const current = await tx.shipment.findMany({
              where: { tenantId, id: { in: entityIds } },
              select: { id: true, status: true },
            });

            for (const e of current) {
              undoSnapshot.push({
                entityType,
                entityId: e.id,
                changes: { status: e.status },
              });
            }

            const result = await tx.shipment.updateMany({
              where: { tenantId, id: { in: entityIds } },
              data: filteredChanges,
            });
            updatedCount += result.count;
            break;
          }

          default:
            // Non-editable entity type
            for (const entityId of entityIds) {
              errors.push({
                entityId,
                error: `${entityType} entities cannot be bulk edited`,
              });
            }
        }
      } catch (error) {
        for (const entityId of entityIds) {
          errors.push({
            entityId,
            error: error instanceof Error ? error.message : "Update failed",
          });
        }
      }
    }
  });

  // Revalidate command board pages
  revalidatePath("/command-board/[boardId]");

  return {
    success: errors.length === 0,
    updatedCount,
    errors,
    undoSnapshot,
  };
}

// ============================================================================
// Undo Bulk Edit
// ============================================================================

/**
 * Undo a bulk edit operation by restoring original values.
 */
export async function undoBulkEdit(
  undoSnapshot: BulkEditResult["undoSnapshot"]
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await requireTenantId();

  try {
    await database.$transaction(async (tx) => {
      // Group by entity type for efficient updates
      const byType = new Map<EntityType, BulkEditResult["undoSnapshot"]>();
      for (const item of undoSnapshot) {
        const list = byType.get(item.entityType) ?? [];
        list.push(item);
        byType.set(item.entityType, list);
      }

      for (const [entityType, items] of byType) {
        for (const item of items) {
          const modelMap: Partial<Record<EntityType, string>> = {
            event: "event",
            prep_task: "prepTask",
            kitchen_task: "kitchenTask",
            proposal: "proposal",
            shipment: "shipment",
          };

          const modelName = modelMap[entityType];
          if (!modelName) {
            continue;
          }

          // Use dynamic model access
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const model = (tx as Record<string, any>)[modelName];
          if (!model) {
            continue;
          }

          await model.update({
            where: { tenantId_id: { tenantId, id: item.entityId } },
            data: item.changes,
          });
        }
      }
    });

    revalidatePath("/command-board/[boardId]");
    return { success: true };
  } catch (error) {
    console.error("[undoBulkEdit] Failed to undo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Undo failed",
    };
  }
}
