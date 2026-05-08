// Auto-generated Next.js API detail route for ClientPreference
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
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
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const clientPreference = await database.clientPreference.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!clientPreference) {
      return manifestErrorResponse("ClientPreference not found", 404);
    }

    return manifestSuccessResponse({ clientPreference });
  } catch (error) {
    log.error("Error fetching clientPreference:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
