// Update facility area
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
      areaId,
      name,
      code,
      areaType,
      floor,
      description,
      squareFeet,
      status,
    } = await request.json();

    if (!areaId) {
      return manifestErrorResponse("areaId is required", 400);
    }

    const result = await database.$queryRaw`
      UPDATE tenant_facilities.facility_areas
      SET
        name = COALESCE(${name ?? null}, name),
        code = COALESCE(${code ?? null}, code),
        area_type = COALESCE(${areaType ?? null}, area_type),
        floor = COALESCE(${floor ?? null}, floor),
        description = COALESCE(${description ?? null}, description),
        square_feet = COALESCE(${squareFeet ?? null}, square_feet),
        status = COALESCE(${status ?? null}, status),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${areaId}::uuid
        AND deleted_at IS NULL
      RETURNING id, name, code, area_type, floor, description, square_feet, status
    `;

    if (!(result as unknown[]).length) {
      return manifestErrorResponse("Area not found", 404);
    }

    return manifestSuccessResponse({ area: (result as unknown[])[0] });
  } catch (error) {
    captureException(error);
    console.error("Error updating facility area:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
