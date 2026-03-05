// Corrective Actions API route
// Lists all corrective actions for the current tenant

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
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const priority = searchParams.get("priority");
    const assignedToId = searchParams.get("assignedToId");
    const locationId = searchParams.get("locationId");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = Number.parseInt(searchParams.get("offset") || "0");

    const actions = await database.correctiveAction.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(severity && { severity }),
        ...(priority && { priority }),
        ...(assignedToId && { assignedToId }),
        ...(locationId && { locationId }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await database.correctiveAction.count({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(severity && { severity }),
        ...(priority && { priority }),
        ...(assignedToId && { assignedToId }),
        ...(locationId && { locationId }),
      },
    });

    return manifestSuccessResponse({ actions, total, limit, offset });
  } catch (error) {
    console.error("Error fetching corrective actions:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

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
      locationId,
      title,
      description,
      severity,
      category,
      sourceEntity,
      sourceEntityId,
      sourceInspectionItemId,
      assignedToId,
      priority,
      dueDate,
      costEstimate,
    } = body;

    if (!(locationId && title)) {
      return manifestErrorResponse("Location and title are required", 400);
    }

    // Generate action number
    const actionCount = await database.correctiveAction.count({
      where: { tenantId },
    });
    const actionNumber = `CA-${String(actionCount + 1).padStart(6, "0")}`;

    const action = await database.correctiveAction.create({
      data: {
        tenantId,
        locationId,
        actionNumber,
        title,
        description,
        severity: severity || "medium",
        category: category || "other",
        sourceEntity,
        sourceEntityId,
        sourceInspectionItemId,
        assignedToId,
        status: "open",
        priority: priority || "normal",
        dueDate: dueDate ? new Date(dueDate) : null,
        costEstimate: costEstimate || 0,
        actualCost: 0,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ action });
  } catch (error) {
    console.error("Error creating corrective action:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
