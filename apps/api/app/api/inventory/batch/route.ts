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
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
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
      // Soft-delete all items
      await database.inventoryItem.updateMany({
        where: {
          tenantId,
          id: { in: ids },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

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

      // Build update data dynamically, only including provided fields
      const data: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (updates.category !== undefined) data.category = updates.category;
      if (updates.fsa_status !== undefined)
        data.fsa_status = updates.fsa_status;
      if (updates.tags !== undefined) data.tags = updates.tags;
      if (updates.unit_cost !== undefined) data.unitCost = updates.unit_cost;
      if (updates.reorder_level !== undefined)
        data.reorder_level = updates.reorder_level;

      if (Object.keys(data).length === 1) {
        return NextResponse.json(
          { message: "No valid updates provided" },
          { status: 400 }
        );
      }

      await database.inventoryItem.updateMany({
        where: {
          tenantId,
          id: { in: ids },
          deletedAt: null,
        },
        data,
      });

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
