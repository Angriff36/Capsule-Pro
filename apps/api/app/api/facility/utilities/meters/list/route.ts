// Auto-generated Next.js API route for UtilityMeter
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
    const status = searchParams.get("status");
    const locationId = searchParams.get("locationId");
    const spaceId = searchParams.get("spaceId");
    const meterType = searchParams.get("meterType");

    const meters = await database.utilityMeter.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(locationId && { locationId }),
        ...(spaceId && { spaceId }),
        ...(meterType && { meterType }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return manifestSuccessResponse({ meters });
  } catch (error) {
    console.error("Error fetching utility meters:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
