// Auto-generated Next.js API route for AlertsConfig
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

const alertsConfigs = await database.alertsConfig.findMany({
    where: {
        tenantId,
        deletedAt: null
      },
    orderBy: {
      createdAt: "desc",
    },
  });

    return manifestSuccessResponse({ alertsConfigs });
  } catch (error) {
    console.error("Error fetching alertsConfigs:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
