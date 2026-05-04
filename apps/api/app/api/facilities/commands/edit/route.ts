// Update top-level facility
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { log } from "@repo/observability/log";

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
      facilityId,
      name,
      code,
      facilityType,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      status,
      notes,
    } = await request.json();

    if (!facilityId) {
      return manifestErrorResponse("facilityId is required", 400);
    }

    const result = await database.$queryRaw`
      UPDATE tenant_facilities.facilities
      SET
        name = COALESCE(${name ?? null}, name),
        code = COALESCE(${code ?? null}, code),
        facility_type = COALESCE(${facilityType ?? null}, facility_type),
        address_line1 = COALESCE(${addressLine1 ?? null}, address_line1),
        address_line2 = COALESCE(${addressLine2 ?? null}, address_line2),
        city = COALESCE(${city ?? null}, city),
        state = COALESCE(${state ?? null}, state),
        postal_code = COALESCE(${postalCode ?? null}, postal_code),
        country = COALESCE(${country ?? null}, country),
        phone = COALESCE(${phone ?? null}, phone),
        status = COALESCE(${status ?? null}, status),
        notes = COALESCE(${notes ?? null}, notes),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
        AND id = ${facilityId}::uuid
        AND deleted_at IS NULL
      RETURNING id, name, code, facility_type, address_line1, address_line2,
        city, state, postal_code, country, phone, status, notes
    `;

    if (!(result as unknown[]).length) {
      return manifestErrorResponse("Facility not found", 404);
    }

    return manifestSuccessResponse({ facility: (result as unknown[])[0] });
  } catch (error) {
    captureException(error);
    log.error("Error updating facility:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
