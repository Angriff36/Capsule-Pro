// Soft-delete a vendor
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { vendorId } = await request.json();
    if (!vendorId) return manifestErrorResponse("vendorId is required", 400);

    // Check for active purchase orders referencing this vendor
    const activePOs = await database.$queryRaw`
      SELECT COUNT(*)::int as count FROM tenant_inventory.purchase_orders
      WHERE tenant_id = ${tenantId}::uuid AND vendor_id = ${vendorId}::uuid
        AND deleted_at IS NULL AND status NOT IN ('received', 'cancelled')
    `;
    const poCount = (activePOs as any[])[0]?.count || 0;
    if (poCount > 0) {
      return manifestErrorResponse(
        `Cannot delete vendor with ${poCount} active purchase order(s)`,
        400
      );
    }

    const result = await database.$queryRaw`
      UPDATE tenant_inventory.inventory_suppliers
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${vendorId}::uuid AND deleted_at IS NULL
      RETURNING id, supplier_number, name
    `;

    if (!(result as any[]).length)
      return manifestErrorResponse("Vendor not found", 404);

    return manifestSuccessResponse({ vendor: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    console.error("Error deleting vendor:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
