// Create facility asset
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_TYPES = [
  "hvac",
  "refrigeration",
  "cooking",
  "dishwashing",
  "plumbing",
  "electrical",
  "furniture",
  "technology",
  "safety",
  "vehicle",
  "tool",
  "other",
];

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

    const body = await request.json();
    const {
      name,
      assetType,
      serialNumber,
      manufacturer,
      model,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      areaId,
      notes,
    } = body;

    if (!name) {
      return manifestErrorResponse("name is required", 400);
    }

    const type = VALID_TYPES.includes(assetType) ? assetType : "other";

    const asset = await database.facilityAsset.create({
      data: {
        tenantId,
        name,
        assetType: type,
        serialNumber: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost ?? null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        areaId: areaId || null,
        notes: notes || null,
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
      created_at: asset.createdAt,
    };

    return manifestSuccessResponse({ asset: result });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
