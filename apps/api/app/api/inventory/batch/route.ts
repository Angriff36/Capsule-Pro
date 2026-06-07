/**
 * Inventory Batch Operations API
 *
 * POST /api/inventory/batch - Batch update or delete inventory items
 *
 * Actions:
 *   { action: "update", ids: string[], updates: Partial<UpdateInventoryItemRequest> }
 *   { action: "delete", ids: string[] }
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

// Uses createManifestRuntime — requires Node.js runtime (not Edge)
export const runtime = "nodejs";
import type { FSAStatus, ItemCategory } from "../items/types";
import { FSA_STATUSES, ITEM_CATEGORIES } from "../items/types";

interface BatchUpdatePayload {
  action: "update";
  ids: string[];
  updates: {
    category?: ItemCategory;
    fsa_status?: FSAStatus;
    tags?: string[];
    unit_cost?: number;
    reorder_level?: number;
  };
}

interface BatchDeletePayload {
  action: "delete";
  ids: string[];
}

type BatchPayload = BatchUpdatePayload | BatchDeletePayload;

function isValidBatchPayload(body: unknown): body is BatchPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  if (b.action !== "update" && b.action !== "delete") return false;
  if (!Array.isArray(b.ids) || b.ids.length === 0) return false;
  if (typeof b.ids[0] !== "string") return false;
  if (b.action === "update") {
    const u = b.updates as Record<string, unknown> | undefined;
    if (!u || typeof u !== "object") return false;
  }
  return true;
}

/**
 * Validate category is a valid ItemCategory
 */
function isValidCategory(cat: unknown): cat is ItemCategory {
  return (
    typeof cat === "string" && ITEM_CATEGORIES.includes(cat as ItemCategory)
  );
}

/**
 * Validate fsa_status is a valid FSAStatus
 */
function isValidFSAStatus(status: unknown): status is FSAStatus {
  return (
    typeof status === "string" && FSA_STATUSES.includes(status as FSAStatus)
  );
}

/**
 * POST /api/inventory/batch
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (!isValidBatchPayload(body)) {
      return NextResponse.json(
        {
          message:
            "Invalid payload. Expected { action: 'update'|'delete', ids: string[], updates?: {...} }",
        },
        { status: 400 }
      );
    }

    const { ids } = body;

    // Verify all items exist and belong to tenant
    const existingItems = await database.inventoryItem.findMany({
      where: {
        tenantId,
        id: { in: ids },
        deletedAt: null,
      },
      select: { id: true },
    });

    const existingIds = new Set(existingItems.map((i) => i.id));
    const invalidIds = ids.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { message: `Items not found: ${invalidIds.join(", ")}` },
        { status: 404 }
      );
    }

    if (body.action === "delete") {
      // Soft-delete all items via governed Manifest runtime
      const user = await resolveCurrentUser(request);
      const userCtx = { id: user.id, tenantId: user.tenantId, role: user.role };
      let failCount = 0;

      for (const id of ids) {
        const result = await runManifestCommandCore(
          {
            createRuntime: ({ user: u, entityName }) =>
              createManifestRuntime({
                user: { id: u.id, tenantId: u.tenantId, role: u.role },
                entityName,
              }),
          },
          {
            entity: "InventoryItem",
            command: "softDelete",
            body: { id },
            instanceId: id,
            user: userCtx,
          }
        );
        if (!result.ok) failCount++;
      }

      if (failCount > 0) {
        return NextResponse.json(
          {
            message: `Failed to delete ${failCount} of ${ids.length} items`,
            deleted: ids.length - failCount,
          },
          { status: 207 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "delete",
        deleted: ids.length,
      });
    }

    if (body.action === "update") {
      const { updates } = body;

      // Validate updates
      if (updates.category && !isValidCategory(updates.category)) {
        return NextResponse.json(
          { message: `Invalid category: ${updates.category}` },
          { status: 400 }
        );
      }
      if (updates.fsa_status && !isValidFSAStatus(updates.fsa_status)) {
        return NextResponse.json(
          { message: `Invalid fsa_status: ${updates.fsa_status}` },
          { status: 400 }
        );
      }

      // Verify at least one update field was provided
      const hasUpdates =
        updates.category !== undefined ||
        updates.fsa_status !== undefined ||
        updates.tags !== undefined ||
        updates.unit_cost !== undefined ||
        updates.reorder_level !== undefined;
      if (!hasUpdates) {
        return NextResponse.json(
          { message: "No valid updates provided" },
          { status: 400 }
        );
      }

      // Batch update via governed Manifest runtime (one command per item)
      const user = await resolveCurrentUser(request);
      const userCtx = { id: user.id, tenantId: user.tenantId, role: user.role };
      const currentItems = await database.inventoryItem.findMany({
        where: { tenantId, id: { in: ids }, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          unitOfMeasure: true,
          unitCost: true,
          quantityOnHand: true,
          parLevel: true,
          reorder_level: true,
          supplierId: true,
          tags: true,
          fsa_status: true,
          fsa_temp_logged: true,
          fsa_allergen_info: true,
          fsa_traceable: true,
        },
      });

      let failCount = 0;
      for (const item of currentItems) {
        // Merge partial updates over current values
        const cmdBody: Record<string, unknown> = {
          id: item.id,
          name: item.name,
          description: item.description,
          category: updates.category !== undefined ? updates.category : item.category,
          unitOfMeasure: item.unitOfMeasure,
          unitCost: updates.unit_cost !== undefined ? updates.unit_cost : item.unitCost,
          quantityOnHand: item.quantityOnHand,
          parLevel: item.parLevel,
          reorder_level: updates.reorder_level !== undefined ? updates.reorder_level : item.reorder_level,
          supplierId: item.supplierId,
          tags: updates.tags !== undefined ? updates.tags.join(",") : item.tags,
          fsa_status: updates.fsa_status !== undefined ? updates.fsa_status : item.fsa_status,
          fsa_temp_logged: item.fsa_temp_logged,
          fsa_allergen_info: item.fsa_allergen_info,
          fsa_traceable: item.fsa_traceable,
        };

        const result = await runManifestCommandCore(
          {
            createRuntime: ({ user: u, entityName }) =>
              createManifestRuntime({
                user: { id: u.id, tenantId: u.tenantId, role: u.role },
                entityName,
              }),
          },
          {
            entity: "InventoryItem",
            command: "update",
            body: cmdBody,
            instanceId: item.id,
            user: userCtx,
          }
        );
        if (!result.ok) failCount++;
      }

      if (failCount > 0) {
        return NextResponse.json(
          {
            message: `Failed to update ${failCount} of ${ids.length} items`,
            updated: ids.length - failCount,
            updates,
          },
          { status: 207 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "update",
        updated: ids.length,
        updates,
      });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (error) {
    captureException(error);
    log.error("[InventoryBatch/POST] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
