// Equipment routes are disabled - Equipment model does not exist in schema
// This route needs schema migration to add Equipment model

import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    // Equipment model does not exist in schema
    return manifestErrorResponse(
      "Equipment feature not implemented - missing model",
      501
    );
  } catch (error) {
    captureException(error);
    console.error("Error creating equipment:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
