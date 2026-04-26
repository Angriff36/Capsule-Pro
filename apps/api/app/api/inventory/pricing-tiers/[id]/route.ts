// Auto-generated Next.js API detail route for PricingTier
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const pricingTier = await database.pricingTier.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!pricingTier) {
      return manifestErrorResponse("PricingTier not found", 404);
    }

    return manifestSuccessResponse({ pricingTier });
  } catch (error) {
    console.error("Error fetching pricingTier:", error);
    const { captureException } = await import("@sentry/nextjs");
    captureException(error, {
      tags: { route: "pricingtier/detail", errorType: "detail_query" },
    });
    return manifestErrorResponse("Internal server error", 500);
  }
}
