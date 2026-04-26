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

    const driver = await database.driver.create({
      data: {
        tenantId,
        name,
        phone: phone || null,
        email: email || null,
        licenseNumber: licenseNumber || null,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        vehicleId: vehicleId || null,
        status: "available",
        notes: notes || null,
      },
    });

    return manifestSuccessResponse({
      driver: {
        id: driver.id,
        name: driver.name,
        status: driver.status,
        created_at: driver.createdAt,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
