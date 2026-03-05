// Version Control API - Lock Entity
// Locks a versioned entity to prevent edits

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
    const { id, reason } = body;

    if (!id) {
      return manifestErrorResponse("Missing entity ID", 400);
    }

    const entity = await database.versionedEntity.findUnique({
      where: { tenantId_id: { tenantId, id } },
    });

    if (!entity) {
      return manifestErrorResponse("Entity not found", 404);
    }

    if (entity.isLocked) {
      return manifestErrorResponse("Entity is already locked", 400);
    }

    const updated = await database.versionedEntity.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        lockedBy: userId,
      },
    });

    return manifestSuccessResponse({
      entity: updated,
      message: "Entity locked successfully",
    });
  } catch (error) {
    console.error("Error locking entity:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
