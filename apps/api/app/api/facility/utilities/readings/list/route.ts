// Auto-generated Next.js API route for UtilityReading
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
    const meterId = searchParams.get("meterId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const limit = searchParams.get("limit");

    const where: any = {
      tenantId,
      deletedAt: null,
      ...(meterId && { meterId }),
    };

    if (dateFrom || dateTo) {
      where.readingDate = {};
      if (dateFrom) {
        where.readingDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.readingDate.lte = new Date(dateTo);
      }
    }

    const readings = await database.utilityReading.findMany({
      where,
      orderBy: {
        readingDate: "desc",
      },
      take: limit ? Number.parseInt(limit, 10) : 100,
    });

    return manifestSuccessResponse({ readings });
  } catch (error) {
    console.error("Error fetching utility readings:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
