// Auto-generated Next.js API route for FacilityBooking
// Generated from Manifest IR - DO NOT EDIT

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function GET(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const spaceId = searchParams.get("spaceId");
    const bookedFor = searchParams.get("bookedFor");
    const startDateFrom = searchParams.get("startDateFrom");
    const startDateTo = searchParams.get("startDateTo");

    const where: any = {
      tenantId,
      deletedAt: null,
      ...(status && { status }),
      ...(spaceId && { spaceId }),
      ...(bookedFor && { bookedFor }),
    };

    if (startDateFrom || startDateTo) {
      where.startAt = {};
      if (startDateFrom) {
        where.startAt.gte = new Date(startDateFrom);
      }
      if (startDateTo) {
        where.startAt.lte = new Date(startDateTo);
      }
    }

    const bookings = await database.facilityBooking.findMany({
      where,
      orderBy: {
        startAt: "asc",
      },
    });

    return manifestSuccessResponse({ bookings });
  } catch (error) {
    console.error("Error fetching facility bookings:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
