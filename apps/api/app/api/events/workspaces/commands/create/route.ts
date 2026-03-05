import { auth } from "@repo/auth/server";
import type { NextRequest } from "next/server";
import { createActivity } from "@/app/lib/activity-feed-service";
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
    const { eventId, name, description, isPublic } = body;

    if (!(eventId && name)) {
      return manifestErrorResponse("eventId and name are required", 400);
    }

    // Verify the event exists
    const event = await database.event.findFirst({
      where: {
        tenantId,
        id: eventId,
        deletedAt: null,
      },
    });

    if (!event) {
      return manifestErrorResponse("Event not found", 404);
    }

    // Check if workspace already exists for this event
    const existing = await database.eventWorkspace.findFirst({
      where: {
        tenantId,
        eventId,
        deletedAt: null,
      },
    });

    if (existing) {
      return manifestErrorResponse(
        "Workspace already exists for this event",
        400
      );
    }

    // Generate a unique share token if public
    let shareToken = null;
    if (isPublic) {
      shareToken = `${eventId}-${crypto.randomUUID()}`;
    }

    const workspace = await database.eventWorkspace.create({
      data: {
        tenantId,
        eventId,
        name,
        description,
        isPublic: isPublic ?? false,
        shareToken,
        createdBy: userId,
        // Add creator as owner
        members: {
          create: {
            tenantId,
            userId,
            role: "owner",
            status: "active",
          },
        },
      },
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
      },
    });

    // Record activity
    await createActivity({
      tenantId,
      activityType: "collaborator_action",
      entityType: "EventWorkspace",
      entityId: workspace.id,
      action: "created",
      title: `Workspace "${name}" created`,
      description: `Collaborative workspace created for event "${event.title}"`,
      performedBy: userId,
      sourceType: "direct_action",
      importance: "normal",
    });

    return manifestSuccessResponse({ workspace }, 201);
  } catch (error) {
    console.error("Error creating workspace:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
