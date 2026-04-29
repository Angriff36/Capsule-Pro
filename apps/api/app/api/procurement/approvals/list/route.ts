// List purchase orders needing approval with approval history
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    // Build where clause — "pending" maps to "submitted" status
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (status && status !== "all") {
      where.status = status === "pending" ? "submitted" : status;
    }

    // Fetch POs with item count
    const orders = await database.purchaseOrder.findMany({
      where,
      include: {
        items: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
      orderBy: [
        { status: "asc" },
        { submittedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    if (orders.length === 0) {
      return manifestSuccessResponse({ orders: [] });
    }

    // Fetch vendor names for these POs
    const vendorIds = [...new Set(orders.map((o) => o.vendorId))];
    const vendors = await database.inventorySupplier.findMany({
      where: {
        id: { in: vendorIds },
        tenantId,
      },
      select: { id: true, name: true },
    });
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

    // Fetch approval history for these POs
    const orderIds = orders.map((o) => o.id);
    const approvalHistory = await database.approvalHistory.findMany({
      where: {
        entityType: "purchase_order",
        entityId: { in: orderIds },
      },
      orderBy: { performedAt: "desc" },
    });

    // Group approval history by entity ID
    const historyByEntity = new Map<string, typeof approvalHistory>();
    for (const entry of approvalHistory) {
      const list = historyByEntity.get(entry.entityId) ?? [];
      list.push(entry);
      historyByEntity.set(entry.entityId, list);
    }

    // Combine into response shape matching the original raw SQL output
    const result = orders.map((po) => ({
      id: po.id,
      po_number: po.poNumber,
      vendor_id: po.vendorId,
      status: po.status,
      total: po.total,
      submitted_by: po.submittedBy,
      submitted_at: po.submittedAt,
      created_at: po.createdAt,
      vendor_name: vendorMap.get(po.vendorId) ?? null,
      item_count: po.items.length,
      approval_history: (historyByEntity.get(po.id) ?? []).map((ah) => ({
        id: ah.id,
        entityType: ah.entityType,
        entityId: ah.entityId,
        action: ah.action,
        performedBy: ah.performedBy,
        performedAt: ah.performedAt,
        previousStatus: ah.previousStatus,
        newStatus: ah.newStatus,
        notes: ah.notes,
        metadata: ah.metadata,
      })),
    }));

    return manifestSuccessResponse({ orders: result });
  } catch (error) {
    captureException(error);
    console.error("Error listing approval orders:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
