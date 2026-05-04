// Update driver (status, vehicle assignment)
import { auth } from "@repo/auth/server";
import { Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";
import { log } from "@repo/observability/log";

function buildVehicleAssignment(vehicleId: unknown) {
  // Omitted from request: leave column unchanged.
  if (vehicleId === undefined) {
    return Prisma.sql`vehicle_id`;
  }
  // Explicit null/empty: clear assignment.
  if (vehicleId === null || vehicleId === "") {
    return Prisma.sql`NULL::uuid`;
  }
  // Explicit value: parameterized cast.
  return Prisma.sql`${vehicleId}::uuid`;
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) return manifestErrorResponse("Unauthorized", 401);

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) return manifestErrorResponse("Tenant not found", 400);

    const {
      driverId,
      name,
      phone,
      email,
      licenseNumber,
      licenseExpiry,
      vehicleId,
      status,
      notes,
    } = await request.json();
    if (!driverId) return manifestErrorResponse("driverId is required", 400);

    const vehicleAssignment = buildVehicleAssignment(vehicleId);

    const result = await database.$queryRaw`
      UPDATE tenant_logistics.drivers
      SET
        name = COALESCE(${name ?? null}, name),
        phone = COALESCE(${phone ?? null}, phone),
        email = COALESCE(${email ?? null}, email),
        license_number = COALESCE(${licenseNumber ?? null}, license_number),
        license_expiry = COALESCE(${licenseExpiry ? new Date(licenseExpiry) : null}::date, license_expiry),
        vehicle_id = ${vehicleAssignment},
        status = COALESCE(${status ?? null}, status),
        notes = COALESCE(${notes ?? null}, notes),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${driverId}::uuid AND deleted_at IS NULL
      RETURNING id, name, status
    `;

    if (!(result as any[]).length)
      return manifestErrorResponse("Driver not found", 404);

    return manifestSuccessResponse({ driver: (result as any[])[0] });
  } catch (error) {
    captureException(error);
    log.error("Error updating driver:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
