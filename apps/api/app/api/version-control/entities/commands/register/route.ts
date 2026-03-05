// Version Control API - Register Entity for Versioning
// Registers a new entity to track versions

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
    const { entityType, entityId, entityName, initialSnapshot } = body;

    if (!(entityType && entityId && entityName)) {
      return manifestErrorResponse(
        "Missing required fields: entityType, entityId, entityName",
        400
      );
    }

    // Check if already registered
    const existing = await database.versionedEntity.findUnique({
      where: {
        tenantId_entityType_entityId: {
          tenantId,
          entityType,
          entityId,
        },
      },
    });

    if (existing) {
      return manifestErrorResponse(
        "Entity is already registered for versioning",
        400
      );
    }

    // Create versioned entity
    const versionedEntity = await database.versionedEntity.create({
      data: {
        tenantId,
        entityType,
        entityId,
        entityName,
      },
    });

    // Create initial version if snapshot provided
    if (initialSnapshot) {
      const initialVersion = await database.entityVersion.create({
        data: {
          tenantId,
          versionedEntityId: versionedEntity.id,
          versionNumber: 1,
          changeType: "create",
          snapshotData: initialSnapshot,
          changeReason: "Initial version",
          createdBy: userId,
        },
      });

      await database.versionedEntity.update({
        where: { tenantId_id: { tenantId, id: versionedEntity.id } },
        data: { currentVersionId: initialVersion.id },
      });
    }

    return manifestSuccessResponse({
      versionedEntity,
      message: "Entity registered for versioning",
    });
  } catch (error) {
    console.error("Error registering versioned entity:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
