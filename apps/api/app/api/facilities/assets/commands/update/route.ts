// Update facility asset
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { captureException } from "@sentry/nextjs";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

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

    const {
      assetId,
      name,
      assetType,
      serialNumber,
      manufacturer,
      model,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      status,
      areaId,
      notes,
    } = await request.json();

    if (!assetId) {
      return manifestErrorResponse("assetId is required", 400);
    }

    const result = await database.$queryRaw`
      UPDATE tenant_facilities.facility_assets
      SET
        name = COALESCE(${name || null}, name),
        asset_type = COALESCE(${assetType || null}, asset_type),
        serial_number = COALESCE(${serialNumber || null}, serial_number),
        manufacturer = COALESCE(${manufacturer || null}, manufacturer),
        model = COALESCE(${model || null}, model),
        purchase_date = COALESCE(${purchaseDate ? new Date(purchaseDate) : null}::date, purchase_date),
        purchase_cost = COALESCE(${purchaseCost || null}::numeric, purchase_cost),
        warranty_expiry = COALESCE(${warrantyExpiry ? new Date(warrantyExpiry) : null}::date, warranty_expiry),
        status = COALESCE(${status || null}, status),
        area_id = COALESCE(${areaId || null}::uuid, area_id),
        notes = COALESCE(${notes || null}, notes),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${assetId}::uuid
        AND deleted_at IS NULL
      RETURNING id, name, asset_type, serial_number, manufacturer, model,
        purchase_date, purchase_cost, warranty_expiry, status, area_id, notes
    `;

    if (!(result as any[]).length) {
      return manifestErrorResponse("Asset not found", 404);
    }

    return manifestSuccessResponse({ asset: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    console.error("Error updating facility asset:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
