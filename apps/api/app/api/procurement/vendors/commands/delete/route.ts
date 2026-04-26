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
    const poCount = await database.purchaseOrder.count({
      where: {
        tenantId,
        vendorId,
        deletedAt: null,
        status: { notIn: ["received", "cancelled"] },
      },
    });
    if (poCount > 0) {
      return manifestErrorResponse(
        `Cannot delete vendor with ${poCount} active purchase order(s)`,
        400
      );
    }

    const vendor = await database.inventorySupplier.updateMany({
      where: { tenantId, id: vendorId, deletedAt: null },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });

    if (!vendor.count)
      return manifestErrorResponse("Vendor not found", 404);

    // Fetch the updated record for the response
    const updated = await database.inventorySupplier.findFirst({
      where: { tenantId, id: vendorId },
      select: { id: true, supplier_number: true, name: true },
    });

    return manifestSuccessResponse({ vendor: updated });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
