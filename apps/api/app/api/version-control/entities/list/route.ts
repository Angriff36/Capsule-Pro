// Version Control API - List Versioned Entities
// Returns all versioned entities with filtering options

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
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const isLocked = searchParams.get("isLocked");

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }
    if (isLocked === "true") {
      where.isLocked = true;
    } else if (isLocked === "false") {
      where.isLocked = false;
    }

    const entities = await database.versionedEntity.findMany({
      where,
      include: {
        versions: {
          where: { deletedAt: null },
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
        _count: {
          select: { versions: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return manifestSuccessResponse({ entities });
  } catch (error) {
    console.error("Error fetching versioned entities:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
