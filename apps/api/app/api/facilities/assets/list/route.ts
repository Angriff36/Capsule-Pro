// List facility assets
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

function mapAssetToSnake(
  a: {
    id: string;
    name: string;
    assetType: string;
    serialNumber: string | null;
    manufacturer: string | null;
    model: string | null;
    purchaseDate: Date | null;
    purchaseCost: { toNumber: () => number } | null;
    warrantyExpiry: Date | null;
    status: string;
    areaId: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  area?: { name: string; code: string | null } | null
) {
  return {
    id: a.id,
    name: a.name,
    asset_type: a.assetType,
    serial_number: a.serialNumber,
    manufacturer: a.manufacturer,
    model: a.model,
    purchase_date: a.purchaseDate?.toISOString() ?? null,
    purchase_cost: a.purchaseCost?.toNumber?.() ?? null,
    warranty_expiry: a.warrantyExpiry?.toISOString() ?? null,
    status: a.status,
    area_id: a.areaId,
    area_name: area?.name ?? null,
    area_code: area?.code ?? null,
    notes: a.notes,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  };
}

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

    const assets = await database.facilityAsset.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status !== "all" && { status }),
        ...(assetType && { assetType }),
        ...(areaId && { areaId }),
      },
      include: {
        area: { select: { name: true, code: true } },
      },
      orderBy: { name: "asc" },
    });

    return manifestSuccessResponse({
      assets: assets.map((a) => mapAssetToSnake(a, a.area)),
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
