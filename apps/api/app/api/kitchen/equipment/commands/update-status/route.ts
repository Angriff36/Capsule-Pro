import { auth } from "@repo/auth/server";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { database } from "@/lib/database";

const VALID_STATUSES = ["active", "inactive", "maintenance", "retired"];

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
    const { id, status, condition, notes } = body;

    if (!id) {
      return manifestErrorResponse("id is required", 400);
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return manifestErrorResponse(`status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }

    const existing = await database.equipment.findFirst({
      where: { tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return manifestErrorResponse("Equipment not found", 404);
    }

    const equipment = await database.equipment.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        ...(status && { status }),
        ...(condition && { condition }),
        ...(notes !== undefined && { notes }),
      },
    });

    return new Response(
      JSON.stringify({ equipment }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    captureException(error);
    console.error("Error updating equipment status:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
