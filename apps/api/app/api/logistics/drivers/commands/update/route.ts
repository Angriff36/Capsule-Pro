// Update driver (status, vehicle assignment)
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

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (licenseNumber !== undefined) data.licenseNumber = licenseNumber;
    if (licenseExpiry !== undefined)
      data.licenseExpiry = licenseExpiry ? new Date(licenseExpiry) : null;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;

    // Handle vehicle assignment explicitly
    if (vehicleId !== undefined) {
      data.vehicleId =
        vehicleId === null || vehicleId === "" ? null : vehicleId;
    }

    const driver = await database.driver.update({
      where: { tenantId_id: { tenantId, id: driverId } },
      data,
    });

    return manifestSuccessResponse({
      driver: {
        id: driver.id,
        name: driver.name,
        status: driver.status,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
