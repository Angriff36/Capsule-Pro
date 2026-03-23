// API route for creating a facility area
import { auth } from "@repo/auth/server";
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

    const body = await request.json();
    const { venueId, name, code, areaType, floor, description, squareFeet } = body;

    if (!name) {
      return manifestErrorResponse("name is required", 400);
    }

    const validTypes = ["kitchen", "storage", "dining", "prep", "office", "loading_dock", "restroom", "other"];
    const type = validTypes.includes(areaType) ? areaType : "other";

    // Check for duplicate code if provided
    if (code) {
      const existing = await database.$queryRaw`
        SELECT id FROM tenant_facilities.facility_areas
        WHERE tenant_id = ${tenantId}::uuid AND code = ${code} AND deleted_at IS NULL
        LIMIT 1
      `;
      if (existing && (existing as any[]).length > 0) {
        return manifestErrorResponse("Area code already exists", 400);
      }
    }

    const result = await database.$queryRaw`
      INSERT INTO tenant_facilities.facility_areas (
        tenant_id, venue_id, name, code, area_type, floor, description, square_feet
      ) VALUES (
        ${tenantId}::uuid,
        ${venueId || null}::uuid,
        ${name},
        ${code || null},
        ${type},
        ${floor || null},
        ${description || null},
        ${squareFeet || null}
      )
      RETURNING id, venue_id, name, code, area_type, floor, description, square_feet, status, created_at
    `;

    return manifestSuccessResponse({ area: (result as any[])[0] });
  } catch (error) {
    console.error("Error creating facility area:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
