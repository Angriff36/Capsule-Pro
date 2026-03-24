// Auto-generated Next.js API route for EventDish
// Generated from Manifest IR - DO NOT EDIT

import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse, manifestSuccessResponse } from "@/lib/manifest-response";
import { auth } from "@repo/auth/server";

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

const eventDishs = await database.event_dishes.findMany({
    where: {
        tenant_id: tenantId,
        deleted_at: null
      },
    orderBy: {
      created_at: "desc",
    },
  });

    return manifestSuccessResponse({ eventDishs });
  } catch (error) {
    console.error("Error fetching eventDishs:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
