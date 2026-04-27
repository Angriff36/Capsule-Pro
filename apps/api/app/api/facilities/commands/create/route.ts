// Create top-level facility (a building/site such as a commissary kitchen,
// warehouse, or office). This route closes P0.2 of IMPLEMENTATION_PLAN.md by
// giving the New Facility dialog at /facilities a real INSERT target. Pattern
// mirrors apps/api/app/api/facilities/assets/commands/create/route.ts: raw
// INSERT … RETURNING, manifestSuccessResponse(), tenant_id parameterized via
// Prisma.sql template tag.
import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

const VALID_TYPES = ["kitchen", "warehouse", "commissary", "office", "other"];

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
      code,
      facilityType,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      notes,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return manifestErrorResponse("name is required", 400);
    }

    // VALID_TYPES is allow-list — anything else falls back to 'other' rather
    // than rejecting, matching the facility_assets create route convention.
    const type = VALID_TYPES.includes(facilityType) ? facilityType : "other";

    const result = await database.$queryRaw`
      INSERT INTO tenant_facilities.facilities (
        tenant_id, name, code, facility_type,
        address_line1, address_line2, city, state, postal_code, country,
        phone, status, notes
      ) VALUES (
        ${tenantId}::uuid,
        ${name},
        ${code || null},
        ${type},
        ${addressLine1 || null},
        ${addressLine2 || null},
        ${city || null},
        ${state || null},
        ${postalCode || null},
        ${country || null},
        ${phone || null},
        'active',
        ${notes || null}
      )
      RETURNING id, name, code, facility_type, address_line1, address_line2,
        city, state, postal_code, country, phone, status, notes, created_at
    `;

    return manifestSuccessResponse({
      facility: (result as unknown[])[0],
    });
  } catch (error) {
    captureException(error);
    console.error("Error creating facility:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
