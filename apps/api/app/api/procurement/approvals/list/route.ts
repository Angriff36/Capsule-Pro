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

    // Map frontend status to DB status
    // "pending" maps to "submitted" status
    const whereClause: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };
    if (status && status !== "all") {
      whereClause.status = status === "pending" ? "submitted" : status;
    }

    // Fetch POs with their items
    const orders = await database.purchaseOrder.findMany({
      where: whereClause,
      orderBy: [
        // Put 'submitted' status first
        { status: "asc" },
        { submittedAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      include: {
        items: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });

    // Batch-fetch vendor names
    const vendorIds = [
      ...new Set(orders.map((o) => o.vendorId).filter(Boolean)),
    ];
    const vendors = await database.inventorySupplier.findMany({
      where: { id: { in: vendorIds } },
      select: { id: true, name: true },
    });
    const vendorMap = new Map(vendors.map((v) => [v.id, v.name]));

    // Batch-fetch approval history for all POs
    const poIds = orders.map((o) => o.id);
    const approvalHistories = await database.approvalHistory.findMany({
      where: {
        entityType: "purchase_order",
        entityId: { in: poIds },
      },
      orderBy: { performedAt: "desc" },
    });

    // Group approval history by entity ID
    const historyByEntityId = new Map<string, typeof approvalHistories>();
    for (const ah of approvalHistories) {
      const list = historyByEntityId.get(ah.entityId) ?? [];
      list.push(ah);
      historyByEntityId.set(ah.entityId, list);
    }

    const ordersMapped = orders.map((po) => ({
      id: po.id,
      po_number: po.poNumber,
      vendor_id: po.vendorId,
      status: po.status,
      total: po.total.toNumber(),
      submitted_by: po.submittedBy,
      submitted_at: po.submittedAt,
      created_at: po.createdAt,
      vendor_name: vendorMap.get(po.vendorId) ?? null,
      item_count: po.items.length,
      approval_history: (historyByEntityId.get(po.id) ?? []).map((ah) => ({
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

    return manifestSuccessResponse({ orders: ordersMapped });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
