// Version Control API - Restore Previous Version
// Restores an entity to a previous version by creating a new version from the snapshot

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
    const { versionId, changeReason = "Restored from previous version" } = body;

    if (!versionId) {
      return manifestErrorResponse("Missing version ID to restore", 400);
    }

    // Get the version to restore
    const versionToRestore = await database.entityVersion.findUnique({
      where: { tenantId_id: { tenantId, id: versionId } },
      include: {
        versionedEntity: true,
      },
    });

    if (!versionToRestore) {
      return manifestErrorResponse("Version not found", 404);
    }

    if (versionToRestore.versionedEntity.isLocked) {
      return manifestErrorResponse("Cannot restore - entity is locked", 400);
    }

    // Get next version number
    const latestVersion = await database.entityVersion.findFirst({
      where: {
        tenantId,
        versionedEntityId: versionToRestore.versionedEntityId,
        deletedAt: null,
      },
      orderBy: { versionNumber: "desc" },
    });

    const nextVersionNumber = latestVersion
      ? latestVersion.versionNumber + 1
      : 1;

    // Create new version with the snapshot data from the version being restored
    const restoredVersion = await database.entityVersion.create({
      data: {
        tenantId,
        versionedEntityId: versionToRestore.versionedEntityId,
        versionNumber: nextVersionNumber,
        changeType: "restore",
        snapshotData: versionToRestore.snapshotData,
        changeReason: `${changeReason} (restored from version ${versionToRestore.versionNumber})`,
        changeSummary: `Restored from version ${versionToRestore.versionNumber}`,
        createdBy: userId,
        metadata: {
          restoredFromVersion: versionToRestore.versionNumber,
          restoredFromVersionId: versionToRestore.id,
        },
      },
    });

    // Update current version on parent entity
    await database.versionedEntity.update({
      where: {
        tenantId_id: { tenantId, id: versionToRestore.versionedEntityId },
      },
      data: { currentVersionId: restoredVersion.id },
    });

    return manifestSuccessResponse({
      version: restoredVersion,
      message: `Restored from version ${versionToRestore.versionNumber} to version ${nextVersionNumber}`,
    });
  } catch (error) {
    console.error("Error restoring version:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
