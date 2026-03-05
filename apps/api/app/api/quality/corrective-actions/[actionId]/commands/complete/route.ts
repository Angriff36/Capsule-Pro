// Corrective Action Complete Command
// Transitions a corrective action from in_progress to completed

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
  { params }: { params: { actionId: string } }
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

    const actionId = params.actionId;
    const body = await request.json();
    const { resolutionNotes, preventionNotes, actualCost } = body;

    if (!resolutionNotes) {
      return manifestErrorResponse("Resolution notes are required", 400);
    }

    // Get the corrective action
    const action = await database.correctiveAction.findFirst({
      where: {
        tenantId,
        id: actionId,
        deletedAt: null,
      },
    });

    if (!action) {
      return manifestErrorResponse("Corrective action not found", 404);
    }

    if (action.status !== "in_progress") {
      return manifestErrorResponse(
        "Can only complete in-progress corrective actions",
        400
      );
    }

    // Update action to completed
    const updatedAction = await database.correctiveAction.update({
      where: {
        tenantId_id: {
          tenantId,
          id: actionId,
        },
      },
      data: {
        status: "completed",
        resolutionNotes,
        preventionNotes: preventionNotes || "",
        actualCost: actualCost || 0,
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse;
    action: updatedAction;
    )
  } catch (error) {
    console.error("Error completing corrective action:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
