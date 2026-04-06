// Create driver
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
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const body = await request.json();
    const {
      name,
      phone,
      email,
      licenseNumber,
      licenseExpiry,
      vehicleId,
      notes,
    } = body;

    if (!name) return manifestErrorResponse("name is required", 400);

    const result = await database.$queryRaw`
      INSERT INTO tenant_logistics.drivers (
        tenant_id, name, phone, email, license_number, license_expiry,
        vehicle_id, status, notes
      ) VALUES (
        ${tenantId}::uuid, ${name}, ${phone || null}, ${email || null},
        ${licenseNumber || null}, ${licenseExpiry ? new Date(licenseExpiry) : null}::date,
        ${vehicleId || null}::uuid, 'available', ${notes || null}
      )
      RETURNING id, name, status, created_at
    `;

    return manifestSuccessResponse({ driver: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    console.error("Error creating driver:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
