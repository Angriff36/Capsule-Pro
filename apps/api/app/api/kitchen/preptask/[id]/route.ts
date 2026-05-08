// Auto-generated Next.js API route for PrepTask
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
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
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const prepTasks = await database.prepTask.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!prepTasks) {
      return manifestErrorResponse("Not found", 404);
    }

    return manifestSuccessResponse({ prepTasks });
  } catch (error) {
    log.error("Error fetching prepTasks:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
