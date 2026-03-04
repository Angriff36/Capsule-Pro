"use server";

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { EntityType } from "../types/entities";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";
import { withRetry, isRetryableError } from "../lib/retry-utils";

// ============================================================================
// Entity Update Action — Generic update handler for all entity types
// ============================================================================

interface UpdateEntityParams {
  entityType: EntityType;
  entityId: string;
  field: string;
  value: string | number | null;
}

interface UpdateEntityResult {
  success: boolean;
  error?: string;
}

/**
 * Update an entity field via the Manifest runtime.
 *
 * Routes updates to the correct entity command:
 * - event → Event.update command
 * - prep_task → PrepTask.update{Field} commands
 * - kitchen_task → KitchenTask.update{Field} commands
 * - client → Client.update command
 */
export async function updateEntity(
  params: UpdateEntityParams
): Promise<UpdateEntityResult> {
  const { entityType, entityId, field, value } = params;

  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return { success: false, error: "Unauthorized" };
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return { success: false, error: "Tenant not found" };
    }

    // Resolve internal user from Clerk auth
    const currentUser = await withRetry(
      () =>
        database.user.findFirst({
          where: {
            AND: [{ tenantId }, { authUserId: clerkId }],
          },
        }),
      { maxRetries: 1, delayMs: 2000 }
    );

    if (!currentUser) {
      return { success: false, error: "User not found in database" };
    }

    // Map entity types to their update handlers
    switch (entityType) {
      case "event": {
        // Events use a generic update command via Manifest runtime
        const runtime = await createManifestRuntime({
          user: { id: currentUser.id, tenantId, role: currentUser.role },
          entityName: "Event",
        });

        const result = await runtime.runCommand(
          "update",
          {
            id: entityId,
            [field]: value,
          },
          { entityName: "Event" }
        );

        if (!result.success) {
          if (result.policyDenial) {
            return {
              success: false,
              error: `Access denied: ${result.policyDenial.policyName}`,
            };
          }
          if (result.guardFailure) {
            return {
              success: false,
              error: `Validation failed: ${result.guardFailure.formatted}`,
            };
          }
          return { success: false, error: result.error ?? "Failed to update" };
        }

        return { success: true };
      }

      case "prep_task": {
        // Prep tasks use specific update commands
        const commandMap: Record<string, string> = {
          name: "updateName",
          status: "updateStatus",
          priority: "updatePriority",
          dueByDate: "updateDueDate",
          notes: "updateNotes",
        };

        const command = commandMap[field];
        if (!command) {
          return {
            success: false,
            error: `Field "${field}" is not editable for prep tasks`,
          };
        }

        const runtime = await createManifestRuntime({
          user: { id: currentUser.id, tenantId, role: currentUser.role },
          entityName: "PrepTask",
        });

        // Map value for specific fields
        let commandValue = value;
        if (field === "priority" && typeof value === "string") {
          // Convert string priority to number
          const priorityMap: Record<string, number> = {
            high: 3,
            medium: 2,
            low: 1,
          };
          commandValue = priorityMap[value] ?? 2;
        }

        const result = await runtime.runCommand(
          command,
          {
            id: entityId,
            [field]: commandValue,
          },
          { entityName: "PrepTask" }
        );

        if (!result.success) {
          if (result.policyDenial) {
            return {
              success: false,
              error: `Access denied: ${result.policyDenial.policyName}`,
            };
          }
          if (result.guardFailure) {
            return {
              success: false,
              error: `Validation failed: ${result.guardFailure.formatted}`,
            };
          }
          return { success: false, error: result.error ?? "Failed to update" };
        }

        return { success: true };
      }

      case "kitchen_task": {
        // Kitchen tasks use specific update commands
        const commandMap: Record<string, string> = {
          title: "updateTitle",
          status: "updateStatus",
          priority: "updatePriority",
          dueDate: "updateDueDate",
          notes: "updateNotes",
        };

        const command = commandMap[field];
        if (!command) {
          return {
            success: false,
            error: `Field "${field}" is not editable for kitchen tasks`,
          };
        }

        const runtime = await createManifestRuntime({
          user: { id: currentUser.id, tenantId, role: currentUser.role },
          entityName: "KitchenTask",
        });

        // Map value for specific fields
        let commandValue = value;
        if (field === "priority" && typeof value === "string") {
          const priorityMap: Record<string, number> = {
            high: 3,
            medium: 2,
            low: 1,
          };
          commandValue = priorityMap[value] ?? 2;
        }

        const result = await runtime.runCommand(
          command,
          {
            id: entityId,
            [field]: commandValue,
          },
          { entityName: "KitchenTask" }
        );

        if (!result.success) {
          if (result.policyDenial) {
            return {
              success: false,
              error: `Access denied: ${result.policyDenial.policyName}`,
            };
          }
          if (result.guardFailure) {
            return {
              success: false,
              error: `Validation failed: ${result.guardFailure.formatted}`,
            };
          }
          return { success: false, error: result.error ?? "Failed to update" };
        }

        return { success: true };
      }

      case "client": {
        // Clients use a generic update command
        const runtime = await createManifestRuntime({
          user: { id: currentUser.id, tenantId, role: currentUser.role },
          entityName: "Client",
        });

        const result = await runtime.runCommand(
          "update",
          {
            id: entityId,
            [field]: value,
          },
          { entityName: "Client" }
        );

        if (!result.success) {
          if (result.policyDenial) {
            return {
              success: false,
              error: `Access denied: ${result.policyDenial.policyName}`,
            };
          }
          if (result.guardFailure) {
            return {
              success: false,
              error: `Validation failed: ${result.guardFailure.formatted}`,
            };
          }
          return { success: false, error: result.error ?? "Failed to update" };
        }

        return { success: true };
      }

      case "inventory_item": {
        // Inventory items use a generic update command
        const runtime = await createManifestRuntime({
          user: { id: currentUser.id, tenantId, role: currentUser.role },
          entityName: "InventoryItem",
        });

        const result = await runtime.runCommand(
          "update",
          {
            id: entityId,
            [field]: value,
          },
          { entityName: "InventoryItem" }
        );

        if (!result.success) {
          if (result.policyDenial) {
            return {
              success: false,
              error: `Access denied: ${result.policyDenial.policyName}`,
            };
          }
          if (result.guardFailure) {
            return {
              success: false,
              error: `Validation failed: ${result.guardFailure.formatted}`,
            };
          }
          return { success: false, error: result.error ?? "Failed to update" };
        }

        return { success: true };
      }

      case "note": {
        // Notes use a generic update command
        const runtime = await createManifestRuntime({
          user: { id: currentUser.id, tenantId, role: currentUser.role },
          entityName: "Note",
        });

        const result = await runtime.runCommand(
          "update",
          {
            id: entityId,
            [field]: value,
          },
          { entityName: "Note" }
        );

        if (!result.success) {
          if (result.policyDenial) {
            return {
              success: false,
              error: `Access denied: ${result.policyDenial.policyName}`,
            };
          }
          if (result.guardFailure) {
            return {
              success: false,
              error: `Validation failed: ${result.guardFailure.formatted}`,
            };
          }
          return { success: false, error: result.error ?? "Failed to update" };
        }

        return { success: true };
      }

      case "employee":
      case "recipe":
      case "dish":
      case "proposal":
      case "shipment":
      case "risk":
      case "financial_projection":
        // These entity types are not editable from the board (read-only)
        return {
          success: false,
          error: `${entityType} entities are not editable from the command board`,
        };

      default: {
        // TypeScript exhaustiveness check
        const _exhaustive: never = entityType;
        return {
          success: false,
          error: `Unknown entity type: ${_exhaustive}`,
        };
      }
    }
  } catch (error) {
    console.error(`[updateEntity] Error updating ${entityType}.${field}:`, error);
    captureException(error);

    // Provide more helpful error messages for common failure types
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    // Check if this was a retryable error that exhausted retries
    if (isRetryableError(error)) {
      return {
        success: false,
        error: `Network error: ${errorMessage}. Please try again.`,
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
