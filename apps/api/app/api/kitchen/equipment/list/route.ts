import { auth } from "@repo/auth/server";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import { manifestErrorResponse } from "@/lib/manifest-response";

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
    const type = searchParams.get("type");
    const locationId = searchParams.get("locationId");

    const where = {
      tenantId,
      deletedAt: null,
      ...(status && { status }),
      ...(type && { type }),
      ...(locationId && { locationId }),
    };

    const [equipment, total] = await Promise.all([
      database.equipment.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          workOrders: {
            where: { status: { in: ["open", "in_progress"] } },
            select: {
              id: true,
              title: true,
              type: true,
              priority: true,
              status: true,
            },
            take: 5,
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { workOrders: true } },
        },
      }),
      database.equipment.count({ where }),
    ]);

    return new Response(JSON.stringify({ equipment, total }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    captureException(error);
    log.error("Error fetching equipment:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
