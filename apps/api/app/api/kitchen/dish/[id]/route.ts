// Auto-generated Next.js API route for Dish
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

    const dishs = await database.dish.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!dishs) {
      return manifestErrorResponse("Not found", 404);
    }

    return manifestSuccessResponse({ dishs });
  } catch (error) {
    log.error("Error fetching dishs:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
