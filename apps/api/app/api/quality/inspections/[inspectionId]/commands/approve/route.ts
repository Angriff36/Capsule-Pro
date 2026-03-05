// Quality Inspection Approve Command
// Transitions an inspection from pending_review/completed to approved

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
    const body = await request.json();
    const { notes } = body;

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

    if (
      inspection.status !== "completed" &&
      inspection.status !== "pending_review"
    ) {
      return manifestErrorResponse(
        "Can only approve completed or pending review inspections",
        400
      );
    }

    // Update inspection to approved
    const updatedInspection = await database.qualityInspection.update({
      where: {
        tenantId_id: {
          tenantId,
          id: inspectionId,
        },
      },
      data: {
        status: "approved",
        approvedById: userId,
        approvedAt: new Date(),
        notes: notes || inspection.notes,
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ inspection: updatedInspection });
  } catch (error) {
    console.error("Error approving inspection:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
