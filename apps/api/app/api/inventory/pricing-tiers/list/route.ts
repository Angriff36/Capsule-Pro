// Auto-generated Next.js API route for PricingTier
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
    const catalogEntryId = searchParams.get("catalogEntryId");

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (catalogEntryId) {
      where.catalogEntryId = catalogEntryId;
    }

    const pricingTiers = await database.pricingTier.findMany({
      where,
      include: {
        catalogEntry: {
          select: {
            id: true,
            itemNumber: true,
            itemName: true,
          },
        },
      },
      orderBy: {
        minQuantity: "asc",
      },
    });

    return manifestSuccessResponse({ pricingTiers });
  } catch (error) {
    console.error("Error fetching pricingTiers:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
