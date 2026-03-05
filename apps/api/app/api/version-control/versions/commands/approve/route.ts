// Version Control API - Approve Version
// Marks a version as approved (requires appropriate permissions)

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
    const { versionId, comments = "" } = body;

    if (!versionId) {
      return manifestErrorResponse("Missing version ID", 400);
    }

    const version = await database.entityVersion.findUnique({
      where: { tenantId_id: { tenantId, id: versionId } },
    });

    if (!version) {
      return manifestErrorResponse("Version not found", 404);
    }

    if (version.isApproved) {
      return manifestErrorResponse("Version is already approved", 400);
    }

    // Update version as approved
    const updated = await database.entityVersion.update({
      where: { tenantId_id: { tenantId, id: versionId } },
      data: {
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    // Update any pending approvals for this version
    await database.versionApproval.updateMany({
      where: {
        tenantId,
        entityVersionId: versionId,
        status: "pending",
      },
      data: {
        status: "approved",
        comments,
        reviewedAt: new Date(),
      },
    });

    return manifestSuccessResponse({
      version: updated,
      message: "Version approved successfully",
    });
  } catch (error) {
    console.error("Error approving version:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
