// Auto-generated Next.js API route for Workflow
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(_request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const workflows = await database.workflow.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return manifestSuccessResponse({ workflows });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
