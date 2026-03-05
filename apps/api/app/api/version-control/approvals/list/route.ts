// Version Control API - List Approval Requests
// Returns pending and completed approval requests

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
    const status = searchParams.get("status"); // pending, approved, rejected
    const approverId = searchParams.get("approverId");

    const where: any = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }
    if (approverId) {
      where.approverId = approverId;
    }

    const approvals = await database.versionApproval.findMany({
      where,
      include: {
        // Note: We'd need to add the relation to EntityVersion in schema for this
        // For now, we'll fetch the entityVersion separately
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch related entity versions
    const versionIds = approvals.map((a) => a.entityVersionId);
    const versions = await database.entityVersion.findMany({
      where: {
        tenantId,
        id: { in: versionIds },
      },
      include: {
        versionedEntity: {
          select: {
            entityType: true,
            entityId: true,
            entityName: true,
          },
        },
      },
    });

    const versionMap = new Map(versions.map((v) => [v.id, v]));

    const enrichedApprovals = approvals.map((approval) => ({
      ...approval,
      entityVersion: versionMap.get(approval.entityVersionId),
    }));

    return manifestSuccessResponse({ approvals: enrichedApprovals });
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
