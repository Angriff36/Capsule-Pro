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
    const eventId = searchParams.get("eventId");

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (eventId) {
      where.eventId = eventId;
    }

    const workspaces = await database.eventWorkspace.findMany({
      where,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            documents: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return manifestSuccessResponse({ workspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
