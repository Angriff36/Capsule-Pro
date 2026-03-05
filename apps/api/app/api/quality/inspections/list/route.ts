// Quality Inspections API route
// Lists all quality control inspections for the current tenant

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
    const inspectionType = searchParams.get("inspectionType");
    const locationId = searchParams.get("locationId");
    const limit = Number.parseInt(searchParams.get("limit") || "50");
    const offset = Number.parseInt(searchParams.get("offset") || "0");

    const inspections = await database.qualityInspection.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(inspectionType && { inspectionType }),
        ...(locationId && { locationId }),
      },
      include: {
        checklist: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await database.qualityInspection.count({
      where: {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(inspectionType && { inspectionType }),
        ...(locationId && { locationId }),
      },
    });

    return manifestSuccessResponse({ inspections, total, limit, offset });
  } catch (error) {
    console.error("Error fetching quality inspections:", error);
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
      checklistId,
      inspectionName,
      inspectionType,
      scheduledDate,
      assignedToId,
    } = body;

    if (!(locationId && checklistId && inspectionName)) {
      return manifestErrorResponse(
        "Location, checklist, and name are required",
        400
      );
    }

    // Generate inspection number
    const inspectionCount = await database.qualityInspection.count({
      where: { tenantId },
    });
    const inspectionNumber = `QC-${String(inspectionCount + 1).padStart(6, "0")}`;

    const inspection = await database.qualityInspection.create({
      data: {
        tenantId,
        locationId,
        checklistId,
        inspectionNumber,
        inspectionName,
        inspectionType: inspectionType || "routine",
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        assignedToId,
        status: "draft",
        inspectionData: {},
        totalItems: 0,
        passedItems: 0,
        failedItems: 0,
        skippedItems: 0,
        passRate: 0,
        createdById: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return manifestSuccessResponse({ inspection });
  } catch (error) {
    console.error("Error creating quality inspection:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
