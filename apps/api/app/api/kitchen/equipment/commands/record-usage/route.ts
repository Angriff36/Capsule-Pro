import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { database } from "@/lib/database";
import { log } from "@repo/observability/log";

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
    const { id, hours, notes } = body;

    if (!id || hours === undefined || hours === null) {
      return manifestErrorResponse("id and hours are required", 400);
    }

    const usageHours = Number.parseFloat(String(hours));
    if (Number.isNaN(usageHours) || usageHours < 0) {
      return manifestErrorResponse("hours must be a non-negative number", 400);
    }

    const existing = await database.equipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return manifestErrorResponse("Equipment not found", 404);
    }

    const newUsageHours = existing.usageHours + usageHours;
    const data: Record<string, unknown> = {
      usageHours: newUsageHours,
      ...(notes !== undefined && { notes }),
    };

    // Auto-update condition based on usage thresholds
    const usageRatio = newUsageHours / existing.maxUsageHours;
    if (usageRatio >= 1.0) {
      data.condition = "needs_replacement";
    } else if (usageRatio >= 0.8) {
      data.condition = "fair";
    }

    const equipment = await database.equipment.update({
      where: { tenantId_id: { tenantId, id } },
      data,
    });

    return new Response(
      JSON.stringify({ equipment, addedHours: usageHours, totalHours: newUsageHours }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    captureException(error);
    log.error("Error recording equipment usage:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
