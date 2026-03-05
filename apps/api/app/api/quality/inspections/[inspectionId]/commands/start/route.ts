// Quality Inspection Start Command
// Transitions an inspection from draft to in_progress

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

export async function POST(
  request: NextRequest,
  { params }: { params: { inspectionId: string } }
) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);

    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const inspectionId = params.inspectionId;

    // Get the inspection
    const inspection = await database.qualityInspection.findFirst({
      where: {
        tenantId,
        id: inspectionId,
        deletedAt: null,
      },
    });

    if (!inspection) {
      return manifestErrorResponse("Inspection not found", 404);
    }

    if (inspection.status !== "draft") {
      return manifestErrorResponse("Can only start draft inspections", 400);
    }

    // Update inspection to in_progress
    const updatedInspection = await database.qualityInspection.update({
      where: {
        tenantId_id: {
          tenantId,
          id: inspectionId,
        },
      },
      data: {
        status: "in_progress",
        startedAt: new Date(),
        inspectedById: userId,
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ inspection: updatedInspection });
  } catch (error) {
    console.error("Error starting inspection:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
