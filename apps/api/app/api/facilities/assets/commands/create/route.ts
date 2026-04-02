// Create facility asset
import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { database } from "@/lib/database";

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

const VALID_STATUSES = ["active", "maintenance", "retired", "disposed"];

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

    const result = await database.$queryRaw`
      INSERT INTO tenant_facilities.facility_assets (
        tenant_id, name, asset_type, serial_number, manufacturer,
        model, purchase_date, purchase_cost, warranty_expiry,
        area_id, status, notes
      ) VALUES (
        ${tenantId}::uuid,
        ${name},
        ${type},
        ${serialNumber || null},
        ${manufacturer || null},
        ${model || null},
        ${purchaseDate ? new Date(purchaseDate) : null}::date,
        ${purchaseCost || null}::numeric,
        ${warrantyExpiry ? new Date(warrantyExpiry) : null}::date,
        ${areaId || null}::uuid,
        'active',
        ${notes || null}
      )
      RETURNING id, name, asset_type, serial_number, manufacturer, model,
        purchase_date, purchase_cost, warranty_expiry, status, area_id, notes, created_at
    `;

    return manifestSuccessResponse({ asset: (result as any[])[0] });
  } catch (error) {
    console.error("Error creating facility asset:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
