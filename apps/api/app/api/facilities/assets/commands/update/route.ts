// Update facility asset
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

    const existing = await database.facilityAsset.findFirst({
      where: { tenantId, id: assetId, deletedAt: null },
    });

    if (!existing) {
      return manifestErrorResponse("Asset not found", 404);
    }

    const asset = await database.facilityAsset.update({
      where: { tenantId_id: { tenantId, id: assetId } },
      data: {
        ...(name !== undefined && { name }),
        ...(assetType !== undefined && { assetType }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(manufacturer !== undefined && { manufacturer: manufacturer || null }),
        ...(model !== undefined && { model: model || null }),
        ...(purchaseDate !== undefined && {
          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        }),
        ...(purchaseCost !== undefined && { purchaseCost: purchaseCost ?? null }),
        ...(warrantyExpiry !== undefined && {
          warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        }),
        ...(status !== undefined && { status }),
        ...(areaId !== undefined && { areaId: areaId || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    const result = {
      id: asset.id,
      name: asset.name,
      asset_type: asset.assetType,
      serial_number: asset.serialNumber,
      manufacturer: asset.manufacturer,
      model: asset.model,
      purchase_date: asset.purchaseDate?.toISOString() ?? null,
      purchase_cost: asset.purchaseCost?.toNumber?.() ?? null,
      warranty_expiry: asset.warrantyExpiry?.toISOString() ?? null,
      status: asset.status,
      area_id: asset.areaId,
      notes: asset.notes,
    };

    return manifestSuccessResponse({ asset: result });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
