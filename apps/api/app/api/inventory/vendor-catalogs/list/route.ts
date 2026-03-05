// Auto-generated Next.js API route for VendorCatalog
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
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
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const categoryId = searchParams.get("category");

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (categoryId) {
      where.category = categoryId;
    }

    const vendorCatalogs = await database.vendorCatalog.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            supplierNumber: true,
          },
        },
        pricingTiers: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: {
            minQuantity: "asc",
          },
        },
        bulkOrderRules: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: {
            priority: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return manifestSuccessResponse({ vendorCatalogs });
  } catch (error) {
    console.error("Error fetching vendorCatalogs:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
