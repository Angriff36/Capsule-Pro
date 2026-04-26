// Soft-delete facility asset
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

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

    const existing = await database.facilityAsset.findFirst({
      where: { tenantId, id: assetId, deletedAt: null },
    });

    if (!existing) {
      return manifestErrorResponse("Asset not found", 404);
    }

    await database.facilityAsset.update({
      where: { tenantId_id: { tenantId, id: assetId } },
      data: { deletedAt: new Date(), status: "disposed" },
    });

    return manifestSuccessResponse({ success: true });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
