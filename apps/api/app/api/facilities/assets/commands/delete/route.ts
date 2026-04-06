// Soft-delete facility asset
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
import
{
  captureException;
}
from;
("@sentry/nextjs");
manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response"

import { database } from "@/lib/database";

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

    const { assetId } = await request.json();
    if (!assetId) {
      return manifestErrorResponse("assetId is required", 400);
    }

    await database.$queryRaw`
      UPDATE tenant_facilities.facility_assets
      SET deleted_at = NOW(), status = 'disposed'
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${assetId}::uuid
        AND deleted_at IS NULL
    `;

    return manifestSuccessResponse({ success: true });
  } catch (error) {
    captureException(error);
    console.error("Error deleting facility asset:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
