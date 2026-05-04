import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { database } from "@/lib/database";

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
      type,
      locationId,
      serialNumber,
      manufacturer,
      model,
      purchaseDate,
      warrantyExpiry,
      maintenanceIntervalDays,
      maxUsageHours,
      notes,
      iotDeviceId,
      iotDeviceType,
    } = body;

    if (!name || !locationId) {
      return manifestErrorResponse("name and locationId are required", 400);
    }

    // Validate locationId is a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(locationId)) {
      return manifestErrorResponse("locationId must be a valid UUID", 400);
    }

    const equipment = await database.equipment.create({
      data: {
        tenantId,
        name,
        type: type || "general",
        locationId,
        serialNumber,
        manufacturer,
        model,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        warrantyExpiry: warrantyExpiry
          ? new Date(warrantyExpiry)
          : undefined,
        maintenanceIntervalDays: maintenanceIntervalDays ?? 90,
        maxUsageHours: maxUsageHours ?? 1000,
        notes,
        iotDeviceId,
        iotDeviceType,
      },
    });

    return new Response(
      JSON.stringify({ equipment }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    captureException(error);
    console.error("Error creating equipment:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
