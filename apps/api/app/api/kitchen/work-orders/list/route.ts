// Auto-generated Next.js API route for WorkOrder
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
    const priority = searchParams.get("priority");
    const equipmentId = searchParams.get("equipmentId");

    const workOrders = await database.workOrder.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(priority && { priority }),
        ...(equipmentId && { equipmentId }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return manifestSuccessResponse({ workOrders });
  } catch (error) {
    console.error("Error fetching work orders:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
