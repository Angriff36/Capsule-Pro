// Auto-generated Next.js API detail route for EventProfitability
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@repo/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { auth } from "@repo/auth/server";

export async function GET(
  request: NextRequest,
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

    const eventProfitability = await database.eventProfitability.findUnique({
      where: {
        id,
        tenantId,
        deletedAt: null
      },
    });

    if (!eventProfitability) {
      return manifestErrorResponse("EventProfitability not found", 404);
    }

    return manifestSuccessResponse({ eventProfitability });
  } catch (error) {
    console.error("Error fetching eventProfitability:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
