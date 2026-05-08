// Auto-generated Next.js API detail route for CommandBoardLayout
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

    const commandBoardLayout = await database.commandBoardLayout.findUnique({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!commandBoardLayout) {
      return manifestErrorResponse("CommandBoardLayout not found", 404);
    }

    return manifestSuccessResponse({ commandBoardLayout });
  } catch (error) {
    log.error("Error fetching commandBoardLayout:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
