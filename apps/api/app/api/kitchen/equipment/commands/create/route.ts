// Auto-generated Next.js API route for Equipment.create command
// Generated from Manifest IR - DO NOT EDIT

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

    const {
      locationId,
      name,
      type = "general",
      serialNumber,
      manufacturer,
      model,
      purchaseDate,
      warrantyExpiry,
      maintenanceIntervalDays = 90,
      maxUsageHours = 1000,
      notes,
    } = body;

    if (!(locationId && name)) {
      return manifestErrorResponse("locationId and name are required", 400);
    }

    const validTypes = [
      "cooking",
      "refrigeration",
      "prep",
      "baking",
      "cleaning",
      "transport",
      "general",
    ];
    if (!validTypes.includes(type)) {
      return manifestErrorResponse(
        `Invalid equipment type. Must be one of: ${validTypes.join(", ")}`,
        400
      );
    }

    const equipment = await database.equipment.create({
      data: {
        tenantId,
        locationId,
        name,
        type,
        serialNumber,
        manufacturer,
        model,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        maintenanceIntervalDays,
        maxUsageHours,
        notes,
        status: "active",
        condition: "good",
        usageHours: 0,
        nextMaintenanceDate: new Date(
          Date.now() + maintenanceIntervalDays * 24 * 60 * 60 * 1000
        ),
        isActive: true,
      },
    });

    return manifestSuccessResponse({ equipment });
  } catch (error) {
    console.error("Error creating equipment:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
