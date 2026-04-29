// Get single vendor with contacts and latest ratings
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const { id } = await params;

    const vendor = await database.inventorySupplier.findFirst({
      where: { tenantId, id, deletedAt: null },
      include: {
        vendorContacts: {
          where: { deletedAt: null },
          orderBy: [{ isPrimary: "desc" }, { contactName: "asc" }],
        },
        vendorRatings: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!vendor) return manifestErrorResponse("Vendor not found", 404);

    // Count active catalog items (separate query — no relation on InventorySupplier)
    const catalogItemCount = await database.vendorCatalog.count({
      where: { tenantId, supplierId: id, deletedAt: null, isActive: true },
    });

    return manifestSuccessResponse({
      vendor,
      contacts: vendor.vendorContacts,
      ratings: vendor.vendorRatings,
      catalogItemCount,
    });
  } catch (error) {
    captureException(error);
    console.error("Error fetching vendor:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
