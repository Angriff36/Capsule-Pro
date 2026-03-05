// API endpoint for listing board templates
// Supports filtering user's templates and public templates

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
    const includePublic = searchParams.get("includePublic") === "true";

    const templates = await database.commandBoard.findMany({
      where: {
        deletedAt: null,
        isTemplate: true,
        ...(includePublic
          ? {
              OR: [{ tenantId }, { isPublic: true }],
            }
          : { tenantId }),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        tags: true,
        scope: true,
        autoPopulate: true,
        shareId: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return manifestSuccessResponse({ templates });
  } catch (error) {
    console.error("Error fetching board templates:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
