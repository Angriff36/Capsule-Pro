// Auto-generated Next.js API detail route for ClientInteraction
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { log } from "@repo/observability/log";

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

    const clientInteraction = await database.clientInteraction.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!clientInteraction) {
      return manifestErrorResponse("ClientInteraction not found", 404);
    }

    return manifestSuccessResponse({ clientInteraction });
  } catch (error) {
    log.error("Error fetching clientInteraction:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
