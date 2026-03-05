// Version Control API - List Versions for an Entity
// Returns all versions of a specific entity with comparison support

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
    const versionedEntityId = searchParams.get("versionedEntityId");
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (versionedEntityId) {
      where.versionedEntityId = versionedEntityId;
    } else if (entityType && entityId) {
      // Find the versioned entity first
      const versionedEntity = await database.versionedEntity.findUnique({
        where: {
          tenantId_entityType_entityId: {
            tenantId,
            entityType,
            entityId,
          },
        },
      });

      if (versionedEntity) {
        where.versionedEntityId = versionedEntity.id;
      } else {
        return manifestSuccessResponse({ versions: [] });
      }
    } else {
      return manifestErrorResponse(
        "Must provide either versionedEntityId or entityType+entityId",
        400
      );
    }

    const versions = await database.entityVersion.findMany({
      where,
      include: {
        versionedEntity: {
          select: {
            entityType: true,
            entityId: true,
            entityName: true,
          },
        },
      },
      orderBy: { versionNumber: "desc" },
    });

    return manifestSuccessResponse({ versions });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
