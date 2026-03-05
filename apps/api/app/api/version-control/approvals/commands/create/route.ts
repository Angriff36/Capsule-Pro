// Version Control API - Request Approval
// Creates an approval request for a version

import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { database } from "@/lib/database";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

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
    const { entityVersionId, approverId } = body;

    if (!(entityVersionId && approverId)) {
      return manifestErrorResponse(
        "Missing required fields: entityVersionId, approverId",
        400
      );
    }

    // Check if version exists
    const version = await database.entityVersion.findUnique({
      where: { tenantId_id: { tenantId, id: entityVersionId } },
    });

    if (!version) {
      return manifestErrorResponse("Version not found", 404);
    }

    // Check for existing pending approval
    const existing = await database.versionApproval.findUnique({
      where: {
        tenantId_entityVersionId_approverId: {
          tenantId,
          entityVersionId,
          approverId,
        },
      },
    });

    if (existing && existing.status === "pending") {
      return manifestErrorResponse("Approval request already pending", 400);
    }

    // Create approval request
    const approval = await database.versionApproval.create({
      data: {
        tenantId,
        entityVersionId,
        approverId,
        status: "pending",
      },
    });

    return manifestSuccessResponse({
      approval,
      message: "Approval request created",
    });
  } catch (error) {
    console.error("Error creating approval request:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
