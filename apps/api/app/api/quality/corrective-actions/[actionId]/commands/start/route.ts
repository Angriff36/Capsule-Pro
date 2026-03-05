// Corrective Action Start Command
// Transitions a corrective action from open to in_progress

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

    if (action.status !== "open") {
      return manifestErrorResponse(
        "Can only start open corrective actions",
        400
      );
    }

    // Update action to in_progress
    const updatedAction = await database.correctiveAction.update({
      where: {
        tenantId_id: {
          tenantId,
          id: actionId,
        },
      },
      data: {
        status: "in_progress",
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ action: updatedAction });
  } catch (error) {
    console.error("Error starting corrective action:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
