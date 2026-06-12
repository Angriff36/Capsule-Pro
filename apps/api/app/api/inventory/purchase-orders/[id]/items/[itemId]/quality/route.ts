/**
 * Update Purchase Order Item Quality Status
 *
 * PUT    /api/inventory/purchase-orders/[id]/items/[itemId]/quality      - Update quality status for an item
 */

import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * PUT /api/inventory/purchase-orders/[id]/items/[itemId]/quality - Update quality status via manifest runtime
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id, itemId } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "PurchaseOrderItem",
    command: "update",
    body: {
      ...rawBody,
      id: itemId,
      purchaseOrderId: id,
      tenantId: user.tenantId,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
