// Version Control API - Create New Version
// Creates a new version of an entity with snapshot data

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
    const {
      versionedEntityId,
      entityType,
      entityId,
      snapshotData,
      changeReason = "",
      changeSummary = "",
      changeType = "update",
    } = body;

    if (!snapshotData) {
      return manifestErrorResponse("Missing snapshot data", 400);
    }

    let targetVersionedEntityId = versionedEntityId;

    // If not provided, look up by entity type + id
    if (!targetVersionedEntityId && entityType && entityId) {
      const versionedEntity = await database.versionedEntity.findUnique({
        where: {
          tenantId_entityType_entityId: {
            tenantId,
            entityType,
            entityId,
          },
        },
      });

      if (!versionedEntity) {
        return manifestErrorResponse(
          "Entity not registered for versioning",
          404
        );
      }

      targetVersionedEntityId = versionedEntity.id;
    }

    if (!targetVersionedEntityId) {
      return manifestErrorResponse(
        "Must provide versionedEntityId or entityType+entityId",
        400
      );
    }

    // Check if entity is locked
    const versionedEntity = await database.versionedEntity.findUnique({
      where: { tenantId_id: { tenantId, id: targetVersionedEntityId } },
    });

    if (!versionedEntity) {
      return manifestErrorResponse("Versioned entity not found", 404);
    }

    if (versionedEntity.isLocked) {
      return manifestErrorResponse(
        "Cannot create version - entity is locked",
        400
      );
    }

    // Get next version number
    const latestVersion = await database.entityVersion.findFirst({
      where: {
        tenantId,
        versionedEntityId: targetVersionedEntityId,
        deletedAt: null,
      },
      orderBy: { versionNumber: "desc" },
    });

    const nextVersionNumber = latestVersion
      ? latestVersion.versionNumber + 1
      : 1;

    // Create new version
    const newVersion = await database.entityVersion.create({
      data: {
        tenantId,
        versionedEntityId: targetVersionedEntityId,
        versionNumber: nextVersionNumber,
        changeType,
        snapshotData,
        changeReason,
        changeSummary,
        createdBy: userId,
      },
    });

    // Update current version on parent entity
    await database.versionedEntity.update({
      where: { tenantId_id: { tenantId, id: targetVersionedEntityId } },
      data: { currentVersionId: newVersion.id },
    });

    return manifestSuccessResponse({
      version: newVersion,
      message: `Version ${nextVersionNumber} created successfully`,
    });
  } catch (error) {
    console.error("Error creating version:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
