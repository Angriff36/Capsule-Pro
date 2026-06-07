// List facility assets. Pagination policy is centralized in `@/lib/pagination`
// so a hostile or buggy client cannot request the entire facility-assets
// table for a tenant in one round trip. This route is the canonical read
// path verified by the New Asset E2E backpressure test.

import { auth } from "@repo/auth/server";
import type { Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { clampLimit, clampOffset } from "@/lib/pagination";

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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "active";
    const assetType = searchParams.get("assetType");
    const areaId = searchParams.get("areaId");
    const limit = clampLimit(searchParams.get("limit"));
    const offset = clampOffset(searchParams.get("offset"));

    const assetWhere: Prisma.FacilityAssetWhereInput = {
      tenantId,
      deletedAt: null,
      ...(status !== "all" ? { status } : {}),
      ...(assetType ? { assetType } : {}),
      ...(areaId ? { areaId } : {}),
    };
    const assetRecords = await database.facilityAsset.findMany({
      where: assetWhere,
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
    });
    const areas = await database.facilityArea.findMany({
      where: {
        tenantId,
        id: {
          in: assetRecords
            .map((asset) => asset.areaId)
            .filter((id): id is string => Boolean(id)),
        },
        deletedAt: null,
      },
      select: { id: true, name: true, code: true },
    });
    const areasById = new Map(areas.map((area) => [area.id, area]));
    const assets = assetRecords.map((asset) => {
      const area = asset.areaId ? areasById.get(asset.areaId) : undefined;
      return {
        id: asset.id,
        name: asset.name,
        asset_type: asset.assetType,
        serial_number: asset.serialNumber,
        manufacturer: asset.manufacturer,
        model: asset.model,
        purchase_date: asset.purchaseDate,
        purchase_cost: asset.purchaseCost,
        warranty_expiry: asset.warrantyExpiry,
        status: asset.status,
        area_id: asset.areaId,
        notes: asset.notes,
        created_at: asset.createdAt,
        updated_at: asset.updatedAt,
        area_name: area?.name ?? null,
        area_code: area?.code ?? null,
      };
    });

    return manifestSuccessResponse({ assets, limit, offset });
  } catch (error) {
    captureException(error);
    log.error("Error listing facility assets:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
