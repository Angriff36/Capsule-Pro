/**
 * Update Purchase Order Item Quality Status
 *
 * PUT    /api/inventory/purchase-orders/[id]/items/[itemId]/quality      - Update quality status for an item
 */

import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quality - Update quality status via manifest runtime
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id, itemId } = await context.params;
  return executeManifestCommand(request, {
    entityName: "PurchaseOrderItem",
    commandName: "update",
    params: { id: itemId, purchaseOrderId: id },
    transformBody: (body, ctx) => ({
      ...body,
      id: itemId,
      purchaseOrderId: id,
      tenantId: ctx.tenantId,
    }),
  });
}
